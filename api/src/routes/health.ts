import { Router } from "express";
import { prisma } from "@/infrastructure/prisma/prisma.client";

export const healthRouter = Router();

healthRouter.get("/health", async (_req, res, next) => {
  try {
    const result = await prisma.user.findMany();
    res.json({
      status: "ok",
      users: result,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});
