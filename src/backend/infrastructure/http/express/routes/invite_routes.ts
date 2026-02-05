import { Router } from "express";
import { InvitationController } from "../controllers/invitation_controller.js";

const router = Router();
const invitationController = new InvitationController();

router.post("/accept", invitationController.accept);

export default router;
