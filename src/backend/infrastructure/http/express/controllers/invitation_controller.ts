import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { PrismaMembershipRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_membership_repository";
import { PrismaServerRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_server_repository";
import { getSocketServer } from "@/backend/infrastructure/ws/socket";

const ROLE_OWNER = 1;
const ROLE_ADMIN = 2;
const ROLE_MEMBER = 3;

const INVITE_CODE_LENGTH = 15;
const INVITE_EXPIRY_HOURS = 24;
const INVITE_CODE_ATTEMPTS = 3;
const INVITE_CODE_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function generateInviteCode(length = INVITE_CODE_LENGTH) {
  const bytes = crypto.randomBytes(length);
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += INVITE_CODE_ALPHABET[bytes[i] % INVITE_CODE_ALPHABET.length];
  }
  return output;
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function isUniqueCodeError(error: unknown) {
  const err = error as { code?: string; meta?: { target?: string[] } };
  return (
    err?.code === "P2002" &&
    Array.isArray(err?.meta?.target) &&
    err.meta?.target?.includes("code")
  );
}

type HttpError = Error & { status?: number };

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
  if (err?.code !== "P2002") return false;

  const target = err?.meta?.target;
  if (!Array.isArray(target)) return false;

  const hasUser = target.includes("user_id");
  const hasServer = target.includes("server_id");
  return hasUser && hasServer;
}

async function createInviteWithRetry(
  serverId: number,
  userId: number,
  expiresAt: Date | null,
) {
  for (let attempt = 0; attempt < INVITE_CODE_ATTEMPTS; attempt += 1) {
    const code = generateInviteCode();
    try {
      return await prisma.invitations.create({
        data: {
          server_id: serverId,
          code,
          created_by_user_id: userId,
          expires_at: expiresAt,
          used_at: null,
          used_by_user_id: null,
        },
      });
    } catch (error) {
      if (isUniqueCodeError(error)) {
        continue;
      }
      throw error;
    }
  }
  throw new Error("Failed to generate invitation code");
}

export class InvitationController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const serverId = Number(req.params.id);
      const userId = Number(req.session.user_id);

      if (!Number.isFinite(serverId)) {
        return res.status(400).json({ message: "Invalid server id" });
      }

      if (!Number.isFinite(userId)) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const server = await new PrismaServerRepository().find_by_id(serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      const membership = await new PrismaMembershipRepository().find_by_user_and_server(
        userId,
        serverId,
      );

      const isOwner =
        server.props.owner_id === userId ||
        membership?.props.role_id === ROLE_OWNER;
      const isAdmin = membership?.props.role_id === ROLE_ADMIN;

      if (!isOwner && !isAdmin) {
        return res
          .status(403)
          .json({ message: "Only owner or admin can create invites" });
      }

      const expiresAt = addHours(new Date(), INVITE_EXPIRY_HOURS);
      const invitation = await createInviteWithRetry(serverId, userId, expiresAt);

      return res.status(201).json({
        code: invitation.code,
        server_id: invitation.server_id,
        expires_at: invitation.expires_at,
      });
    } catch (err) {
      next(err);
    }
  }

  getUserIdOr401(req: Request, res: Response): number | null {
    const userId = Number(req.session.user_id);
    if (!Number.isFinite(userId)) {
      res.status(401).json({ message: "Unauthorized" });
      return null;
    }
    return userId;
  }

  getCodeOr400(req: Request, res: Response): string | null {
    const rawCode = req.body?.code;
    if (typeof rawCode !== "string") {
      res.status(400).json({ message: "code must be a string" });
      return null;
    }
    const code = rawCode.trim();
    if (!code) {
      res.status(400).json({ message: "code is required" });
      return null;
    }
    return code;
  }

  async getInvitationOr404Or409(code: string, res: Response) {
    const invitation = await prisma.invitations.findUnique({ where: { code } });

    if (!invitation) {
      res.status(404).json({ message: "Invitation not found" });
      return null;
    }

    if (invitation.used_at) {
      res.status(409).json({ message: "Invitation already used" });
      return null;
    }

    if (invitation.expires_at && invitation.expires_at < new Date()) {
      res.status(404).json({ message: "Invitation expired" });
      return null;
    }

    return invitation;
  }


  async consumeInviteAndCreateMembership(params: {
    invitationId: number;
    userId: number;
    serverId: number;
  }) {
    const { invitationId, userId, serverId } = params;

    return prisma.$transaction(async (tx) => {
      const consumed = await tx.invitations.updateMany({
        where: { id: invitationId, used_at: null },
        data: { used_at: new Date(), used_by_user_id: userId },
      });

      if (consumed.count === 0) {
        throw httpError(409, "Invitation already used");
      }

      try {
        return await tx.memberships.create({
          data: { user_id: userId, server_id: serverId, role_id: ROLE_MEMBER },
        });
      } catch (error) {
        if (isMembershipUniqueError(error)) {
          throw httpError(409, "Already a member");
        }
        throw error;
      }
    });
  }

  async getUsername(req: Request, userId: number) {
    if (typeof req.session.username === "string") return req.session.username;

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    return user?.username ?? `User ${userId}`;
  }

  emitMemberJoined(serverId: number, payload: { userId: number; username: string }) {
    const io = getSocketServer();
    if (!io) return;
    io.to(`server:${serverId}`).emit("server:member_joined", {
      serverId,
      userId: payload.userId,
      username: payload.username,
    });
  }

  accept = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = this.getUserIdOr401(req, res);
      if (userId == null) return;

      const code = this.getCodeOr400(req, res);
      if (code == null) return;

      const invitation = await this.getInvitationOr404Or409(code, res);
      if (!invitation) return;

      const server = await new PrismaServerRepository().find_by_id(invitation.server_id);
      if (!server) return res.status(404).json({ message: "Server not found" });

      const existing = await new PrismaMembershipRepository().find_by_user_and_server(
        userId,
        invitation.server_id,
      );
      if (existing) return res.status(409).json({ message: "Already a member" });

      const membership = await this.consumeInviteAndCreateMembership({
        invitationId: invitation.id,
        userId,
        serverId: invitation.server_id,
      });

      const username = await this.getUsername(req, userId);
      this.emitMemberJoined(invitation.server_id, { userId, username });

      return res.status(201).json({ ok: true, membership, server: server.props });
    } catch (err) {
      if (isHttpError(err)) {
        return res.status(err.status ?? 500).json({ message: err.message });
      }
      next(err);
    }
  };
}
