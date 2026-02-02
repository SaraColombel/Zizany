import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { User } from "@/backend/domain/entities/user";
import { UserRepository } from "@/backend/domain/repositories/user_repository";
import { PrismaUserMapper } from "@/backend/infrastructure/persistence/prisma/mappers/prisma_user_mapper";

import type { UserProperties } from "@/backend/domain/entities/user";

export class PrismaUserRepository extends UserRepository {
  async find_by_email(email: string): Promise<User | undefined> {
    const data = await prisma.users.findUnique({
      where: {
        email,
      },
    });
    if (!data) return undefined;
    return PrismaUserMapper.toDomain(data);
  }

  async find_by_id(id: number): Promise<User | undefined> {
    const data = await prisma.users.findUnique({
      where: {
        id,
      },
    });
    if (!data) return undefined;
    return PrismaUserMapper.toDomain(data);
  }

  async get_all(): Promise<User[]> {
    const data = await prisma.users.findMany();
    return data.map((user) => PrismaUserMapper.toDomain(user));
  }

  async save(payload: UserProperties): Promise<void> {
    await prisma.users.create({
      data: {
        email: payload.email,
        password: payload.password,
        username: payload.username,
        thumbnail: payload.thumbnail,
      },
    });
  }

  async verify_password(userId: number, password: string): Promise<boolean> {
    // TODO
    return true;
  }
}
