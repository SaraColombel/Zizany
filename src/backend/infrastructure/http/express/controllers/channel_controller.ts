import { NextFunction, Request, Response } from "express";

import { PrismaChannelRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_channel_repository";
import {
  createChannelValidator,
  updateChannelValidator,
} from "@/backend/infrastructure/validators/vine/channel_validator";
import { ValidationError } from "@vinejs/vine";

export class ChannelController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      const serverId = Number(req.params.id);
      const channels = await new PrismaChannelRepository().get_by_server_id(
        serverId,
      );
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
      const { name, server_id } = await createChannelValidator.validate({
        name: await req.body.name,
        server_id: Number(req.params.id),
      });

      const channel = await new PrismaChannelRepository().save({
        name,
        server_id,
      });

      return res.status(201).json({ ok: true, channel });
    } catch (err: any) {
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

      await new PrismaChannelRepository().delete(channelId);

      return res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  }
}
