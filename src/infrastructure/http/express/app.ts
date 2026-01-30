import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import apiRouter from "./routes";

export function createApp() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.use("/api", apiRouter);

  return app;
}
