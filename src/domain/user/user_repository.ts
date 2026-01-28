import type { User, UserProperties } from "@/domain/user/user";

export abstract class UserRepository {
  abstract find_by_email(email: String): Promise<User | undefined>;
  abstract get_all(): Promise<User[]>;
  abstract save(payload: UserProperties): Promise<void>;
}
