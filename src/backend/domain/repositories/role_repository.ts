import type { Role, RoleName, RoleProperties } from "@/backend/domain/entities/role";

export abstract class RoleRepository {
  abstract find_by_id(id: number): Promise<Role | undefined>;
  abstract get_all(): Promise<Role[]>;
  abstract get_by_name(name: RoleName): Promise<Role>;
  abstract save(payload: RoleProperties): Promise<void>;
}
