import { Router } from "express";
import { ChannelController } from "../controllers/channel_controller.js";
import { MessageController } from "../controllers/message_controller.js";

const router = Router({ mergeParams: true });
const channelController = new ChannelController();
const messageController = new MessageController();

router.get("/:id", channelController.index);
router.get("/:id/messages", messageController.all);
router.post("/:id/messages", messageController.create);
router.delete("/:channelId/messages/:messageId", messageController.delete);
router.patch("/:channelId/messages/:messageId", messageController.update);

export default router;
