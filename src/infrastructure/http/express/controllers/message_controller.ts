import { NextFunction, Request, Response } from "express";

import { PrismaMessageRepository } from "@/infrastructure/persistence/prisma/repositories/prisma_message_repository";

export class MessageController {
    async all(req: Request, res: Response, next: NextFunction) {
        try {
            const channelId = parseInt(req.params.id[0]);
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
            const messageId = parseInt(req.params.id[0]);

            const message = await new PrismaMessageRepository().find_by_id(messageId);
            return res.json({
                message,
            });
        } catch (err) {
            console.log(err);
            next(err);
        }
    }
}
