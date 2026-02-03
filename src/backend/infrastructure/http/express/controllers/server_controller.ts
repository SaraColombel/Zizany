import { NextFunction, Request, Response } from "express";
import { PrismaServerRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_server_repository";
import { PrismaMembershipRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_membership_repository";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { getOnlineUserIds } from "@/backend/infrastructure/ws/presence_store";
export class ServerController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      const servers = await new PrismaServerRepository().get_all();
      const serverIds = servers.map((server) => server.props.id);

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

      const onlineUserIds = getOnlineUserIds();
      const onlineCounts =
        serverIds.length === 0 || onlineUserIds.length === 0
          ? []
          : await prisma.memberships.groupBy({
              by: ["server_id"],
              where: {
                server_id: { in: serverIds },
                user_id: { in: onlineUserIds },
              },
              _count: { _all: true },
            });
      const onlineByServer = new Map(
        onlineCounts.map((row) => [row.server_id, row._count._all]),
      );

      const payload = servers.map((server) => ({
        id: server.props.id,
        name: server.props.name,
        thumbnail: server.props.thumbnail ?? null,
        banner: server.props.banner ?? null,
        members: membersByServer.get(server.props.id) ?? 0,
        onlineMembers: onlineByServer.get(server.props.id) ?? 0,
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
      const id = parseInt(req.params.id[0]);
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
