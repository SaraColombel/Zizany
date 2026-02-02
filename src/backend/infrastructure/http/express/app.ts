import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRouter from "./routes";
import session from "express-session";

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
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(sessionMiddleware);

  app.use("/api", apiRouter);

  return app;
}
