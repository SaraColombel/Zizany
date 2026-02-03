import { NextFunction, Request, Response } from "express";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { PrismaMembershipRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_membership_repository";
import { PrismaServerRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_server_repository";

const ROLE_OWNER = 1;
const ROLE_ADMIN = 2;
const ROLE_MEMBER = 3;

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

      const server = await new PrismaServerRepository().find_by_id(serverId);
      if (!server) {
        return res.status(404).json({ message: "Server not found" });
      }

      const existing = await new PrismaMembershipRepository().find_by_user_and_server(userId, serverId);
      if (existing) {
        return res.status(409).json({ message: "Already a member" });
      }

      await new PrismaMembershipRepository().save({
        id: 0,
        user_id: userId,
        server_id: serverId,
        role_id: ROLE_MEMBER,
      });

      return res.status(201).json({ ok: true });
    } catch (err) {
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

      await new PrismaMembershipRepository().update_role(targetUserId, serverId, newRoleId);
      return res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}
