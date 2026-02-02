import { Router } from "express";
import healthRouter from "./health_routes";
import authRouter from "./auth_routes";
import serverRouter from "./server_routes";
import channelRouter from "./channel_routes";
import { AuthMiddleware } from "../middlewares/auth_middleware";

const router = Router();
const authMiddleware = new AuthMiddleware();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/servers", authMiddleware.handle, serverRouter);
router.use("/channels", authMiddleware.handle, channelRouter);

export default router;
