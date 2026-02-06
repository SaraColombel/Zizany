import { Entity } from "../core/entity.js";

export type RoleName = "Owner" | "Admin" | "Member";

export interface RoleProperties {
  id: number;
  name: RoleName;
}

export class Role extends Entity<RoleProperties> {
  static create(props: RoleProperties) {
    return new this(props);
  }
}
