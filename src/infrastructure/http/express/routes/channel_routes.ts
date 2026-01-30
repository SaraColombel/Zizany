import { Router } from "express";
import { ChannelController } from "../controllers/channel_controller";

const router = Router({ mergeParams: true });
const channelController = new ChannelController();

router.get("/", channelController.all);
router.get("/:id", channelController.index);

export default router;
