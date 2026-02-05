import { prisma } from "../../../persistence/prisma/prisma.client.js";
import { Message } from "../../../../domain/entities/message.js";
import { MessageRepository } from "../../../../domain/repositories/message_repository.js";
import { PrismaMessageMapper } from "../../../persistence/prisma/mappers/prisma_message_mapper.js";
import type { MessageDTO } from "../../../../domain/dto/message_front_dto.js";

import type { MessageProperties } from "../../../../domain/entities/message.js";

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
      include: { user: { select: { id: true, username: true } } },
    });
  }

  async createAndReturn(
    payload: Omit<MessageProperties, "id" | "created_at" | "updated_at">,
  ): Promise<MessageDTO> {
    const created = await prisma.messages.create({
      data: {
        channel_id: payload.channel_id,
        user_id: payload.user_id,
        content: payload.content,
      },
      include: { user: { select: { id: true, username: true } } },
    });

    return {
      id: created.id,
      channel_id: created.channel_id,
      content: created.content,
      created_at: created.created_at.toISOString(),
      updated_at: created.updated_at.toISOString(),
      user: { id: created.user.id, username: created.user.username },
    };
  }

  // return deleted message (so controller can know channel_id)
  async deleteAndReturn(id: number): Promise<MessageDTO | null> {
    const msg = await prisma.messages.findUnique({
      where: { id },
      include: { user: { select: { id: true, username: true } } },
    });
    if (!msg) return null;

    await prisma.messages.delete({ where: { id } });

    return {
      id: msg.id,
      channel_id: msg.channel_id,
      content: msg.content,
      created_at: msg.created_at.toISOString(),
      updated_at: msg.updated_at.toISOString(),
      user: { id: msg.user.id, username: msg.user.username },
    };
  }

  // return updated DTO
  async updateAndReturn(id: number, content: string): Promise<MessageDTO | null> {
    const updated = await prisma.messages.update({
      where: { id },
      data: { content },
      include: { user: { select: { id: true, username: true } } },
    });

    return {
      id: updated.id,
      channel_id: updated.channel_id,
      content: updated.content,
      created_at: updated.created_at.toISOString(),
      updated_at: updated.updated_at.toISOString(),
      user: { id: updated.user.id, username: updated.user.username },
    };
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
