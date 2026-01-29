import { Router } from "express";
import { prisma } from "@/infrastructure/prisma/prisma.client";
import { PrismaServerRepository } from "@/infrastructure/prisma/repositories/prisma_server_repository";
import { PrismaUserRepository } from "@/infrastructure/prisma/repositories/prisma_user_repository";
import { PrismaMembershipRepository } from "@/infrastructure/prisma/repositories/prisma_membership_repository";

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

healthRouter.get("/servers/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const server = await new PrismaServerRepository().find_by_id(id);
    res.json({
      server,
    });
  } catch (err) {
    next(err);
  }
});

healthRouter.get("/servers/:id/members", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const members = await new PrismaMembershipRepository().get_by_server_id(id);
    res.json({
      members,
    });
  } catch (err) {
    next(err);
  }
});
