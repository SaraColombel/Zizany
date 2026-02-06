import { Membership as DomainMembership } from "../../../../domain/entities/membership.js";
import { Memberships as PrismaMembership } from "@prisma/client";

export class PrismaMembershipMapper {
  static toDomain(prismaMembership: PrismaMembership): DomainMembership {
    return DomainMembership.create({
      id: prismaMembership.id,
      role_id: prismaMembership.role_id,
      server_id: prismaMembership.server_id,
      user_id: prismaMembership.user_id,

    });
  }
}
