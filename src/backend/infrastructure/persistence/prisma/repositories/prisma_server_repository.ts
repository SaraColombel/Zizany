import { prisma } from "../../../persistence/prisma/prisma.client.js";
import { Server } from "../../../../domain/entities/server.js";
import { ServerRepository } from "../../../../domain/repositories/server_repository.js";
import { PrismaServerMapper } from "../../../persistence/prisma/mappers/prisma_server_mapper.js";

import type { ServerProperties } from "../../../../domain/entities/server.js";

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
        is_public: payload.isPublic ?? undefined,
      },
    });
    return PrismaServerMapper.toDomain(data);
  }

  async update(
    id: number,
    payload: Partial<Omit<ServerProperties, "id" | "owner_id">>,
  ): Promise<Server> {
    const data = await prisma.servers.update({
      where: { id },
      data: {
        name: payload.name,
        thumbnail: payload.thumbnail,
        banner: payload.banner,
        is_public: payload.isPublic,
      },
    });
    return PrismaServerMapper.toDomain(data);
  }

  async delete(id: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.invitations.deleteMany({
        where: { server_id: id },
      });

      const channels = await tx.channels.findMany({
        where: { server_id: id },
        select: { id: true },
      });
      const channelIds = channels.map((channel) => channel.id);

      if (channelIds.length > 0) {
        await tx.messages.deleteMany({
          where: { channel_id: { in: channelIds } },
        });
      }

      await tx.channels.deleteMany({
        where: { server_id: id },
      });

      await tx.memberships.deleteMany({
        where: { server_id: id },
      });

      await tx.servers.delete({
        where: { id },
      });
    });
  }
}
