import { Router } from "express";
import { prisma } from "@/infrastructure/prisma/prisma.client";

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

healthRouter.get("/servers", async (_, res, next) => {
  try {
    const servers = await prisma.servers.findMany();
    res.json({
      servers,
    });
  } catch (err) {
    next(err);
  }
});
