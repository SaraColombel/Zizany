import { NextFunction, Request, Response } from "express";
import { PrismaMembershipRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_membership_repository";

export class MembershipController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const members = await new PrismaMembershipRepository().get_by_server_id(
        id,
      );
      res.json({
        members,
      });
    } catch (err) {
      next(err);
    }
  }
}
