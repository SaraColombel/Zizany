import { Router } from "express";
import { HealthController } from "../controllers/health_controller";

const router = Router();
const healthController = new HealthController();

router.get("/", healthController.handle);

export default router;

// healthRouter.get("/me", async (_, res, next) => {
//   try {
//     const user = await new PrismaUserRepository().get_all();
//     res.json({
//       user,
//     });
//   } catch (err) {
//     next(err);
//   }
// });
