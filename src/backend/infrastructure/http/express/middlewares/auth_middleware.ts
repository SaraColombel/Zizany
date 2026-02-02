import { Request, Response, NextFunction } from "express";

export class AuthMiddleware {
  handle = (req: Request, res: Response, next: NextFunction) => {
    if (req.session && req.session.user_id) {
      return next();
    }
    return res.status(401).json({
      code: "E_UNAUTHORIZED_ACCESS",
      message: "Vous devez être authentifié pour accéder à cette route",
    });
  };
}
