import { User as DomainUser } from "@/backend/domain/entities/user";
import { Users as PrismaUser } from "@/../generated/prisma/client";

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
