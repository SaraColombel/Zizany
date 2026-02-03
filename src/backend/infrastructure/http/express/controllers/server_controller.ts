import { NextFunction, Request, Response } from "express";
import { PrismaServerRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_server_repository";
import { PrismaMembershipRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_membership_repository";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client"

const ROLE_OWNER = 1;
export class ServerController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      const servers = await new PrismaServerRepository().get_all();
      return res.json({ servers });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const server = await new PrismaServerRepository().find_by_id(id);
      const membership = await new PrismaMembershipRepository().get_by_server_id(id);

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

  // POST /servers
  async save(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, thumbnail, banner } = req.body;
      const owner_id = Number(req.session.user_id);

      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "name is required" });
      }

      const server = await new PrismaServerRepository().save({
        name,
        owner_id,
        thumbnail: thumbnail ?? null,
        banner: banner ?? null,
      });

      // Create Owner membership for creator
      await new PrismaMembershipRepository().save({
        id: 0,
        user_id: owner_id,
        server_id: server.props.id,
        role_id: ROLE_OWNER,
      } as any);

      return res.status(201).json({
        message: "Server created successfully",
        server_id: server.props.id,
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }

  // PUT /servers/:id (Owner only)
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const serverId = Number(req.params.id);
      const userId = Number(req.session.user_id);

      if (!Number.isFinite(serverId)) {
        return res.status(400).json({ message: "Invalid server id" });
      }

      const callerMembership = await new PrismaMembershipRepository().find_by_user_and_server(userId, serverId);
      if (!callerMembership || callerMembership.props.role_id !== ROLE_OWNER) {
        return res.status(403).json({ message: "Only owner can update server" });
      }

      const { name, thumbnail, banner } = req.body;
      const payload: any = {};
      if (typeof name === "string") payload.name = name;
      if (thumbnail === null || typeof thumbnail === "string") payload.thumbnail = thumbnail;
      if (banner === null || typeof banner === "string") payload.banner = banner;

      const updated = await new PrismaServerRepository().update(serverId, payload);
      return res.json({ server: updated });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /servers/:id (Owner only)
  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const serverId = Number(req.params.id);
      const userId = Number(req.session.user_id);

      if (!Number.isFinite(serverId)) {
        return res.status(400).json({ message: "Invalid server id"});
      }

      const callerMembership = await new PrismaMembershipRepository().find_by_user_and_server(userId, serverId);
      if (!callerMembership || callerMembership.props.role_id !== ROLE_OWNER) {
        return res.status(403).json({ message: "Only owner can delete server" });
      }

      await prisma.$transaction(async (tx) => {
        // delete messages in all channels of the server
        await tx.messages.deleteMany({
          where: { channel: { server_id: serverId } },
        });

        // delete channels
        await tx.channels.deleteMany({
          where: { server_id: serverId },
        });

        // delete memberships
        await tx.memberships.deleteMany({
          where: { server_id: serverId },
        });

        // delete server
        await tx.servers.delete({
          where: { id: serverId },
        });
      });
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
