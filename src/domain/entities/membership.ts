import { Entity } from "@/domain/core/entity";

interface MembershipProperties {
  id: number;
  user_id: number;
  server_id: number;
  roleId: number;
  // Utilisation des id ou des noms dans le domaine ??
}

export class Membership extends Entity<MembershipProperties> {
  static create(props: MembershipProperties) {
    return new this(props);
  }
}
