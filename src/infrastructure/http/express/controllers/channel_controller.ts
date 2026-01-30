import { NextFunction, Request, Response } from "express";

import { PrismaChannelRepository } from "@/infrastructure/persistence/prisma/repositories/prisma_channel_repository";


export class ChannelController {
    async all(req: Request, res: Response, next: NextFunction) {
        try {
            const serverId = parseInt(req.params.id[0]);
            const channels = await new PrismaChannelRepository().get_by_server_id(serverId);
            return res.json({
                channels,
            });
        } catch (err) {
            console.log(err);
            next(err);
        }
    }

    async index(req: Request, res: Response, next: NextFunction) {
        try {
            const channelId = parseInt(req.params.id[0]);

            const channel = await new PrismaChannelRepository().find_by_id(channelId);
            return res.json({
                channel,
            });
        } catch (err) {
            console.log(err);
            next(err);
        }
    }
}