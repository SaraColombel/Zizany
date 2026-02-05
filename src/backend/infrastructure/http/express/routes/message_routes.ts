import { Router } from "express";
import { MessageController } from "../controllers/message_controller";

const router = Router();
const messageController = new MessageController();

// DELETE /api/messages/:id
router.delete("/:id", messageController.deleteById);

router.patch("/:id", messageController.updateById);

export default router;