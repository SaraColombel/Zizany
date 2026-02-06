import { NextFunction, Request, Response } from "express";
import { HttpError } from "../../../http/express/utils/ban_guard.js";

const isHttpError = (err: unknown): err is HttpError => {
  if (err instanceof HttpError) return true;
  if (!err || typeof err !== "object") return false;
  const maybe = err as { status?: unknown; payload?: unknown };
  return typeof maybe.status === "number" && typeof maybe.payload === "object" && maybe.payload !== null;
};

// eslint-disable-next-line max-params
export function httpErrorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (isHttpError(err)) {
    return res.status(err.status).json(err.payload);
  }
  return next(err);
}
