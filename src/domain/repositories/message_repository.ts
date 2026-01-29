import type { Message, MessageProperties } from "@/domain/entities/message";

export abstract class MessageRepository {
  abstract find_by_id(id: number): Promise<Message | undefined>;
  abstract get_all(): Promise<Message[]>;
  abstract get_by_channel(channel_id: number): Promise<Message[]>;
  abstract save(payload: MessageProperties): Promise<void>;
}
