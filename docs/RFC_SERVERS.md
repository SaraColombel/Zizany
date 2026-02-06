# RFC: Server Management

Status: Draft

Authors: TBD

Created: 2026-02-05

Related docs: docs/API_CONTRACT.md, docs/SOCKET_SPEC.md, docs/TESTS.md, docs/FRONTEND.md

## 1. Summary
This RFC defines how servers are created, listed, updated, and deleted, including ownership rules, public/private visibility, and computed fields used by the frontend. Servers are session-authenticated and include membership-aware metadata (member counts, online counts, and role flags).

## 2. Motivation
We need a consistent server contract that:
- Powers the server list UI with membership and online counts.
- Supports CRUD with ownership enforcement.
- Creates the required default channel and owner membership on creation.
- Is easy to test and reason about.

## 3. Goals
- REST endpoints for server list, details, create, update, delete.
- Ownership and permission checks for sensitive actions.
- Standardized response payloads for frontend rendering.
- Safe cascade deletion of server data.

## 4. Non-goals
- Server invitation flows (covered in RFC_MEMBERSHIPS).
- Advanced moderation or audit logs.
- Server settings beyond name/thumbnail/banner.

## 5. Proposed Design

### 5.1 Server Model
- Servers have an owner (`owner_id`) and basic metadata (`name`, `thumbnail`, `banner`).
- Servers can be public or private via `isPublic` (default: `false`).
- Creating a server also creates:
  - A default channel (current implementation uses `general`).
  - An owner membership for the creator.

### 5.2 Endpoints (HTTP)
All routes below require a valid session (`AuthMiddleware.handle`).

#### GET /api/servers
- Success (200):
  ```json
  {
    "servers": [
      {
        "id": 1,
        "name": "Acme",
        "thumbnail": null,
        "banner": null,
        "isPublic": true,
        "members": 12,
        "onlineMembers": 5,
        "isMember": true,
        "canLeave": false,
        "currentUserRoleId": 1
      }
    ]
  }
  ```
- Failure (401):
  ```json
  { "error": "Unauthorized" }
  ```
- Notes:
  - Current implementation returns **public servers + servers the user has joined**.
  - `canLeave` is false when the current user is Owner.

#### GET /api/servers/:id
- Success (200):
  ```json
  {
    "server": { "props": { "id": 1, "name": "Acme", "owner_id": 2 } },
    "membership": [ ... ],
    "isAdmin": false,
    "isOwner": true,
    "currentUserId": 2,
    "currentUserName": "Sara"
  }
  ```

#### POST /api/servers
- Request body:
  ```json
  { "name": "Acme", "thumbnail": null, "banner": null }
  ```
- Success (201):
  ```json
  { "message": "Server created successfully", "server_id": 1 }
  ```
- Failure (400):
  ```json
  { "message": "name is required" }
  ```
- Failure (401):
  ```json
  { "message": "Unauthorized" }
  ```

#### PUT /api/servers/:id
- Request body (partial updates allowed):
  ```json
  { "name": "New name", "thumbnail": null, "banner": null, "isPublic": true }
  ```
- Success (200):
  ```json
  { "server": { "props": { "id": 1, "name": "New name", "owner_id": 2 } } }
  ```
- Failure (400):
  ```json
  { "message": "Invalid server id" }
  ```
- Failure (404):
  ```json
  { "message": "Server not found" }
  ```
- Failure (403):
  ```json
  { "message": "Only owner can update server" }
  ```

#### DELETE /api/servers/:id
- Success (204): no body
- Failure (400):
  ```json
  { "message": "Invalid server id" }
  ```
- Failure (404):
  ```json
  { "message": "Server not found" }
  ```
- Failure (403):
  ```json
  { "message": "Only owner can delete server" }
  ```

### 5.3 Validation Rules
- `name`: required string on creation.
- `thumbnail` / `banner`: optional, string or null.
- `serverId`: numeric path param.

### 5.4 Authorization & Permissions
- All server endpoints require an authenticated session.
- Only Owners can update or delete a server.
- Role checks are computed using memberships (`role_id`).

### 5.5 Presence and Counts
- The list endpoint computes:
  - Total member counts per server.
  - Online member counts using the presence store.
- Presence updates are driven by Socket.IO connections.

### 5.6 Frontend Integration
- Server list uses `GET /api/servers` for sidebar and membership metadata.
- Server detail view uses `GET /api/servers/:id` for role flags and SSR routing logic.
- Server creation UI relies on `POST /api/servers` and then redirects to the default channel.

## 6. Data Model
Relevant fields in `Servers`:
- id (int, primary key)
- name
- owner_id (FK to Users)
- thumbnail (nullable)
- banner (nullable)
- is_public (boolean, default false) in DB
- created_at
- updated_at

Relevant fields in `Memberships`:
- user_id
- server_id
- role_id

## 7. Security Considerations
- Ownership checks protect update/delete endpoints.
- Server list is scoped to public servers and joined servers to avoid exposing private metadata.
- Cascade delete removes channels, messages, and memberships.

## 8. Alternatives Considered
- Filtering server list to joined servers only (excluding public): not chosen because public discovery is required.
- Soft-delete instead of hard delete: out of scope.

## 9. Migration / Rollout
- Implementation already exists in the backend.
- Align docs/tests with current payload shapes (domain entities with `props`).
- Consider adding validation rules for server names (length, allowed characters).
