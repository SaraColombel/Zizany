import { Router } from "express";
import { prisma } from "@/infrastructure/prisma/prisma.client";
import { PrismaServerRepository } from "@/infrastructure/prisma/repositories/prisma_server_repository";
import { PrismaUserRepository } from "@/infrastructure/prisma/repositories/prisma_user_repository";

export const healthRouter = Router();

healthRouter.get("/health", async (_, res, next) => {
  try {
    const users = await prisma.users.findMany();
    res.json({
      status: "ok",
      data: users,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

healthRouter.get("/me", async (_, res, next) => {
  try {
    const user = await new PrismaUserRepository().get_all();
    res.json({
      user,
    });
  } catch (err) {
    next(err);
  }
});

healthRouter.get("/servers", async (_, res, next) => {
  try {
    const servers = await new PrismaServerRepository().get_all();
    res.json({
      servers,
    });
  } catch (err) {
    next(err);
  }
});
