import type { Server, ServerProperties } from "@/domain/entities/server";

export abstract class ServerRepository {
  abstract find_by_id(id: number): Promise<Server | undefined>;
  abstract get_all(): Promise<Server[]>;
  abstract get_by_owner(owner_id: number): Promise<Server[] | undefined>;
  abstract save(payload: ServerProperties): Promise<void>;
}
