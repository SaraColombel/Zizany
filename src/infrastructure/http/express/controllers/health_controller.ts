import { NextFunction, Request, Response } from "express";

export class HealthController {
  async handle(req: Request, res: Response, next: NextFunction) {
    res.json({
      status: "ok",
      code: res.statusCode,
      timestamp: new Date().toISOString(),
    });
  }
}
