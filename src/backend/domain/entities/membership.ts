import { Entity } from "@/backend/domain/core/entity";

export interface MembershipProperties {
  // Utilisation des id ou des noms dans le domaine (pour les FK) ??
  id: number;
  user_id: number;
  server_id: number;
  role_id: number;
}

export class Membership extends Entity<MembershipProperties> {
  static create(props: MembershipProperties) {
    return new this(props);
  }
}
