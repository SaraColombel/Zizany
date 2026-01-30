import { Router } from "express";
import { ChannelController } from "../controllers/channel_controller";
import { MessageController } from "../controllers/message_controller";

const router = Router({ mergeParams: true });
const channelController = new ChannelController();
const messageController = new MessageController();

router.get("/:id", channelController.index);
router.get("/:id/messages", messageController.all);
router.post("/:id/messages", messageController.create);
router.delete("/:channelId/messages/:messageId", messageController.delete);

export default router;
