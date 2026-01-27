import { UserRepository } from "@/domain/user/user_repository";
import { User } from "@/domain/user/user";

export class InMemoryUserRepository implements UserRepository {
  #database: Set<User>;
  constructor() {
    this.#database = new Set();
  }

  async find_by_email(email: String): Promise<User | undefined> {
    const user: User | undefined = this.#database
      .values()
      .find((user) => user.email == email);
    return user;
  }

  async get_all(): Promise<Set<User>> {
    return this.#database;
  }

  async save(payload: User): Promise<User> {
    const user = await this.find_by_email(payload.email);
    if (!user) {
      this.#database.add(payload);
      return payload;
    }
    return user;
  }
}
