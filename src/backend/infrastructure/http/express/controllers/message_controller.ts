import { NextFunction, Request, Response } from "express";
import { ValidationError } from "@vinejs/vine";

import { PrismaMessageRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_message_repository";
import { getSocketServer } from "@/backend/infrastructure/ws/socket";
import { createMessageValidator } from "@/backend/infrastructure/validators/vine/message_validator";

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

      const repo = new PrismaMessageRepository();

      // Create and return DTO for realtime broadcast + REST response
      const dto = await repo.createAndReturn({
        channel_id,
        user_id: Number(user_id),
        content: String(content).trim(),
      } as any);

      getSocketServer()?.to(`channel:${channel_id}`).emit("message:new", dto);

      return res.status(201).json({ message: dto });
    } catch (err: any) {
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
        return res.status(400).json({ message: "Invalid ids" });
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
        return res.status(400).json({ message: "Invalid ids" });
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