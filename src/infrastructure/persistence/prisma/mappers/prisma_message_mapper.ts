import { Message as DomainMessage } from "@/domain/entities/message";
import { Messages as PrismaMessage } from "@/../generated/prisma/client";
import type { MessageDTO } from "@/domain/dto/message_front_dto";

export class PrismaMessageMapper {
  static toDomain(prismaMessage: PrismaMessage): DomainMessage {
    return DomainMessage.create({
      id: prismaMessage.id,
      channel_id: prismaMessage.channel_id,
      user_id: prismaMessage.user_id,
      content: prismaMessage.content,
      created_at: prismaMessage.created_at.toDateString(),
      updated_at: prismaMessage.updated_at.toDateString(),
    });
  }

  // static toFront(prismaMessage: PrismaMessage): MessageDTO {
  //   return {
  //     id: prismaMessage.id,
  //     channel_id: prismaMessage.channel_id,
  //     content: prismaMessage.content,
  //     created_at: prismaMessage.created_at.toDateString(),
  //     updated_at: prismaMessage.updated_at.toDateString(),
  //     author: {
  //       id: prismaMessage.user_id,
  //       username: prismaMessage.user?.username || "Unknown User",
  //     },
  //   }
  // }
}
