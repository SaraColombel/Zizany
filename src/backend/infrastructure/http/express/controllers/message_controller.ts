import { NextFunction, Request, Response } from "express";
import { ValidationError } from "@vinejs/vine";

import { PrismaMessageRepository } from "../../../persistence/prisma/repositories/prisma_message_repository.js";
import { prisma } from "../../../persistence/prisma/prisma.client.js";
import { getSocketServer } from "../../../ws/socket.js";
import { createMessageValidator } from "../../../validators/vine/message_validator.js";
import { assertNotBanned } from "../../../http/express/utils/ban_guard.js";

async function resolveServerIdFromChannel(channelId: number): Promise<number | null> {
  if (!Number.isFinite(channelId)) return null;
  const channel = await prisma.channels.findUnique({
    where: { id: channelId },
    select: { server_id: true },
  });
  return channel?.server_id ?? null;
}

async function resolveServerIdFromMessage(messageId: number): Promise<number | null> {
  if (!Number.isFinite(messageId)) return null;
  const message = await prisma.messages.findUnique({
    where: { id: messageId },
    select: { channel_id: true },
  });
  if (!message) return null;
  return resolveServerIdFromChannel(message.channel_id);
}

export class MessageController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      // GET /api/channels/:id/messages
      const channelId = Number(req.params.id);
      const userId = Number(req.session.user_id);
      const serverId = await resolveServerIdFromChannel(channelId);
      if (serverId) {
        await assertNotBanned(userId, serverId);
      }
      const messages = await new PrismaMessageRepository().get_by_channel(channelId);
      return res.json({ messages });
    } catch (err) {
      next(err);
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const messageId = Number(req.params.id);
      const userId = Number(req.session.user_id);
      const serverId = await resolveServerIdFromMessage(messageId);
      if (serverId) {
        await assertNotBanned(userId, serverId);
      }
      const message = await new PrismaMessageRepository().find_by_id(messageId);
      return res.json({ message });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { channel_id, user_id, content } =
        await createMessageValidator.validate({
          channel_id: Number(req.params.id),
          user_id: req.session.user_id,
          content: req.body?.content,
        });
      const serverId = await resolveServerIdFromChannel(channel_id);
      if (serverId) {
        await assertNotBanned(user_id, serverId);
      }

      const message = await new PrismaMessageRepository().createAndReturn({
        channel_id,
        user_id,
        content,
      });

      getSocketServer()?.to(`channel:${channel_id}`).emit("message:new", message);

      return res.status(201).json({ ok: true, message });
    } catch (err: unknown) {
      if (err instanceof ValidationError) {
        return res.status(422).json({ err });
      }
      next(err);
    }
  }

  /**
   * DELETE /api/channels/:channelId/messages/:messageId
   */
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const channelId = Number(req.params.channelId);
      const messageId = Number(req.params.messageId);

      if (!Number.isFinite(channelId) || !Number.isFinite(messageId)) {
        return res.status(400).json({ message: "Invalid message id" });
      }
      const userId = Number(req.session.user_id);
      const serverId = await resolveServerIdFromChannel(channelId);
      if (serverId) {
        await assertNotBanned(userId, serverId);
      }

      await new PrismaMessageRepository().delete(messageId);

      // realtime broadcast
      getSocketServer()?.to(`channel:${channelId}`).emit("message:deleted", { messageId });

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/channels/:channelId/messages/:messageId
   */
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const channelId = Number(req.params.channelId);
      const messageId = Number(req.params.messageId);
      const { content } = req.body;

      if (!Number.isFinite(channelId) || !Number.isFinite(messageId)) {
        return res.status(400).json({ message: "Invalid message id" });
      }
      const userId = Number(req.session.user_id);
      const serverId = await resolveServerIdFromChannel(channelId);
      if (serverId) {
        await assertNotBanned(userId, serverId);
      }

      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "content is required" });
      }

      const updated = await new PrismaMessageRepository().updateAndReturn(messageId, content.trim());

      if (updated) {
        getSocketServer()?.to(`channel:${channelId}`).emit("message:updated", updated);
      }

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/messages/:id  (PDF required)
   */
  async deleteById(req: Request, res: Response, next: NextFunction) {
    try {
      const messageId = Number(req.params.id);
      if (!Number.isFinite(messageId)) {
        return res.status(400).json({ message: "Invalid message id" });
      }
      const userId = Number(req.session.user_id);
      const serverId = await resolveServerIdFromMessage(messageId);
      if (serverId) {
        await assertNotBanned(userId, serverId);
      }

      const deleted = await new PrismaMessageRepository().deleteAndReturn(messageId);
      if (!deleted) return res.status(404).json({ message: "Message not found" });

      getSocketServer()?.to(`channel:${deleted.channel_id}`).emit("message:deleted", { messageId });

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  /**
   * PATCH /api/messages/:id  (optional but used as fallback)
   */
  async updateById(req: Request, res: Response, next: NextFunction) {
    try {
      const messageId = Number(req.params.id);
      const { content } = req.body;

      if (!Number.isFinite(messageId)) {
        return res.status(400).json({ message: "Invalid message id" });
      }
      const userId = Number(req.session.user_id);
      const serverId = await resolveServerIdFromMessage(messageId);
      if (serverId) {
        await assertNotBanned(userId, serverId);
      }
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "content is required" });
      }

      const updated = await new PrismaMessageRepository().updateAndReturn(messageId, content.trim());
      if (!updated) return res.status(404).json({ message: "Message not found" });

      getSocketServer()?.to(`channel:${updated.channel_id}`).emit("message:updated", updated);

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}