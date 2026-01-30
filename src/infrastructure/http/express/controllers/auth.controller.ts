import { NextFunction, Request, Response } from "express";

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    return res.json({
      status: req.statusCode,
      code: "AUTHORIZED_ACCESS",
      timestamp: new Date().toISOString(),
    });
  }

  async signin(req: Request, res: Response, next: NextFunction) {
    return res.json({
      status: req.statusCode,
      code: "AUTHORIZED_ACCESS",
      timestamp: new Date().toISOString(),
    });
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    return res.json({
      status: req.statusCode,
      code: "DISCONNECTED",
      timestamp: new Date().toISOString(),
    });
  }
}
