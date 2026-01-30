import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const router = Router();
const authController = new AuthController();

router.get("/login", authController.login);
router.get("/signin", authController.signin);
router.get("/logout", authController.logout);

export default router;
