import { Router } from "express";
import { AuthController } from "../controllers/auth_controller";
import { AuthMiddleware } from "../middlewares/auth_middleware";

const router = Router();
const authController = new AuthController();
const authMiddleware = new AuthMiddleware();

router.post("/login", authController.login);
router.get("/signin", authController.signin);
router.get("/logout", authMiddleware.handle, authController.logout);

export default router;
