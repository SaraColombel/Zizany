import type { Server, ServerProperties } from "@/backend/domain/entities/server";

export abstract class ServerRepository {
  abstract find_by_id(id: number): Promise<Server | undefined>;
  abstract find_by_owner_id(owner_id: number): Promise<Server[] | undefined>;
  abstract get_all(): Promise<Server[]>;
  abstract save(payload: Omit<ServerProperties, "id">): Promise<Server>;
  abstract update(id: number, payload: Partial<Omit<ServerProperties, "id" | "owner_id">>): Promise<Server>;
  abstract delete(id: number): Promise<void>;
}
