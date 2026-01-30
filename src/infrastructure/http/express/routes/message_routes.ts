import { Router } from "express";
import { MessageController } from "../controllers/message_controller";

const router = Router({ mergeParams: true });
const messageController = new MessageController();

router.delete("/:id", messageController.index);

export default router;
