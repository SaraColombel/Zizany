import { Channel as DomainChannel } from "../../../..//domain/entities/channel.js";
import { Channels as PrismaChannel } from "@prisma/client";

export class PrismaChannelMapper {
  static toDomain(prismaChannel: PrismaChannel): DomainChannel {
    return DomainChannel.create({
      id: prismaChannel.id,
      name: prismaChannel.name,
      server_id: prismaChannel.server_id,
    });
  }
}
