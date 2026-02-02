import { Entity } from "@/backend/domain/core/entity";

export interface ChannelProperties {
  id: number;
  server_id: number;
  name: string;
}

export class Channel extends Entity<ChannelProperties> {
  static create(props: ChannelProperties) {
    return new this(props);
  }
}
