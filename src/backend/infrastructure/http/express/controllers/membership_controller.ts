import { NextFunction, Request, Response } from "express";
import { PrismaMembershipRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_membership_repository";
import { PrismaServerRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_server_repository"

export class MembershipController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const members = await new PrismaMembershipRepository().get_by_server_id(
        id,
      );
      res.json({
        members,
      });
    } catch (err) {
      next(err);
    }
  }

  async join(req: Request, res: Response, next: NextFunction) {
    const serverId = Number(req.params.id);
    const userId = Number(req.session.user_id);
    if (!Number.isFinite(serverId)) {
      return res.status(400).json({ message: "Invalid server id" });
    }
    const server = await new PrismaServerRepository().find_by_id(serverId);
    if (!server) {
      return res.status(404).json({ message: "Server not found" });
    }
    const existing = await new PrismaMembershipRepository().find_by_user_and_server(userId, serverId);
    if (existing) {
      return res.status(409).json({ message: "Already a member" });
    } else {
      await new PrismaMembershipRepository().save({id: 0, user_id:userId, server_id:serverId, role_id:3});
      return res.status(201).json({ ok: true });
    }
  }
}
