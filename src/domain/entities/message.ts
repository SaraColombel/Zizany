import { Entity } from "@/domain/core/entity";

export interface MessageProperties {
  id: number;
  channel_id: number;
  user_id: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export class Message extends Entity<MessageProperties> {
  static create(props: MessageProperties) {
    return new this(props);
  }
}
