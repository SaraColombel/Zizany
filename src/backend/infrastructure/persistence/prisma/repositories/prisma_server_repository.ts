import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { Server } from "@/backend/domain/entities/server";
import { ServerRepository } from "@/backend/domain/repositories/server_repository";
import { PrismaServerMapper } from "@/backend/infrastructure/persistence/prisma/mappers/prisma_server_mapper";

import type { ServerProperties } from "@/backend/domain/entities/server";

export class PrismaServerRepository extends ServerRepository {
  async find_by_id(id: number): Promise<Server | undefined> {
    const data = await prisma.servers.findUnique({
      where: {
        id,
      },
    });
    if (!data) return undefined;
    return PrismaServerMapper.toDomain(data);
  }

  async find_by_owner_id(owner_id: number): Promise<Server[] | undefined> {
    const data = await prisma.servers.findMany({
      where: {
        owner_id,
      },
    });
    return data.map((server) => PrismaServerMapper.toDomain(server));
  }

  async get_all(): Promise<Server[]> {
    const data = await prisma.servers.findMany();
    return data.map((server) => PrismaServerMapper.toDomain(server));
  }

  async save(payload: Omit<ServerProperties, "id">): Promise<Server> {
    const data = await prisma.servers.create({
      data: {
        name: payload.name,
        owner_id: payload.owner_id,
        thumbnail: payload.thumbnail,
        banner: payload.banner,
      },
    });
    return PrismaServerMapper.toDomain(data);
  }

  async update(id: number, payload: Partial<Omit<ServerProperties, "id" | "owner_id">>): Promise<Server> {
    const data = await prisma.servers.update({
      where: { id },
      data: payload,
    });
    return PrismaServerMapper.toDomain(data);
  }

  async delete(id: number): Promise<void> {
    await prisma.servers.delete({
      where: { id },
    });
  }
}
