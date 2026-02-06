import { prisma } from "../../../persistence/prisma/prisma.client.js";
import { User } from "../../../../domain/entities/user.js";
import { UserRepository } from "../../../../domain/repositories/user_repository.js";
import { PrismaUserMapper } from "../../../persistence/prisma/mappers/prisma_user_mapper.js";

import type { UserProperties } from "../../../../domain/entities/user.js";

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

  async save(payload: Omit<UserProperties, "id">): Promise<User> {
    const user = await prisma.users.create({
      data: {
        email: payload.email,
        password: payload.password,
        username: payload.username,
        thumbnail: payload.thumbnail,
      },
    });
    return PrismaUserMapper.toDomain(user);
  }
}
