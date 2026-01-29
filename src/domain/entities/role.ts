import { Entity } from "@/domain/core/entity";

type RoleName = "Owner" | "Admin" | "Member";

interface RoleProperties {
  id: number;
  name: RoleName;
}

export class Role extends Entity<RoleProperties> {
  static create(props: RoleProperties) {
    return new this(props);
  }
}
