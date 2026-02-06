import { NextFunction, Request, Response } from "express";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { PrismaMembershipRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_membership_repository";
import { PrismaServerRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_server_repository";
import { getSocketServer } from "@/backend/infrastructure/ws/socket";
import { assertNotBanned } from "@/backend/infrastructure/http/express/utils/ban_guard";
import type { Server } from "@/backend/domain/entities/server";

const ROLE_OWNER = 1;
const ROLE_ADMIN = 2;
const ROLE_MEMBER = 3;

interface HttpError extends Error {
  status?: number;
}

function httpError(status: number, message: string): HttpError {
  const err = new Error(message) as HttpError;
  err.status = status;
  return err;
}

function isHttpError(err: unknown): err is HttpError {
  return typeof (err as HttpError)?.status === "number";
}

function isMembershipUniqueError(error: unknown) {
  const err = error as { code?: string; meta?: { target?: string[] } };
  return (
    err?.code === "P2002" &&
    Array.isArray(err?.meta?.target) &&
    err.meta?.target?.includes("user_id") &&
    err.meta?.target?.includes("server_id")
  );
}

interface JoinCodeInfo {
  hasCode: boolean;
  code: string;
}

function parseJoinIds(req: Request) {
  const serverId = Number(req.params.id);
  const userId = Number(req.session.user_id);

  if (!Number.isFinite(serverId)) {
    throw httpError(400, "Invalid server id");
  }

  if (!Number.isFinite(userId)) {
    throw httpError(401, "Unauthorized");
  }

  return { serverId, userId };
}

function parseJoinCode(req: Request): JoinCodeInfo {
  const rawCode = req.body?.code;
  const hasCode = typeof rawCode !== "undefined";
  const code = typeof rawCode === "string" ? rawCode.trim() : "";

  if (hasCode && typeof rawCode !== "string") {
    throw httpError(400, "code must be a string");
  }

  if (hasCode && code.length === 0) {
    throw httpError(400, "code is required");
  }

  return { hasCode, code };
}

async function getServerOrThrow(serverId: number) {
  const server = await new PrismaServerRepository().find_by_id(serverId);
  if (!server) {
    throw httpError(404, "Server not found");
  }
  return server;
}

async function ensureNotMember(userId: number, serverId: number) {
  const existing = await new PrismaMembershipRepository().find_by_user_and_server(userId, serverId);
  if (existing) {
    throw httpError(409, "Already a member");
  }
}

function ensureJoinAccess(server: Server, codeInfo: JoinCodeInfo) {
  if (!codeInfo.hasCode && !server.props.isPublic) {
    throw httpError(403, "Server is private. Invitation code required.");
  }
}

async function getValidInvitation(serverId: number, code: string) {
  const invitation = await prisma.invitations.findFirst({
    where: { server_id: serverId, code },
  });

  if (!invitation) {
    throw httpError(404, "Invitation not found");
  }

  if (invitation.used_at) {
    throw httpError(409, "Invitation already used");
  }

  if (invitation.expires_at && invitation.expires_at < new Date()) {
    throw httpError(404, "Invitation expired");
  }

  return invitation;
}

async function createMembership(serverId: number, userId: number, codeInfo: JoinCodeInfo) {
  if (codeInfo.hasCode) {
    const invitation = await getValidInvitation(serverId, codeInfo.code);
    return prisma.$transaction(async (tx) => {
      const consumed = await tx.invitations.updateMany({
        where: { id: invitation.id, used_at: null },
        data: {
          used_at: new Date(),
          used_by_user_id: userId,
        },
      });

      if (consumed.count === 0) {
        throw httpError(409, "Invitation already used");
      }

      try {
        return await tx.memberships.create({
          data: {
            user_id: userId,
            server_id: serverId,
            role_id: ROLE_MEMBER,
          },
        });
      } catch (error) {
        if (isMembershipUniqueError(error)) {
          throw httpError(409, "Already a member");
        }
        throw error;
      }
    });
  }

  try {
    return await prisma.memberships.create({
      data: {
        user_id: userId,
        server_id: serverId,
        role_id: ROLE_MEMBER,
      },
    });
  } catch (error) {
    if (isMembershipUniqueError(error)) {
      throw httpError(409, "Already a member");
    }
    throw error;
  }
}

async function resolveUsername(req: Request, userId: number) {
  if (typeof req.session.username === "string") {
    return req.session.username;
  }

  return (
    (
      await prisma.users.findUnique({
        where: { id: userId },
        select: { username: true },
      })
    )?.username ?? `User ${userId}`
  );
}

function emitMemberJoined(serverId: number, userId: number, username: string) {
  const io = getSocketServer();
  if (io) {
    io.to(`server:${serverId}`).emit("server:member_joined", {
      serverId,
      userId,
      username,
    });
  }
}

function parseBanIds(req: Request) {
  const serverId = Number(req.params.id);
  const targetUserId = Number(req.body?.userId);
  const callerUserId = Number(req.session.user_id);

  if (!Number.isFinite(serverId) || !Number.isFinite(targetUserId)) {
    throw httpError(400, "Invalid serverId or userId");
  }

  return { serverId, targetUserId, callerUserId };
}

async function ensureOwnerCanBan(serverId: number, callerUserId: number) {
  const server = await prisma.servers.findUnique({
    where: { id: serverId },
    select: { id: true, owner_id: true },
  });
  if (!server) {
    throw httpError(404, "Server not found");
  }

  const callerMembership = await prisma.memberships.findFirst({
    where: { user_id: callerUserId, server_id: serverId },
    select: { role_id: true },
  });
  const isOwner =
    server.owner_id === callerUserId ||
    callerMembership?.role_id === ROLE_OWNER;
  if (!isOwner) {
    throw httpError(403, "Only owner can ban members");
  }
}

async function ensureUserExists(userId: number) {
  const targetUser = await prisma.users.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!targetUser) {
    throw httpError(404, "User not found");
  }
}

async function getMembershipOrThrow(serverId: number, userId: number) {
  const membership = await prisma.memberships.findFirst({
    where: { user_id: userId, server_id: serverId },
  });
  if (!membership) {
    throw httpError(404, "Membership not found");
  }
  return membership;
}

function parseBanReason(reasonRaw: unknown) {
  return typeof reasonRaw === "string" && reasonRaw.trim().length > 0
    ? reasonRaw.trim()
    : null;
}

function parseDateInput(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    return new Date(value);
  }
  return null;
}

