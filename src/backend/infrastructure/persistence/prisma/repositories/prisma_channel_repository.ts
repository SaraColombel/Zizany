import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { Channel } from "@/backend/domain/entities/channel";
import { ChannelRepository } from "@/backend/domain/repositories/channel_repository";
import { PrismaChannelMapper } from "@/backend/infrastructure/persistence/prisma/mappers/prisma_channel_mapper";

import type { ChannelProperties } from "@/backend/domain/entities/channel";

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

  async save(payload: Omit<ChannelProperties, "id">): Promise<Channel> {
    const data = await prisma.channels.create({
      data: {
        name: payload.name,
        server_id: payload.server_id,
      },
    });
    return PrismaChannelMapper.toDomain(data);
  }

  async update(id: number, payload: Partial<ChannelProperties>) {
    await prisma.channels.update({
      where: {
        id,
      },
      data: {
        name: payload.name,
        server_id: payload.server_id,
      },
    });
  }

  async delete(id: number) {
    // First delete all messages belonging to this channel to satisfy FK constraints
    await prisma.messages.deleteMany({
      where: {
        channel_id: id,
      },
    });

    await prisma.channels.delete({
      where: {
        id,
      },
    });
  }
}
