import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRouter from "./routes";
import session from "express-session";
import { httpErrorMiddleware } from "./middlewares/http_error_middleware";

/**Export utilisé côté Socket.IO */
export const sessionMiddleware = session({
  secret: "zizany",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24,
  },
});

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  app.use(sessionMiddleware);

  app.use("/api", apiRouter);
  app.use(httpErrorMiddleware);

  return app;
}
