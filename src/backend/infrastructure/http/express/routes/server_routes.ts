import { Router } from "express";
import { ServerController } from "../controllers/server_controller.js";
import { MembershipController } from "../controllers/membership_controller.js";
import { ChannelController } from "../controllers/channel_controller.js";
import { InvitationController } from "../controllers/invitation_controller.js";

const router = Router();
const serverController = new ServerController();
const membershipController = new MembershipController();
const channelController = new ChannelController();
const invitationController = new InvitationController();

router.get("/", serverController.all);
router.get("/:id", serverController.index);

router.get("/:id/members", membershipController.all);
router.put("/:id/members/:userId", membershipController.updateRole);

router.get("/:id/channels", channelController.all);
router.post("/:id/channels", channelController.create);
router.put("/:id/channels/:channelId", channelController.update);
router.delete("/:id/channels/:channelId", channelController.delete);

// servers CRUD
router.post("/", serverController.save);
router.put("/:id", serverController.update);
router.delete("/:id", serverController.delete);

// membership actions
router.post("/:id/join", membershipController.join);
router.delete("/:id/leave", membershipController.leave);
router.post("/:id/ban", membershipController.ban);
router.post("/:id/unban", membershipController.unban);

// invitations
router.post("/:id/invites", invitationController.create);

export default router;
