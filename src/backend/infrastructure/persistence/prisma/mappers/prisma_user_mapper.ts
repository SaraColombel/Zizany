import { User as DomainUser } from "../../../../domain/entities/user.js";
import { Users as PrismaUser } from "@prisma/client";

export class PrismaUserMapper {
  static toDomain(prismaUser: PrismaUser): DomainUser {
    return DomainUser.create({
      id: prismaUser.id,
      email: prismaUser.email,
      password: prismaUser.password,
      username: prismaUser.username,
      thumbnail: prismaUser.thumbnail ?? undefined,
    });
  }
}
