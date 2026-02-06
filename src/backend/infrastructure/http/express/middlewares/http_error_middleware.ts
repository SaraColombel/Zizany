import { NextFunction, Request, Response } from "express";
import { HttpError } from "@/backend/infrastructure/http/express/utils/ban_guard";

// eslint-disable-next-line max-params
export function httpErrorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json(err.payload);
  }
  return next(err);
}
