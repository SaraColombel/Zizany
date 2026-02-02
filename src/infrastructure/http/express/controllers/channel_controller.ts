import { NextFunction, Request, Response } from "express";

import { PrismaChannelRepository } from "@/infrastructure/persistence/prisma/repositories/prisma_channel_repository";

export class ChannelController {
    async all(req: Request, res: Response, next: NextFunction) {
        try {
            const serverId = Number(req.params.id);
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
            const channelId = Number(req.params.id);

            const channel = await new PrismaChannelRepository().find_by_id(channelId);
            return res.json({
                channel,
            });
        } catch (err) {
            console.log(err);
            next(err);
        }
    }

    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const serverId = Number(req.params.id);
            const name = req.body?.name;


            if (!serverId || Number.isNaN(serverId)) {
                return res.status(400).json({ error: "Invalid serverId" })
            }

            if (!name || typeof name !== "string") {
                return res.status(400).json({ error: "Channel name is required" })
            }

            const channel = await new PrismaChannelRepository().save({
                name,
                server_id: serverId,
            } as any)

            return res.status(201).json({ ok: true, channel })
        } catch (err) {
            next(err)
        }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const channelId = Number(req.params.channelId);
            const name = req.body?.name;

            if (!channelId || Number.isNaN(channelId)) {
                return res.status(400).json({ error: "Invalid channelId" })
            }

            if (name && typeof name !== "string") {
                return res.status(400).json({ error: "Channel name must be a string" })
            }

            await new PrismaChannelRepository().update(channelId, {
                name,
            } as any)

            return res.status(200).json({ ok: true })
        } catch (err) {
            next(err)
        }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const channelId = Number(req.params.channelId);
            if (!channelId || Number.isNaN(channelId)) {
                return res.status(400).json({ error: "Invalid channelId" })
            }

            await new PrismaChannelRepository().delete(channelId)

            return res.status(200).json({ ok: true })
        } catch (err) {
            next(err)
        }
    }
}
