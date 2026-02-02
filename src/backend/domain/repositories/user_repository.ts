import type { User, UserProperties } from "@/backend/domain/entities/user";

export abstract class UserRepository {
  abstract find_by_email(email: string): Promise<User | undefined>;
  abstract find_by_id(id: number): Promise<User | undefined>;
  abstract get_all(): Promise<User[]>;
  abstract save(payload: UserProperties): Promise<void>;
  abstract verify_password(userId: number, password: string): Promise<boolean>;
}
