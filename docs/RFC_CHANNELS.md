# RFC: Channel Management and Messaging

Status: Draft

Authors: TBD

Created: 2026-02-05

Related docs: docs/API_CONTRACT.md, docs/SOCKET_SPEC.md, docs/TESTS.md, docs/FRONTEND.md

## 1. Summary
This RFC defines how channels are created, listed, updated, and deleted within a server, plus how messages are stored, fetched, and delivered in real time. The system is server-scoped (each channel belongs to a server), relies on session-based auth, and supports both REST and Socket.IO flows.

## 2. Motivation
We need a consistent, testable contract for channel CRUD and messaging that:
- Works across REST (initial data + mutations) and Socket.IO (real-time chat).
- Matches the UI expectations for server sidebars and chat panes.
- Ensures predictable validation and error payloads for clients and tests.

## 3. Goals
- Server-scoped channel list and channel details via REST.
- Create/rename/delete channels with validation.
- Message history via REST (ordered by time).
- Message creation via REST and Socket.IO.
- Clear event names and payloads for typing and message broadcast.

## 4. Non-goals
- Voice channels, threads, or reactions.
- Per-channel permission matrices beyond server-level roles.
- Message search, pinning, or moderation tooling.
- Rich media upload in messages.

## 5. Proposed Design

### 5.1 Channel Model
- Channels belong to a server (`server_id`).
- A default channel named `general` is created when a server is created (current implementation uses `g\u00e9n\u00e9ral`).
- Channel names are short and URL-safe (alphanumeric + `-` + `_`, max length 24).
- Deleting a channel removes its messages first, then the channel row.

### 5.2 Endpoints (HTTP)
All routes below require a valid session (`AuthMiddleware.handle`).

#### GET /api/servers/:id/channels
- Success (200):
  ```json
  {
    "channels": [
      { "props": { "id": 1, "server_id": 1, "name": "general" } }
    ]
  }
  ```
  Note: current implementation returns domain entities with `props`. Clients normalize to `{ id, server_id, name }`.

#### GET /api/channels/:id
- Success (200):
  ```json
  { "channel": { "props": { "id": 1, "server_id": 1, "name": "general" } } }
  ```

#### POST /api/servers/:id/channels
- Request body:
  ```json
  { "name": "backend" }
  ```
- Success (201):
  ```json
  { "ok": true, "channel": { "props": { "id": 2, "server_id": 1, "name": "backend" } } }
  ```
- Validation errors (422):
  ```json
  { "err": { "messages": "..." } }
  ```

#### PUT /api/servers/:id/channels/:channelId
- Request body:
  ```json
  { "name": "devops" }
  ```
- Success (200):
  ```json
  { "ok": true }
  ```
- Validation errors (422) same structure as create.

#### DELETE /api/servers/:id/channels/:channelId
- Success (200):
  ```json
  { "ok": true }
  ```
- Failure (400):
  ```json
  { "error": "Invalid channelId" }
  ```

#### GET /api/channels/:id/messages
- Success (200):
  ```json
  {
    "messages": [
      {
        "id": 10,
        "channel_id": 1,
        "content": "Hello",
        "created_at": "2026-02-02T12:00:00.000Z",
        "updated_at": "2026-02-02T12:00:00.000Z",
        "user": { "id": 2, "username": "Sara" }
      }
    ]
  }
  ```
- Ordering: `created_at` ascending.

#### POST /api/channels/:id/messages
- Request body:
  ```json
  { "content": "Hello" }
  ```
- Success (201):
  ```json
  { "ok": true }
  ```
- Failure (400):
  ```json
  { "message": "content is required" }
  ```
- Failure (401):
  ```json
  { "message": "Unauthorized" }
  ```

#### PATCH /api/channels/:channelId/messages/:messageId
- Request body:
  ```json
  { "content": "Edited" }
  ```
- Success (204): no body
- Failure (400):
  ```json
  { "message": "Invalid message id" }
  ```
- Failure (400):
  ```json
  { "message": "content is required" }
  ```

#### DELETE /api/channels/:channelId/messages/:messageId
- Success (204): no body
- Failure (400):
  ```json
  { "message": "Invalid message id" }
  ```

### 5.3 Validation Rules
- Channel name: required, alphanumeric with dashes/underscores, max length 24, no spaces.
- Message content: required non-empty string.
- IDs: numeric path params.

### 5.4 Authorization & Permissions
- All channel/message routes require a valid session cookie.
- Socket.IO enforces membership when joining a channel and when creating messages.
- REST endpoints currently do not enforce server membership or role checks; this should be added for:
  - Channel management (Owner/Admin only).
  - Message edit/delete (author or Owner/Admin).

### 5.5 Socket.IO Integration
- Rooms:
  - `server:{serverId}`
  - `channel:{channelId}`
- Key events:
  - `channel:join` -> `channel:joined`
  - `typing:start` / `typing:stop` -> `typing:update`
  - `message:create` -> broadcast `message:new`
- Errors:
  - `error:not_found` with `{ code: "E_CHANNEL_NOT_FOUND" }`
  - `error:permission` with `{ code: "E_FORBIDDEN" }`

### 5.6 Frontend Integration
- Sidebar loads channels via `GET /api/servers/:id/channels` and renders `#{name}`.
- Chat pane loads history via `GET /api/channels/:id/messages`.
- Message send uses Socket.IO when connected (`message:create`), with REST fallback.
- Typing indicators rely on `typing:update` broadcasts.

## 6. Data Model
Relevant fields in `Channels`:
- id (int, primary key)
- server_id (FK to Servers)
- name (varchar 24)
- created_at
- updated_at

Relevant fields in `Messages`:
- id (int, primary key)
- channel_id (FK to Channels)
- user_id (FK to Users)
- content
- created_at
- updated_at

## 7. Security Considerations
- All channel and message routes are behind session auth.
- REST endpoints should enforce membership and role checks to prevent unauthorized reads/edits.
- Message edit/delete currently lacks permissions; should be restricted to authors and elevated roles.
- Consider rate limiting for message creation to prevent spam.

## 8. Alternatives Considered
- Fully real-time (Socket.IO only) without REST: rejected because SSR and initial page loads need a stable history API.
- Per-channel role matrices: out of scope for this milestone.

## 9. Migration / Rollout
- Implementation already exists for channels and messages (REST + Socket.IO).
- Align docs and tests with actual response shapes (domain entities vs flat objects).
- Add missing authorization checks on REST endpoints.
- Fix serverId parsing for channel creation/update (multi-digit IDs).
