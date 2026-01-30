import { NextFunction, Request, Response } from "express";
import { PrismaServerRepository } from "@/infrastructure/persistence/prisma/repositories/prisma_server_repository";

export class ServerController {
  async all(req: Request, res: Response, next: NextFunction) {
    try {
      const servers = await new PrismaServerRepository().get_all();
      console.log(true);
      return res.json({
        servers,
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }

  async index(req: Request, res: Response, next: NextFunction) {
    try {
      const id = parseInt(req.params.id[0]);
      console.log(true);
      const server = await new PrismaServerRepository().find_by_id(id);
      return res.json({
        server,
      });
    } catch (err) {
      console.log(err);
      next(err);
    }
  }
}
