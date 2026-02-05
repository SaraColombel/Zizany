import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";
import { Message } from "@/backend/domain/entities/message";
import { MessageRepository } from "@/backend/domain/repositories/message_repository";
import { PrismaMessageMapper } from "@/backend/infrastructure/persistence/prisma/mappers/prisma_message_mapper";
import type { MessageDTO } from "@/backend/domain/dto/message_front_dto";

import type { MessageProperties } from "@/backend/domain/entities/message";

export class PrismaMessageRepository extends MessageRepository {
  async find_by_id(id: number): Promise<Message | undefined> {
    const data = await prisma.messages.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return data ? PrismaMessageMapper.toDomain(data) : undefined;
  }

  async get_all(): Promise<Message[]> {
    const data = await prisma.messages.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    return data.map((msg) => PrismaMessageMapper.toDomain(msg));
  }

  async get_by_channel(channel_id: number): Promise<MessageDTO[]> {
    const data = await prisma.messages.findMany({
      where: { channel_id },
      orderBy: { created_at: "asc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
    return data.map((msg) => ({
      id: msg.id,
      channel_id: msg.channel_id,
      content: msg.content,
      created_at: msg.created_at.toISOString(),
      updated_at: msg.updated_at.toISOString(),
      user: {
        id: msg.user.id,
        username: msg.user.username,
      },
    }));
  }

  async save(
    payload: Omit<MessageProperties, "id" | "created_at" | "updated_at">,
  ): Promise<void> {
    await prisma.messages.create({
      data: {
        channel_id: payload.channel_id,
        user_id: payload.user_id,
        content: payload.content,
      },
    });
  }

  async delete(id: number): Promise<void> {
    await prisma.messages.delete({
      where: { id },
    });
  }

  async update(id: number, content: string): Promise<void> {
    await prisma.messages.update({
      where: { id },
      data: { content },
    });
  }
}
