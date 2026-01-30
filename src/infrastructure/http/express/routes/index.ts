import { Router } from "express";
import healthRouter from "./health_routes";
import authRouter from "./auth_routes";
import serverRouter from "./server_routes";
import channelRouter from "./channel_routes";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/servers", serverRouter);
router.use("/channels", channelRouter);

export default router;
