# RFC: Server Memberships and Roles

Status: Draft

Authors: TBD

Created: 2026-02-05

Related docs: docs/API_CONTRACT.md, docs/SOCKET_SPEC.md, docs/TESTS.md, docs/FRONTEND.md

## 1. Summary
This RFC defines how users join/leave servers, how memberships are listed, and how roles are managed. Memberships are server-scoped, session-authenticated, and expose a minimal role model (Owner/Admin/Member).

## 2. Motivation
We need a consistent membership contract that:
- Lets users join or leave servers safely.
- Exposes a predictable member list for UI rendering.
- Enforces server ownership and role updates.
- Emits real-time signals when members join/leave.

## 3. Goals
- Create and delete memberships via REST.
- List server members with role and basic user info.
- Allow owners to update member roles (including ownership transfer).
- Broadcast join/leave over Socket.IO for presence updates.

## 4. Non-goals
- Invite codes or approval flows.
- Per-channel memberships or permissions.
- Fine-grained role permissions beyond Owner/Admin/Member.
- Bans, kicks, or audit logs.

## 5. Proposed Design

### 5.1 Membership Model
- A membership links a `user_id` to a `server_id` with a `role_id`.
- Role IDs are currently fixed in code:
  - Owner = 1
  - Admin = 2
  - Member = 3
- Owners cannot leave their server; they must delete it or transfer ownership.

### 5.2 Endpoints (HTTP)
All routes below require a valid session (`AuthMiddleware.handle`).

#### GET /api/servers/:id/members
- Success (200):
  ```json
  {
    "members": [
      {
        "id": 12,
        "user_id": 2,
        "server_id": 1,
        "role_id": 3,
        "user": { "id": 2, "username": "user", "thumbnail": null },
        "role": { "id": 3, "name": "Member" }
      }
    ]
  }
  ```
- Failure (400):
  ```json
  { "error": "Invalid serverId" }
  ```

#### POST /api/servers/:id/join
- Success (201):
  ```json
  { "ok": true }
  ```
- Failure (400):
  ```json
  { "message": "Invalid server id" }
  ```
- Failure (404):
  ```json
  { "message": "Server not found" }
  ```
- Failure (409):
  ```json
  { "message": "Already a member" }
  ```

#### DELETE /api/servers/:id/leave
- Success (204): no body
- Failure (400):
  ```json
  { "message": "Invalid server id" }
  ```
- Failure (404):
  ```json
  { "message": "Membership not found" }
  ```
- Failure (403):
  ```json
  { "message": "Owner cannot leave server (delete it instead)" }
  ```

#### PUT /api/servers/:id/members/:userId
- Request body:
  ```json
  { "role_id": 2 }
  ```
- Success (204): no body
- Failure (400):
  ```json
  { "message": "Invalid serverId or userId" }
  ```
  or
  ```json
  { "message": "Invalid role_id" }
  ```
- Failure (403):
  ```json
  { "message": "Not a member of this server" }
  ```
  or
  ```json
  { "message": "Only owner can update roles" }
  ```
  or
  ```json
  { "message": "Cannot change owner role" }
  ```
- Failure (404):
  ```json
  { "message": "Target membership not found" }
  ```

### 5.3 Validation Rules
- `serverId`, `userId`, and `role_id` must be numeric.
- `role_id` must be one of `1, 2, 3`.
- Memberships are unique per `(user_id, server_id)`.

### 5.4 Authorization & Permissions
- All membership routes require a valid session cookie.
- `POST /join` is open to any authenticated user if the server exists.
- `DELETE /leave` is blocked for Owner role.
- `PUT /members/:userId` is Owner-only.
- Ownership transfer is allowed by setting another member to `role_id = 1`; the caller is downgraded to Member.

### 5.5 Socket.IO Integration
- On successful join, the server emits:
  - `server:member_joined` to room `server:{serverId}` with payload:
    ```json
    { "serverId": 1, "userId": 2, "username": "user" }
    ```
- On successful leave, the server emits:
  - `server:member_left` to room `server:{serverId}` with payload:
    ```json
    { "serverId": 1, "userId": 2, "username": "user" }
    ```

### 5.6 Frontend Integration
- Members list uses `GET /api/servers/:id/members` for roles and avatars.
- Join/leave buttons call the respective endpoints and rely on socket events for live updates.
- Role management UI (Owner only) sends `PUT /api/servers/:id/members/:userId`.

## 6. Data Model
Relevant fields in `Memberships`:
- id (int, primary key)
- user_id (FK to Users)
- server_id (FK to Servers)
- role_id (FK to Roles)
- created_at
- updated_at

Relevant fields in `Roles`:
- id (int, primary key)
- name (unique)

## 7. Security Considerations
- Role changes are Owner-only and validated server-side.
- Owners are prevented from leaving to avoid orphaned servers.
- Joining/leaving should be rate-limited to avoid abuse.
- Consider adding invite/approval flows in the future to prevent open joins.

## 8. Alternatives Considered
- Invite-only memberships: out of scope for the current milestone.
- Role-based permissions per channel: deferred to a future RFC.

## 9. Migration / Rollout
- Implementation already exists for join/leave/role update and member listing.
- Add missing docs for `server:member_joined` / `server:member_left` in `docs/SOCKET_SPEC.md`.
- Align frontend role names with the `Roles` table values.
