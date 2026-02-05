import { Router } from "express";
import { ChannelController } from "../controllers/channel_controller";
import { MessageController } from "../controllers/message_controller";

const router = Router({ mergeParams: true });
const channelController = new ChannelController();
const messageController = new MessageController();

router.get("/:id", channelController.index.bind(channelController));
router.get("/:id/messages", messageController.all.bind(messageController));
router.post("/:id/messages", messageController.create.bind(messageController));
router.delete("/:channelId/messages/:messageId", messageController.delete.bind(messageController));
router.patch("/:channelId/messages/:messageId", messageController.update.bind(messageController));

export default router;
