import { UserRepository } from "@/domain/user/user_repository";
import { User, UserProperties } from "@/domain/user/user";

export class InMemoryUserRepository implements UserRepository {
  #database: Set<User>;
  constructor() {
    this.#database = new Set();
  }

  async find_by_email(email: String): Promise<User | undefined> {
    return this.#database.values().find((user) => user.props.email === email);
  }

  async get_all(): Promise<User[]> {
    return [...this.#database];
  }

  async save(payload: UserProperties): Promise<void> {
    this.#database.add(User.create(payload));
  }
}
