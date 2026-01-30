import type { Message, MessageProperties } from "@/domain/entities/message";
import type { MessageDTO } from "@/domain/dto/message_front_dto";

export abstract class MessageRepository {
  abstract find_by_id(id: number): Promise<Message | undefined>;
  abstract get_all(): Promise<Message[]>;
  abstract get_by_channel(channel_id: number): Promise<MessageDTO[]>;
  abstract save(payload: MessageProperties): Promise<void>;
  abstract delete(id: number): Promise<void>;
}
