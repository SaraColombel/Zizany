import { NextFunction, Request, Response } from "express";
import { PrismaServerRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_server_repository";
import { PrismaMembershipRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_membership_repository";
export class ServerController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      const servers = await new PrismaServerRepository().get_all();
      return res.json({
        servers,
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const server = await new PrismaServerRepository().find_by_id(id)
      const membership = await new PrismaMembershipRepository().get_by_server_id(id)
      const isAdmin = server?.isAdmin(membership, id, req.session.user_id!);
      const isOwner = server?.isOwner(membership, id, req.session.user_id!);
      return res.json({
        server,
        membership,
        isAdmin,
        isOwner,
        currentUserId: req.session.user_id ?? null,
        currentUserName: req.session.username ?? null,
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }

  async save(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, owner_id, thumbnail, banner } = req.body;
      await new PrismaServerRepository().save({
        name,
        owner_id,
        thumbnail,
        banner,
      });
      return res.status(201).json({
        message: "Server created successfully",
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }


}
