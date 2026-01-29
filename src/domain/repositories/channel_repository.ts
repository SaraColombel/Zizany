import type { Channel, ChannelProperties } from "@/domain/entities/channel";

export abstract class ChannelRepository {
  abstract find_by_id(id: number): Promise<Channel | undefined>;
  abstract get_all(): Promise<Channel[]>;
  abstract get_by_server(server_id: number): Promise<Channel[]>;
  abstract get_by_name(name: string): Promise<Channel[]>;
  abstract save(payload: ChannelProperties): Promise<void>;
}
