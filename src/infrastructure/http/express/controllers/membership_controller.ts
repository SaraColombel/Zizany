import { NextFunction, Request, Response } from "express";
import { PrismaMembershipRepository } from "@/infrastructure/persistence/prisma/repositories/prisma_membership_repository";

export class MembershipController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id[0]);
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
