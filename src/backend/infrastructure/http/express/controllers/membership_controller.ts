import { NextFunction, Request, Response } from "express";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";

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
}
