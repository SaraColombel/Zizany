import { User } from "@/domain/user/user";

export abstract class UserRepository {
  abstract find_by_email(email: String): Promise<User | undefined>;
  abstract get_all(): Promise<Set<User>>;
  abstract save(payload: User): Promise<User>;
}
