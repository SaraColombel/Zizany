import { prisma } from "@/infrastructure/prisma/prisma.client";
import { Server } from "@/domain/entities/server";
import { ServerRepository } from "@/domain/repositories/server_repository";
import { PrismaServerMapper } from "@/infrastructure/prisma/mappers/prisma_server_mapper";

import type { ServerProperties } from "@/domain/entities/server";

export class PrismaServerRepository extends ServerRepository {
  async find_by_id(id: number): Promise<Server | undefined> {
    const data = await prisma.servers.findUnique({
      where: {
        id: id,
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

  async save(payload: ServerProperties): Promise<void> {
    await prisma.servers.create({
      data: {
        name: payload.name,
        owner_id: payload.owner_id,
        thumbnail: payload.thumbnail,
        banner: payload.banner,
      },
    });
    return;
  }
}
