import { NextFunction, Request, Response } from "express";
import { PrismaServerRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_server_repository";
import { PrismaMembershipRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_membership_repository";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { getOnlineUserIds } from "@/backend/infrastructure/ws/presence_store";
import type { ServerProperties } from "@/backend/domain/entities/server";


const ROLE_OWNER = 1;
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
      // return res.json({ servers });

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

      const userMemberships =
        serverIds.length === 0
          ? []
          : await prisma.memberships.findMany({
            where: {
              user_id: userId,
              server_id: { in: serverIds },
            },
            select: { server_id: true, role_id: true },
          });
      const joinedSet = new Set(userMemberships.map((row) => row.server_id));
      const roleByServer = new Map(
        userMemberships.map((row) => [row.server_id, row.role_id]),
      );

      const payload = servers.map((server) => {
        const roleId = roleByServer.get(server.id) ?? null;
        const isMember = joinedSet.has(server.id);
        return {
          id: server.id,
          name: server.name,
          thumbnail: server.thumbnail ?? null,
          banner: server.banner ?? null,
          members: membersByServer.get(server.id) ?? 0,
          onlineMembers: onlineByServer.get(server.id) ?? 0,
          isMember,
          canLeave: isMember && roleId !== ROLE_OWNER,
          currentUserRoleId: roleId,
        };
      });

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
      });

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
      const payload: {
        name?: string;
        thumbnail?: string | null;
        banner?: string | null;
      } = {};
      if (typeof name === "string") payload.name = name;
      if (thumbnail === null || typeof thumbnail === "string") payload.thumbnail = thumbnail;
      if (banner === null || typeof banner === "string") payload.banner = banner;

      const updated = await new PrismaServerRepository().update(
        serverId,
        payload as Partial<Omit<ServerProperties, "id" | "owner_id">>,
      );
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
        return res.status(400).json({ message: "Invalid server id " });
      }

      const callerMembership = await new PrismaMembershipRepository().find_by_user_and_server(userId, serverId);
      if (!callerMembership || callerMembership.props.role_id !== ROLE_OWNER) {
        return res.status(403).json({ message: "Only owner can delete server" });
      }

      await new PrismaServerRepository().delete(serverId);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