function resolveBannedUntil(durationRaw: unknown, bannedUntilRaw: unknown) {
  if (typeof bannedUntilRaw !== "undefined") {
    const parsed = parseDateInput(bannedUntilRaw);
    if (!parsed) {
      throw httpError(400, "Invalid bannedUntil");
    }
    if (Number.isNaN(parsed.getTime())) {
      throw httpError(400, "Invalid bannedUntil");
    }
    if (parsed <= new Date()) {
      throw httpError(400, "bannedUntil must be in the future");
    }
    return parsed;
  }

  if (typeof durationRaw !== "undefined") {
    const durationMinutes = Number(durationRaw);
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      throw httpError(400, "durationMinutes must be positive");
    }
    return new Date(Date.now() + durationMinutes * 60 * 1000);
  }

  throw httpError(400, "durationMinutes or bannedUntil is required");
}

export class MembershipController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: "Invalid serverId" });
      }
      const userId = Number(req.session.user_id);
      await assertNotBanned(userId, id);

      const members = await prisma.memberships.findMany({
        where: {
          server_id: id,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              thumbnail: true,
            },
          },
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          id: "asc",
        },
      });

      res.json({
        members: members.map((member) => ({
          id: member.id,
          user_id: member.user_id,
          server_id: member.server_id,
          role_id: member.role_id,
          banned_until: member.banned_until,
          ban_reason: member.ban_reason,
          banned_by: member.banned_by,
          user: member.user,
          role: member.role,
        })),
      });
    } catch (err) {
      next(err);
    }
  }


  async join(req: Request, res: Response, next: NextFunction) {
    try {
      const { serverId, userId } = parseJoinIds(req);
      const server = await getServerOrThrow(serverId);

      await ensureNotMember(userId, serverId);

      const codeInfo = parseJoinCode(req);
      ensureJoinAccess(server, codeInfo);

      const membership = await createMembership(serverId, userId, codeInfo);
      const username = await resolveUsername(req, userId);

      emitMemberJoined(serverId, userId, username);

      return res.status(201).json({
        ok: true,
        membership,
        server: server.props,
      });
    } catch (err) {
      if (isHttpError(err)) {
        return res.status(err.status ?? 500).json({ message: err.message });
      }
      next(err);
    }
  }

  async leave(req: Request, res: Response, next: NextFunction) {
    try {
      const serverId = Number(req.params.id);
      const userId = Number(req.session.user_id);

      if (!Number.isFinite(serverId)) {
        return res.status(400).json({ message: "Invalid server id" });
      }

      const membership = await new PrismaMembershipRepository().find_by_user_and_server(userId, serverId);
      if (!membership) {
        return res.status(404).json({ message: "Membership not found" });
      }

      if (membership.props.role_id === ROLE_OWNER) {
        return res.status(403).json({ message: "Owner cannot leave server (delete it instead)" });
      }

      await new PrismaMembershipRepository().delete_by_user_and_server(userId, serverId);

      const username =
        typeof req.session.username === "string"
          ? req.session.username
          : (
            await prisma.users.findUnique({
              where: { id: userId },
              select: { username: true },
            })
          )?.username ??
          `User ${userId}`;

      const io = getSocketServer();
      if (io) {
        io.to(`server:${serverId}`).emit("server:member_left", {
          serverId,
          userId,
          username,
        });
      }

      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async updateRole(req: Request, res: Response, next: NextFunction) {
    try {
      const serverId = Number(req.params.id);
      const targetUserId = Number(req.params.userId);
      const currentUserId = Number(req.session.user_id);
      const { role_id } = req.body;

      if (!Number.isFinite(serverId) || !Number.isFinite(targetUserId)) {
        return res.status(400).json({ message: "Invalid serverId or userId" });
      }

      const newRoleId = Number(role_id);
      if (![ROLE_OWNER, ROLE_ADMIN, ROLE_MEMBER].includes(newRoleId)) {
        return res.status(400).json({ message: "Invalid role_id" });
      }

      // Only Owner can update roles
      const callerMembership = await new PrismaMembershipRepository().find_by_user_and_server(currentUserId, serverId);
      if (!callerMembership) {
        return res.status(403).json({ message: "Not a member of this server" });
      }
      if (callerMembership.props.role_id !== ROLE_OWNER) {
        return res.status(403).json({ message: "Only owner can update roles" });
      }

      const targetMembership = await new PrismaMembershipRepository().find_by_user_and_server(targetUserId, serverId);
      if (!targetMembership) {
        return res.status(404).json({ message: "Target membership not found" });
      }

      // Cannot change owner's role
      if (targetMembership.props.role_id === ROLE_OWNER) {
        return res.status(403).json({ message: "Cannot change owner role" });
      }

      if (newRoleId === ROLE_OWNER) {
        await new PrismaMembershipRepository().update_role(
          targetUserId,
          serverId,
          ROLE_OWNER,
        );
        await new PrismaMembershipRepository().update_role(
          currentUserId,
          serverId,
          ROLE_MEMBER,
        );
        return res.status(204).send();
      }

      await new PrismaMembershipRepository().update_role(
        targetUserId,
        serverId,
        newRoleId,
      );
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }

  async ban(req: Request, res: Response, next: NextFunction) {
    try {
      const { serverId, targetUserId, callerUserId } = parseBanIds(req);
      await ensureOwnerCanBan(serverId, callerUserId);
      await ensureUserExists(targetUserId);
      const targetMembership = await getMembershipOrThrow(serverId, targetUserId);

      const reason = parseBanReason(req.body?.reason);
      const bannedUntil = resolveBannedUntil(
        req.body?.durationMinutes,
        req.body?.bannedUntil,
      );

      const updated = await prisma.memberships.update({
        where: { id: targetMembership.id },
        data: {
          banned_until: bannedUntil,
          ban_reason: reason,
          banned_by: callerUserId,
        },
      });

      return res.json({ membership: updated });
    } catch (err) {
      if (isHttpError(err)) {
        return res.status(err.status ?? 500).json({ message: err.message });
      }
      next(err);
    }
  }

  async unban(req: Request, res: Response, next: NextFunction) {
    try {
      const serverId = Number(req.params.id);
      const targetUserId = Number(req.body?.userId);
      const callerUserId = Number(req.session.user_id);

      if (!Number.isFinite(serverId) || !Number.isFinite(targetUserId)) {
        return res.status(400).json({ message: "Invalid serverId or userId" });
      }

      const server = await prisma.servers.findUnique({
        where: { id: serverId },
        select: { id: true, owner_id: true },
      });
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      const callerMembership = await prisma.memberships.findFirst({
        where: { user_id: callerUserId, server_id: serverId },
        select: { role_id: true },
      });
      const isOwner =
        server.owner_id === callerUserId ||
        callerMembership?.role_id === ROLE_OWNER;
      if (!isOwner) {
        return res.status(403).json({ message: "Only owner can unban members" });
      }

      const targetUser = await prisma.users.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const targetMembership = await prisma.memberships.findFirst({
        where: { user_id: targetUserId, server_id: serverId },
      });
      if (!targetMembership) {
        return res.status(404).json({ message: "Membership not found" });
      }

      const updated = await prisma.memberships.update({
        where: { id: targetMembership.id },
        data: {
          banned_until: null,
          ban_reason: null,
          banned_by: null,
        },
      });

      return res.json({ membership: updated });
    } catch (err) {
      next(err);
    }
  }
}
