import { Server as DomainServer } from "../../../../domain/entities/server.js";
import { Servers as PrismaServer } from "@prisma/client";

export class PrismaServerMapper {
  static toDomain(prismaServer: PrismaServer): DomainServer {
    return DomainServer.create({
      id: prismaServer.id,
      name: prismaServer.name,
      owner_id: prismaServer.owner_id,
      banner: prismaServer.banner ?? undefined,
      thumbnail: prismaServer.thumbnail ?? undefined,
      isPublic: prismaServer.is_public,
    });
  }
}
