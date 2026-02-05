import { Entity } from "../core/entity.js";

export interface UserProperties {
  id: number;
  email: string;
  password: string;
  username: string;
  thumbnail?: string;
}

export class User extends Entity<UserProperties> {
  static create(props: UserProperties) {
    return new this(props);
  }
}
