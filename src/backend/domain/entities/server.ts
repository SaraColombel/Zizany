import { Entity } from "../core/entity.js";
import { Membership } from "./membership.js";

export interface ServerProperties {
  id: number;
  name: string;
  owner_id: number;
  thumbnail?: string;
  banner?: string;
  isPublic?: boolean;
}

export class Server extends Entity<ServerProperties> {
  static create(props: ServerProperties) {
    return new this(props);
  }

  isAdmin(membership: Membership[], serverId: number, userId: number): boolean {
    return membership.some(
      (m) =>
        m.props.server_id === serverId &&
        m.props.user_id === userId &&
        m.props.role_id === 2,
    );
  }

  isOwner(membership: Membership[], serverId: number, userId: number): boolean {
    return membership.some(
      (m) =>
        m.props.server_id === serverId &&
        m.props.user_id === userId &&
        m.props.role_id === 1,
    );
  }
}
