import { Server as DomainServer } from "@/backend/domain/entities/server";
import { Servers as PrismaServer } from "@/../generated/prisma/client";

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
