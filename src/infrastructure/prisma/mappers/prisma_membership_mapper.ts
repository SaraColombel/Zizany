import { Membership as DomainMembership } from "@/domain/entities/membership";
import { Memberships as PrismaMembership } from "@/../generated/prisma/client";

export class PrismaMembershipMapper {
  static toDomain(prismaMembership: PrismaMembership): DomainMembership {
    return DomainMembership.create({
      id: prismaMembership.id,
      roleId: prismaMembership.role_id,
      server_id: prismaMembership.server_id,
      user_id: prismaMembership.user_id,
    });
  }
}
