import { prisma } from "../../../persistence/prisma/prisma.client.js";
import { Membership } from "../../../../domain/entities/membership.js";
import { MembershipRepository } from "../../../../domain/repositories/membership_repository.js";
import { PrismaMembershipMapper } from "../../../persistence/prisma/mappers/prisma_membership_mapper.js";

import type { MembershipProperties } from "../../../../domain/entities/membership.js";

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

  async find_by_user_and_server(
    user_id: number,
    server_id: number,
  ): Promise<Membership | undefined> {
    const data = await prisma.memberships.findFirst({
      where: { user_id, server_id },
    });
    if (!data) {
      return undefined;
    } else {
      return PrismaMembershipMapper.toDomain(data);
    }
  }

  async delete_by_user_and_server(
    user_id: number,
    server_id: number,
  ): Promise<void> {
    await prisma.memberships.deleteMany({
      where: { user_id, server_id },
    });
  }

  async update_role(
    user_id: number,
    server_id: number,
    role_id: number,
  ): Promise<void> {
    await prisma.memberships.updateMany({
      where: { user_id, server_id },
      data: { role_id },
    });
  }
}
