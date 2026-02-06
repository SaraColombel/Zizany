import { Router } from "express";
import { AuthController } from "../controllers/auth_controller.js";
import { AuthMiddleware } from "../middlewares/auth_middleware.js";

const router = Router();
const authController = new AuthController();
const authMiddleware = new AuthMiddleware();

router.post("/login", authMiddleware.silent, authController.login);
router.post("/signup", authMiddleware.silent, authController.signup);
router.post("/logout", authMiddleware.handle, authController.logout);
router.get("/me", authMiddleware.handle, authController.me);

export default router;
