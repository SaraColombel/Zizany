import type { Channel, ChannelProperties } from "@/backend/domain/entities/channel";

export abstract class ChannelRepository {
  abstract find_by_id(id: number): Promise<Channel | undefined>;
  abstract get_all(): Promise<Channel[]>;
  abstract get_by_server_id(server_id: number): Promise<Channel[]>;
  abstract get_by_name(name: string): Promise<Channel | undefined>;
  abstract save(payload: ChannelProperties): Promise<Channel>;
}
