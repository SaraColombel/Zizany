/*
 * InMemoryUserRepository
 * Exemple d'implémentation du UserRepository du domaine.
 */

import { UserRepository } from "@/backend/domain/repositories/user_repository";
import { User, UserProperties } from "@/backend/domain/entities/user";

export class InMemoryUserRepository implements UserRepository {
  #database: Set<User>;
  constructor() {
    this.#database = new Set();
  }

  async find_by_email(email: String): Promise<User | undefined> {
    return this.#database.values().find((user) => user.props.email === email);
  }

  async find_by_id(userId: number): Promise<User | undefined> {
    return this.#database.values().find((user) => user.props.id === userId);
  }

  async get_all(): Promise<User[]> {
    return [...this.#database];
  }

  async save(payload: UserProperties): Promise<User> {
    const user = User.create(payload);
    this.#database.add(user);
    return user;
  }

  async verify_password(userId: number, password: string): Promise<boolean> {
    const user = await this.find_by_id(userId);
    if (!user) return false;
    return user.props.password === password;
  }
}
