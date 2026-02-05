import type { Message, MessageProperties } from "../entities/message.js";
import type { MessageDTO } from "../dto/message_front_dto.js";

export abstract class MessageRepository {
  abstract find_by_id(id: number): Promise<Message | undefined>;
  abstract get_all(): Promise<Message[]>;
  abstract get_by_channel(channel_id: number): Promise<MessageDTO[]>;
  abstract save(payload: MessageProperties): Promise<void>;
  abstract delete(id: number): Promise<void>;
  abstract update(id: number, content: string): Promise<void>;
}
