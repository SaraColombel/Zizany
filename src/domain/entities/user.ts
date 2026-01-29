import { Entity } from "@/domain/core/entity";

export interface UserProperties {
  id: number;
  email: string;
  password: string;
  username: string;
  thumnail?: string;
}

export class User extends Entity<UserProperties> {
  static create(props: UserProperties) {
    return new this(props);
  }
}
