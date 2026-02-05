import { Request, Response } from "express";

export class HealthController {
  async handle(req: Request, res: Response) {
    return res.json({
      status: req.statusCode,
      code: "OK",
      timestamp: new Date().toISOString(),
    });
  }
}
