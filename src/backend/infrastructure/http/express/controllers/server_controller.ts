import { NextFunction, Request, Response } from "express";
import { PrismaServerRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_server_repository";
import { PrismaMembershipRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_membership_repository";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { getOnlineUserIds } from "@/backend/infrastructure/ws/presence_store";
import { PrismaServerMapper } from "@/backend/infrastructure/persistence/prisma/mappers/prisma_server_mapper";
import { assertNotBanned } from "@/backend/infrastructure/http/express/utils/ban_guard";
import type { ServerProperties } from "@/backend/domain/entities/server";

const ROLE_OWNER = 1;

interface ServerUpdatePayload {
  name?: ServerProperties["name"];
  thumbnail?: ServerProperties["thumbnail"];
  banner?: ServerProperties["banner"];
  isPublic?: ServerProperties["isPublic"];
}

interface EnsureOwnerParams {
  ownerId: number;
  userId: number;
  roleId: number | null;
  res: Response;
}

function parseServerId(req: Request, res: Response): number | null {
  const serverId = Number(req.params.id);
  if (!Number.isFinite(serverId)) {
    res.status(400).json({ message: "Invalid server id" });
    return null;
  }
  return serverId;
}

function getCallerRoleId(
  membership: { props: { role_id: number } } | null,
): number | null {
  return membership?.props.role_id ?? null;
}

function ensureOwner({
  ownerId,
  userId,
  roleId,
  res,
}: EnsureOwnerParams): boolean {
  const isOwner = ownerId === userId || roleId === ROLE_OWNER;
  if (!isOwner) {
    res.status(403).json({ message: "Only owner can update server" });
    return false;
  }
  return true;
}

function buildServerUpdatePayload(body: Request["body"]): ServerUpdatePayload {
  const payload: ServerUpdatePayload = {};
  const name = body?.name;
  const thumbnail = body?.thumbnail;
  const banner = body?.banner;
  const isPublic = body?.isPublic;

  if (typeof name === "string") payload.name = name;
  if (thumbnail === null || typeof thumbnail === "string")
    payload.thumbnail = thumbnail;
  if (banner === null || typeof banner === "string") payload.banner = banner;
  if (typeof isPublic === "boolean") payload.isPublic = isPublic;

  return payload;
}

export class ServerController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.session.user_id;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const userMemberships = await prisma.memberships.findMany({
        where: { user_id: userId },
        select: { server_id: true, role_id: true },
      });
      const joinedServerIds = userMemberships.map((row) => row.server_id);

      const servers = await prisma.servers.findMany({
        where: joinedServerIds.length
          ? {
            OR: [{ is_public: true }, { id: { in: joinedServerIds } }],
          }
          : { is_public: true },
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

      const visibleServerSet = new Set(serverIds);
      const visibleMemberships = userMemberships.filter((row) =>
        visibleServerSet.has(row.server_id),
      );
      const joinedSet = new Set(visibleMemberships.map((row) => row.server_id));
      const roleByServer = new Map(
        visibleMemberships.map((row) => [row.server_id, row.role_id]),
      );

      const payload = servers.map((server) => {
        const roleId = roleByServer.get(server.id) ?? null;
        const isMember = joinedSet.has(server.id);
        return {
          id: server.id,
          name: server.name,
          thumbnail: server.thumbnail ?? null,
          banner: server.banner ?? null,
          isPublic: server.is_public,
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
      next(err);
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const userId = Number(req.session.user_id);
      await assertNotBanned(userId, id);
      const server = await new PrismaServerRepository().find_by_id(id);
      const membership =
        await new PrismaMembershipRepository().get_by_server_id(id);

      const isAdmin = server?.isAdmin(membership, id, userId) ?? false;
      const isOwner =
        server?.props.owner_id === userId ||
        (server?.isOwner(membership, id, userId) ?? false);

      return res.json({
        server,
        membership,
        isAdmin,
        isOwner,
        currentUserId: req.session.user_id ?? null,
        currentUserName: req.session.username ?? null,
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /servers
  async save(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, thumbnail, banner } = req.body;
      const isPublic =
        typeof req.body?.isPublic === "boolean" ? req.body.isPublic : undefined;
      const owner_id = Number(req.session.user_id);

      if (!Number.isFinite(owner_id)) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!name || typeof name !== "string") {
        return res.status(400).json({ message: "name is required" });
      }

      const serverData = await prisma.$transaction(async (tx) => {
        const created = await tx.servers.create({
          data: {
            name,
            owner_id,
            thumbnail: thumbnail ?? null,
            banner: banner ?? null,
            is_public: isPublic ?? undefined,
          },
        });

        await tx.channels.create({
          data: {
            server_id: created.id,
            name: "general",
          },
        });

        // Create Owner membership for creator
        await tx.memberships.create({
          data: {
            user_id: owner_id,
            server_id: created.id,
            role_id: ROLE_OWNER,
          },
        });

        return created;
      });

      const server = PrismaServerMapper.toDomain(serverData);

      return res.status(201).json({
        message: "Server created successfully",
        server_id: server.props.id,
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /servers/:id (Owner only)
  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const serverId = parseServerId(req, res);
      if (serverId === null) return;
      const userId = Number(req.session.user_id);

      const server = await new PrismaServerRepository().find_by_id(serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      const callerMembership =
        await new PrismaMembershipRepository().find_by_user_and_server(
          userId,
          serverId,
        );
      const callerRoleId = getCallerRoleId(callerMembership ?? null);
      if (
        !ensureOwner({
          ownerId: server.props.owner_id,
          userId,
          roleId: callerRoleId,
          res,
        })
      ) {
        return;
      }

      const payload = buildServerUpdatePayload(req.body);
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
        return res.status(400).json({ message: "Invalid server id" });
      }

      const server = await new PrismaServerRepository().find_by_id(serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      const callerMembership =
        await new PrismaMembershipRepository().find_by_user_and_server(
          userId,
          serverId,
        );
      const isOwner =
        server.props.owner_id === userId ||
        (callerMembership && callerMembership.props.role_id === ROLE_OWNER);
      if (!isOwner) {
        return res
          .status(403)
          .json({ message: "Only owner can delete server" });
      }

      await prisma.$transaction(async (tx) => {
        // delete invitations
        await tx.invitations.deleteMany({
          where: { server_id: serverId },
        });

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
