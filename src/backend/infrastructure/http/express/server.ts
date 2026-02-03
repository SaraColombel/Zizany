import "dotenv/config";
import http from "http";
import { createApp, sessionMiddleware } from "./app";
import { attachSocket } from "../../ws/socket";

const PORT = Number(process.env.API_PORT ?? 4000);
const app = createApp();
const httpServer = http.createServer(app);

attachSocket(httpServer, sessionMiddleware);

httpServer.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
