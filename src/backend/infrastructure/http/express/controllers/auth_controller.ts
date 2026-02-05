import { PrismaUserRepository } from "@/backend/infrastructure/persistence/prisma/repositories/prisma_user_repository";
import {
  loginValidator,
  registerValidator,
} from "@/backend/infrastructure/validators/vine/auth_validator";
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
        await hasher.hash(password);
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

  async signup(req: Request, res: Response, next: NextFunction) {
    const payload = await req.body;
    const { username, email, password, confirmPassword } =
      await registerValidator.validate(payload);

    const userExist = (await new PrismaUserRepository().find_by_email(email))
      ? true
      : false;

    if (userExist) {
      return res.status(401).json({
        code: "EMAIL_ALREADY_USED",
      });
    }

    const user = await new PrismaUserRepository().save({
      username,
      email,
      password: await hasher.hash(password),
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
  }

  async logout(req: Request, res: Response, next: NextFunction) {
    req.session.destroy((error) => {
      if (error) {
        return res
          .status(500)
          .json({ code: "E_DISCONNECT_UNKNOWN", error: error });
      }

      res.clearCookie("connect.sid", {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
      });
      return res.status(200).json({
        code: "DISCONNECTED",
      });
    });
  }

  async me(req: Request, res: Response) {
    const userId = Number(req.session.user_id);
    if (!Number.isFinite(userId)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await new PrismaUserRepository().find_by_id(userId);

    return res.status(res.statusCode).json({
      id: userId,
      email: user?.props.email ?? req.session.email ?? null,
      username: user?.props.username ?? req.session.username ?? null,
      thumbnail: user?.props.thumbnail ?? null,
    });
  }
}
