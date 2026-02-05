import { Message as DomainMessage } from "../../../../domain/entities/message.js";
import { Messages as PrismaMessage } from "@prisma/client";

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
}
