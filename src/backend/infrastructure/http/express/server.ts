import "dotenv/config";
import http from "http";
import { createApp, sessionMiddleware } from "./app.js";
import { attachSocket } from "../../ws/socket.js";

const PORT = Number(process.env.API_PORT ?? 4000);
const app = createApp();
const httpServer = http.createServer(app);

attachSocket(httpServer, sessionMiddleware);

httpServer.listen(PORT, () => {
  console.log(`[api] listening on http://localhost:${PORT}`);
});
