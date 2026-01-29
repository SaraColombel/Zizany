import type {
  Membership,
  MembershipProperties,
} from "@/domain/entities/membership";

export abstract class MembershipRepository {
  abstract find_by_id(id: number): Promise<Membership | undefined>;
  abstract get_all(): Promise<Membership[]>;
  abstract get_by_server(server_id: number): Promise<Membership[]>;
  abstract get_by_user(user_id: number): Promise<Membership[]>;
  abstract save(payload: MembershipProperties): Promise<void>;
}
