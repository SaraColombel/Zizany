import { prisma } from "@/infrastructure/prisma/prisma.client";
import { Membership } from "@/domain/entities/membership";
import { MembershipRepository } from "@/domain/repositories/membership_repository";
import { PrismaMembershipMapper } from "@/infrastructure/prisma/mappers/prisma_membership_mapper";

import type { MembershipProperties } from "@/domain/entities/membership";

export class PrismaMembershipRepository extends MembershipRepository {
  async find_by_id(id: number): Promise<Membership | undefined> {
    const data = await prisma.memberships.findUnique({
      where: {
        id,
      },
    });
    if (!data) return undefined;
    return PrismaMembershipMapper.toDomain(data);
  }

  async get_all(): Promise<Membership[]> {
    const data = await prisma.memberships.findMany();
    return data.map((membership) =>
      PrismaMembershipMapper.toDomain(membership),
    );
  }

  async get_by_server_id(server_id: number): Promise<Membership[]> {
    const data = await prisma.memberships.findMany({
      where: {
        server_id,
      },
    });
    return data.map((membership) =>
      PrismaMembershipMapper.toDomain(membership),
    );
  }

  async get_by_user_id(user_id: number): Promise<Membership[]> {
    const data = await prisma.memberships.findMany({
      where: {
        user_id,
      },
    });
    return data.map((membership) =>
      PrismaMembershipMapper.toDomain(membership),
    );
  }

  async save(payload: MembershipProperties): Promise<void> {
    await prisma.memberships.create({
      data: {
        user_id: payload.user_id,
        server_id: payload.server_id,
        role_id: payload.role_id,
      },
    });
    return;
  }
}
