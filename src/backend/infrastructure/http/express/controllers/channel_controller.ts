import { NextFunction, Request, Response } from "express";

import { PrismaChannelRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_channel_repository";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import {
  createChannelValidator,
  updateChannelValidator,
} from "@/backend/infrastructure/validators/vine/channel_validator";
import { ValidationError } from "@vinejs/vine";
import { assertNotBanned } from "@/backend/infrastructure/http/express/utils/ban_guard";

async function resolveServerId(channelId: number): Promise<number | null> {
  if (!Number.isFinite(channelId)) return null;
  const channel = await prisma.channels.findUnique({
    where: { id: channelId },
    select: { server_id: true },
  });
  return channel?.server_id ?? null;
}

export class ChannelController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      const serverId = Number(req.params.id);
      const userId = Number(req.session.user_id);
      await assertNotBanned(userId, serverId);
      const channels = await new PrismaChannelRepository().get_by_server_id(
        serverId,
      );
      return res.json({
        channels,
      });
    } catch (err) {
      next(err);
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const channelId = Number(req.params.id);
      const userId = Number(req.session.user_id);
      const serverId = await resolveServerId(channelId);
      if (serverId) {
        await assertNotBanned(userId, serverId);
      }

      const channel = await new PrismaChannelRepository().find_by_id(channelId);
      return res.json({
        channel,
      });
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, server_id } = await createChannelValidator.validate({
        name: await req.body.name,
        server_id: Number(req.params.id),
      });
      const userId = Number(req.session.user_id);
      await assertNotBanned(userId, server_id);

      const channel = await new PrismaChannelRepository().save({
        name,
        server_id,
      });

      return res.status(201).json({ ok: true, channel });
    } catch (err) {
      if (err instanceof ValidationError) {
        return res.status(422).json({ err });
      }
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id, name } = await updateChannelValidator.validate({
        id: Number(req.params.channelId),
        name: await req.body.name,
      });
      const userId = Number(req.session.user_id);
      const serverId = await resolveServerId(id);
      if (serverId) {
        await assertNotBanned(userId, serverId);
      }

      await new PrismaChannelRepository().update(id, {
        name,
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      if (err instanceof ValidationError) {
        return res.status(422).json({ err });
      }
      next(err);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const channelId = Number(req.params.channelId);
      if (!channelId || Number.isNaN(channelId)) {
        return res.status(400).json({ error: "Invalid channelId" });
      }
      const userId = Number(req.session.user_id);
      const serverId = await resolveServerId(channelId);
      if (serverId) {
        await assertNotBanned(userId, serverId);
      }

      await new PrismaChannelRepository().delete(channelId);

      return res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
}
