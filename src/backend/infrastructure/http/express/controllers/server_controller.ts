import { NextFunction, Request, Response } from "express";
import { PrismaServerRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_server_repository";
import { PrismaMembershipRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_membership_repository";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
export class ServerController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.session.user_id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const servers = await prisma.servers.findMany({
        orderBy: { id: "asc" },
      });

      const serverIds = servers.map((server) => server.id);
      const membershipCounts =
        serverIds.length === 0
          ? []
          : await prisma.memberships.groupBy({
              by: ["server_id"],
              where: { server_id: { in: serverIds } },
              _count: { _all: true },
            });
      const membersByServer = new Map(
        membershipCounts.map((row) => [row.server_id, row._count._all]),
      );

      const userMemberships =
        serverIds.length === 0
          ? []
          : await prisma.memberships.findMany({
              where: {
                user_id: userId,
                server_id: { in: serverIds },
              },
              select: { server_id: true },
            });
      const joinedSet = new Set(userMemberships.map((row) => row.server_id));

      const payload = servers.map((server) => ({
        id: server.id,
        name: server.name,
        thumbnail: server.thumbnail ?? null,
        banner: server.banner ?? null,
        members: membersByServer.get(server.id) ?? 0,
        isMember: joinedSet.has(server.id),
      }));

      return res.json({
        servers: payload,
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
