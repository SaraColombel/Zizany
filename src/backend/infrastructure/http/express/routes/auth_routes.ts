import { Router } from "express";
import { AuthController } from "../controllers/auth_controller";
import { AuthMiddleware } from "../middlewares/auth_middleware";

const router = Router();
const authController = new AuthController();
const authMiddleware = new AuthMiddleware();

router.post("/login", authController.login);
router.post("/signup", authController.signup);
router.post("/logout", authMiddleware.handle, authController.logout);
router.get("/me", authMiddleware.handle, authController.me);

export default router;
