import { NextFunction, Request, Response } from "express";
import { ValidationError } from "@vinejs/vine";

import { PrismaMessageRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_message_repository";
import { getSocketServer } from "@/backend/infrastructure/ws/socket";
import { createMessageValidator } from "@/backend/infrastructure/validators/vine/message_validator";

import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";

const ROLE_OWNER = 1;
const ROLE_ADMIN = 2;

function requireAuth(req: Request, res: Response): number | null {
  const uid = req.session.user_id;
  if (!uid) {
    res.status(401).json({ code: "E_UNAUTHORIZED_ACCESS" });
    return null;
  }
  return Number(uid);
}

async function getMessageScope(messageId: number) {
  // message + server_id via channel
  return prisma.messages.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      user_id: true,
      channel_id: true,
      channel: { select: { server_id: true } },
    },
  });
}

async function getUserRoleId(userId: number, serverId: number) {
  const membership = await prisma.memberships.findFirst({
    where: { user_id: userId, server_id: serverId },
    select: { role_id: true },
  });
  return membership?.role_id ?? null;
}

export class MessageController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      // GET /api/channels/:id/messages
      const channelId = Number(req.params.id);
      const messages = await new PrismaMessageRepository().get_by_channel(channelId);
      return res.json({ messages });
    } catch (err) {
      next(err);
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const messageId = Number(req.params.id);
      const message = await new PrismaMessageRepository().find_by_id(messageId);
      return res.json({ message });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // POST /api/channels/:id/messages
      // We validate "content" + session user_id, and channel_id from params.
      const channelId = Number(req.params.id);
      const { channel_id, user_id, content } = await createMessageValidator.validate({
        channel_id: channelId,
        user_id: req.session.user_id,
        content: req.body?.content,
      });

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

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireAuth(req, res);
      if (userId === null) return;

      const channelId = Number(req.params.channelId);
      const messageId = Number(req.params.messageId);

      if (!Number.isFinite(channelId) || !Number.isFinite(messageId)) {
        return res.status(400).json({ message: "Invalid ids" });
      }

      const scope = await getMessageScope(messageId);
      if (!scope) return res.status(404).json({ message: "Message not found" });

      const serverId = scope.channel.server_id;
      const roleId = await getUserRoleId(userId, serverId);
      if (!roleId) return res.status(403).json({ message: "Not a member of this server" });

      const isAuthor = scope.user_id === userId;
      const canModerateDelete = roleId === ROLE_OWNER || roleId === ROLE_ADMIN;

      if (!isAuthor && !canModerateDelete) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await new PrismaMessageRepository().delete(messageId);

      getSocketServer()?.to(`channel:${channelId}`).emit("message:deleted", { messageId });
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireAuth(req, res);
      if (userId === null) return;

      const channelId = Number(req.params.channelId);
      const messageId = Number(req.params.messageId);
      const { content } = req.body;

      if (!Number.isFinite(channelId) || !Number.isFinite(messageId)) {
        return res.status(400).json({ message: "Invalid message id" });
      }

      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "content is required" });
      }

      const scope = await getMessageScope(messageId);
      if (!scope) return res.status(404).json({ message: "Message not found" });

      // règle: seul l'auteur peut modifier
      if (scope.user_id !== userId) {
        return res.status(403).json({ message: "Only author can edit message" });
      }

      const updated = await new PrismaMessageRepository().updateAndReturn(
        messageId,
        content.trim(),
      );

      if (updated) {
        getSocketServer()?.to(`channel:${channelId}`).emit("message:updated", updated);
      }

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async deleteById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireAuth(req, res);
      if (userId === null) return;

      const messageId = Number(req.params.id);
      if (!Number.isFinite(messageId)) {
        return res.status(400).json({ message: "Invalid message id" });
      }

      const scope = await getMessageScope(messageId);
      if (!scope) return res.status(404).json({ message: "Message not found" });

      const serverId = scope.channel.server_id;
      const roleId = await getUserRoleId(userId, serverId);
      if (!roleId) return res.status(403).json({ message: "Not a member of this server" });

      const isAuthor = scope.user_id === userId;
      const canModerateDelete = roleId === ROLE_OWNER || roleId === ROLE_ADMIN;

      if (!isAuthor && !canModerateDelete) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const deleted = await new PrismaMessageRepository().deleteAndReturn(messageId);
      if (!deleted) return res.status(404).json({ message: "Message not found" });

      getSocketServer()?.to(`channel:${deleted.channel_id}`).emit("message:deleted", { messageId });
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async updateById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = requireAuth(req, res);
      if (userId === null) return;

      const messageId = Number(req.params.id);
      const { content } = req.body;

      if (!Number.isFinite(messageId)) {
        return res.status(400).json({ message: "Invalid message id" });
      }
      if (!content || typeof content !== "string") {
        return res.status(400).json({ message: "content is required" });
      }

      const scope = await getMessageScope(messageId);
      if (!scope) return res.status(404).json({ message: "Message not found" });

      // règle: seul l'auteur peut modifier
      if (scope.user_id !== userId) {
        return res.status(403).json({ message: "Only author can edit message" });
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

