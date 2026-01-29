import { prisma } from "@/infrastructure/persistence/prisma/prisma.client";
import { Channel } from "@/domain/entities/channel";
import { ChannelRepository } from "@/domain/repositories/channel_repository";
import { PrismaChannelMapper } from "@/infrastructure/persistence/prisma/mappers/prisma_channel_mapper";

import type { ChannelProperties } from "@/domain/entities/channel";

export class PrismaChannelRepository extends ChannelRepository {
  async find_by_id(id: number): Promise<Channel | undefined> {
    const data = await prisma.channels.findUnique({
      where: {
        id,
      },
    });
    return data ? PrismaChannelMapper.toDomain(data) : undefined;
  }

  async get_all(): Promise<Channel[]> {
    const data = await prisma.channels.findMany();
    return data.map((chan) => PrismaChannelMapper.toDomain(chan));
  }

  async get_by_name(name: string): Promise<Channel | undefined> {
    const data = await prisma.channels.findFirst({
      where: {
        name,
      },
    });
    return data ? PrismaChannelMapper.toDomain(data) : undefined;
  }

  async get_by_server_id(server_id: number): Promise<Channel[]> {
    const data = await prisma.channels.findMany({
      where: {
        server_id,
      },
    });
    return data.map((chan) => PrismaChannelMapper.toDomain(chan));
  }

  async save(payload: ChannelProperties): Promise<void> {
    await prisma.channels.create({
      data: {
        name: payload.name,
        server_id: payload.server_id,
      },
    });
  }
}
