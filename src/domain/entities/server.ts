import { Entity } from "@/domain/core/entity";

interface ServerProperties {
  id: number;
  name: string;
  owner_id: number;
  thumbnail?: string;
  banner?: string;
}

export class Server extends Entity<ServerProperties> {
  static create(props: ServerProperties) {
    return new this(props);
  }
}
