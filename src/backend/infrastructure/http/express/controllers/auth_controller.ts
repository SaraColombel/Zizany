import { PrismaUserRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_user_repository";
import { loginValidator } from "@/backend/infrastructure/validators/vine/auth_validator";
import { ValidationError } from "@vinejs/vine";
import { NextFunction, Request, Response } from "express";

import { BcryptHasher } from "@/backend/infrastructure/security/bcrypt_hasher";

const hasher = new BcryptHasher();

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = req.body;
      const { email, password } = await loginValidator.validate(payload);
      const user = await new PrismaUserRepository().find_by_email(email);

      if (!user) {
        // Mettre un faux hash ici plutot que plain vs plain
        await hasher.verify(
          password,
          await hasher.hash(Math.random().toString(36).substr(2, 8)),
        );
        return res.status(401).json({
          code: "E_UNAUTHORIZED_ACCESS",
          message: "Les identifiant fournis ne correspondent à aucun compte",
        });
      }

      const password_is_valid = await hasher.verify(
        password,
        user.props.password,
      );

      if (!password_is_valid) {
        return res.status(401).json({
          code: "E_UNAUTHORIZED_ACCESS",
          message: "Les identifiant fournis ne correspondent à aucun compte",
        });
      }

      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({
            code: "E_SESSION_REGENERATE",
            message: "Impossible d'initialiser la session",
          });
        }
        req.session.user_id = user.props.id;
        req.session.email = user.props.email;
        req.session.username = user.props.username;

        console.log({ session: req.session });

        req.session.save((err) => {
          if (err)
            return res.status(500).json({
              code: "E_SESSION_SAVE",
              message: "Impossible de sauvegarder la session",
            });
        });
        return res.status(200).json({
          code: "AUTHORIZED_ACCESS",
          user: {
            id: user.props.id,
            email,
            username: user.props.username,
            thumbnail: user.props.thumbnail,
          },
        });
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        return res.status(error.status).json({
          status: error.status,
          code: error.code,
          message: error.message,
          infos: error.messages,
        });
      }
      next(error);
    }
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
