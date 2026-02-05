import { NextFunction, Request, Response } from "express";

import { PrismaMessageRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_message_repository";
import { getSocketServer } from "@/backend/infrastructure/ws/socket";

export class MessageController {
    async all(req: Request, res: Response, next: NextFunction) {
        try {
            // GET /api/channels/:id/messages
            const channelId = Number(req.params.id);
            const messages = await new PrismaMessageRepository().get_by_channel(channelId);
            return res.json({
                messages,
            });
        } catch (err) {
            console.log(err);
            next(err);
        }
    }
    async index(req: Request, res: Response, next: NextFunction) {
        try {
            const messageId = Number(req.params.id);

            const message = await new PrismaMessageRepository().find_by_id(messageId);
            return res.json({
                message,
            });
        } catch (err) {
            console.log(err);
            next(err);
        }
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            // POST /api/channels/:id/messages
            const channelId = Number(req.params.id);
            const { content } = req.body;
            if (!content || typeof content !== "string") {
                return res.status(400).json({ message: "content is required" })
            }
            const userId = req.session.user_id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" })
            }

            const dto = await new PrismaMessageRepository().save({
                channel_id: channelId,
                user_id: userId,
                content,
            } as any)

            // broadcast realtime
            const io = getSocketServer();
            io?.to(`channel:${channelId}`).emit("message:new", dto);

            return res.status(201).json({ ok: true })
        } catch (err) {
            next(err)
        }
    }

    /**
     * DELETE /api/channels/:channelId/messages/:messageId
     *
     * Removes a single message. Permissions (who is allowed to delete)
     * must be checked before calling this route in a real app.
     */
    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            // DELETE /api/channels/:channelId/messages/:messageId
            const channelId = Number(req.params.channelId);
            const messageId = Number(req.params.messageId);

            if (!Number.isFinite(messageId)) {
                return res.status(400).json({ message: "Invalid message id" });
            }

            await new PrismaMessageRepository().delete(messageId);

            // broadcast
            const io = getSocketServer();
            io?.to(`channel:${channelId}`).emit("message:deleted", { messageId });
            
            return res.status(204).send();
        } catch (err) {
            next(err);
        }
    }

    /**
   * PATCH /api/channels/:channelId/messages/:messageId
   *
   * Overwrites the content of a single message.
   * Permissions (who can edit) must be enforced later.
   */

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const channelId = Number(req.params.channelId);
            const messageId = Number(req.params.messageId);
            const { content } = req.body;

            if (!Number.isFinite(messageId)) {
                return res.status(400).json({ message: "Invalid message id" });
            }

            if (!content || typeof content !== "string") {
                return res.status(400).json({ message: "content is required" });
            }

            const updated = await new PrismaMessageRepository().updateAndReturn(messageId, content);

            // broadcast
            const io = getSocketServer();
            if (updated) io?.to(`channel:${channelId}`).emit("message:updated", updated);

            return res.status(204).send();
        } catch (err) {
            next(err);
        }
    }

    // DELETE /api/messages/:id
    async deleteById(req: Request, res: Response, next: NextFunction) {
        try {
            const messageId = Number(req.params.id);
            if (!Number.isFinite(messageId)) {
                return res.status(400).json({ message: "Invalid message id" });
            }

            const deleted = await new PrismaMessageRepository().deleteAndReturn(messageId);
            if (!deleted) return res.status(404).json({ message: "Message not found " });

            // broadcast to correct channel room
            const io = getSocketServer();
            io?.to(`channel:${deleted.channel_id}`).emit("message:deleted", { messageId });

            return res.status(204).send();
        } catch (err) {
            next(err);
        }
    }

    // PATCH /api/messages/:id
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

            const io = getSocketServer();
            io?.to(`channel:${updated.channel_id}`).emit("message:updated", updated);

            return res.status(204).send();
        } catch (err) {
            next(err);
        }
    }
}
