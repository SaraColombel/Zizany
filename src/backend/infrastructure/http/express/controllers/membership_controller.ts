import { NextFunction, Request, Response } from "express";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { PrismaMembershipRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_membership_repository";
import { PrismaServerRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_server_repository";
import { getSocketServer } from "@/backend/infrastructure/ws/socket";

const ROLE_OWNER = 1;
const ROLE_ADMIN = 2;
const ROLE_MEMBER = 3;

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
  return (
    err?.code === "P2002" &&
    Array.isArray(err?.meta?.target) &&
    err.meta?.target?.includes("user_id") &&
    err.meta?.target?.includes("server_id")
  );
}

export class MembershipController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: "Invalid serverId" });
      }

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

      const existing = await new PrismaMembershipRepository().find_by_user_and_server(userId, serverId);
      if (existing) {
        return res.status(409).json({ message: "Already a member" });
      }

      const rawCode = req.body?.code;
      const hasCodeField = typeof rawCode !== "undefined";
      const code = typeof rawCode === "string" ? rawCode.trim() : "";

      if (hasCodeField && typeof rawCode !== "string") {
        return res.status(400).json({ message: "code must be a string" });
      }

      if (hasCodeField && code.length === 0) {
        return res.status(400).json({ message: "code is required" });
      }

      if (!hasCodeField && !server.props.isPublic) {
        return res.status(403).json({ message: "Server is private. Invitation code required." });
      }

      if (!hasCodeField && !server.props.isPublic) {
        return res.status(403).json({ message: "Server is private. Invitation code required." });
      }



      let membership;
      if (hasCodeField) {
        const invitation = await prisma.invitations.findFirst({
          where: { server_id: serverId, code },
        });

        if (!invitation) {
          return res.status(404).json({ message: "Invitation not found" });
        }

        if (invitation.used_at) {
          return res.status(409).json({ message: "Invitation already used" });
        }

        if (invitation.expires_at && invitation.expires_at < new Date()) {
          return res.status(404).json({ message: "Invitation expired" });
        }

        membership = await prisma.$transaction(async (tx) => {
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
      } else {
        try {
          membership = await prisma.memberships.create({
            data: {
              user_id: userId,
              server_id: serverId,
              role_id: ROLE_MEMBER,
            },
          });
        } catch (error) {
          if (isMembershipUniqueError(error)) {
            return res.status(409).json({ message: "Already a member" });
          }
          throw error;
        }
      }

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
        io.to(`server:${serverId}`).emit("server:member_joined", {
          serverId,
          userId,
          username,
        });
      }

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
}
