import { Router } from "express";

import healthRouter from "./health_routes.js";
import authRouter from "./auth_routes.js";
import serverRouter from "./server_routes.js";
import channelRouter from "./channel_routes.js";
import messageRouter from "./message_routes";
import inviteRouter from "./invite_routes.js";

import { AuthMiddleware } from "../middlewares/auth_middleware.js";

const router = Router();
const authMiddleware = new AuthMiddleware();

router.use("/health", healthRouter);
router.use("/auth", authRouter);

router.use("/servers", authMiddleware.handle, serverRouter);
router.use("/channels", authMiddleware.handle, channelRouter);
router.use("/messages", authMiddleware.handle, messageRouter);
router.use("/invites", authMiddleware.handle, inviteRouter);

export default router;
