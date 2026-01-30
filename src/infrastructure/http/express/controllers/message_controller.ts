import { NextFunction, Request, Response } from "express";

import { PrismaMessageRepository } from "@/infrastructure/persistence/prisma/repositories/prisma_message_repository";

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
            const { content, authorId } = req.body;
            if (!content || typeof content !== "string") {
                return res.status(400).json({ message: "content is required" })
            }
            const userId = 1

            await new PrismaMessageRepository().save({
                channel_id: channelId,
                user_id: userId,
                content,
            } as any)
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
            const messageId = Number(req.params.messageId);

            if (!Number.isFinite(messageId)) {
                return res.status(400).json({ message: "Invalid message id" });
            }

            await new PrismaMessageRepository().delete(messageId);
            console.log(`[MessageController] Deleted message with id=${messageId}`);
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
            const messageId = Number(req.params.messageId);
            const { content } = req.body;

            if (!Number.isFinite(messageId)) {
                return res.status(400).json({ message: "Invalid message id" });
            }

            if (!content || typeof content !== "string") {
                return res.status(400).json({ message: "content is required" });
            }

            await new PrismaMessageRepository().update(messageId, content);

            console.log(`[MessageController] Updated message with id=${messageId}`);
            return res.status(204).send();
        } catch (err) {
            next(err);
        }
    }
}
