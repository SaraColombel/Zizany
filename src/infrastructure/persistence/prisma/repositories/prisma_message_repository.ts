import { prisma } from "@/infrastructure/persistence/prisma/prisma.client";
import { Message } from "@/domain/entities/message";
import { MessageRepository } from "@/domain/repositories/message_repository";
import { PrismaMessageMapper } from "@/infrastructure/persistence/prisma/mappers/prisma_message_mapper";

import type { MessageProperties } from "@/domain/entities/message";

export class PrismaMessageRepository extends MessageRepository {
  async find_by_id(id: number): Promise<Message | undefined> {
    const data = await prisma.messages.findUnique({
      where: { id },
    });
    return data ? PrismaMessageMapper.toDomain(data) : undefined;
  }

  async get_all(): Promise<Message[]> {
    const data = await prisma.messages.findMany();
    return data.map((msg) => PrismaMessageMapper.toDomain(msg));
  }

  async get_by_channel(channel_id: number): Promise<Message[]> {
    const data = await prisma.messages.findMany({
      where: { channel_id },
    });
    return data.map((msg) => PrismaMessageMapper.toDomain(msg));
  }

  async save(payload: MessageProperties): Promise<void> {
    await prisma.messages.create({
      data: {
        id: payload.id,
        channel_id: payload.channel_id,
        user_id: payload.user_id,
        content: payload.content,
      },
    });
  }
}
