# RFC: Socket.IO Real-Time Events

Status: Draft

Authors: TBD

Created: 2026-02-05

Related docs: docs/SOCKET_SPEC.md, docs/API_CONTRACT.md, docs/TESTS.md, docs/RFC_AUTH.md

## 1. Summary
This RFC defines the Socket.IO real-time layer used by the client and server. It specifies the connection/authentication model, room strategy, event contracts, and error handling for presence, channels, and messages.

## 2. Motivation
We need a predictable real-time contract that:
- Reuses session auth for sockets.
- Supports server and channel rooms for scoped broadcasts.
- Provides typing indicators and message delivery.
- Enables presence updates across tabs/clients.

## 3. Goals
- Session-based socket authentication.
- Clear event names and payloads for join, typing, and messaging.
- Consistent error events for permission and not-found cases.
- Presence updates tied to online sessions.

## 4. Non-goals
- WebRTC or voice channels.
- Reliability guarantees beyond Socket.IO defaults.
- End-to-end encryption.
- Server discovery or public directory.

## 5. Proposed Design

### 5.1 Connection & Auth
- Transport: Socket.IO (WebSocket).
- Session cookie (`connect.sid`) is reused during the handshake.
- If `req.session.user_id` is missing, the connection fails with `E_UNAUTHORIZED`.
- The authenticated `userId` is stored in `socket.data`.

### 5.2 Rooms
- Server room: `server:{serverId}`
- Channel room: `channel:{channelId}`
- Clients join rooms explicitly via events.

### 5.3 Client -> Server Events

#### server:join
**Payload**
```json
{ "serverId": 1 }
```
**Behavior**
- Checks membership of current user in server.
- Joins room `server:{serverId}`.
- Emits `server:joined`.
- Emits `presence:update` to the server room.

**Errors**
- `error:permission` with `{ code: "E_FORBIDDEN" }` if not a member.

#### channel:join
**Payload**
```json
{ "channelId": 1 }
```
**Behavior**
- Loads channel and its `server_id`.
- Checks membership in parent server.
- Joins room `channel:{channelId}`.
- Emits `channel:joined`.

**Errors**
- `error:not_found` with `{ code: "E_CHANNEL_NOT_FOUND" }` if channel does not exist.
- `error:permission` with `{ code: "E_FORBIDDEN" }` if not a member.

#### typing:start
**Payload**
```json
{ "channelId": 1 }
```
**Broadcast**
- Emits `typing:update` to `channel:{channelId}` (excluding sender).

#### typing:stop
**Payload**
```json
{ "channelId": 1 }
```
**Broadcast**
- Emits `typing:update` to `channel:{channelId}` (excluding sender).

#### message:create
**Payload**
```json
{ "channelId": 1, "content": "Hello" }
```
**Behavior**
- Validates non-empty content.
- Checks channel existence.
- Checks membership in channel's parent server.
- Persists message in DB.
- Broadcasts `message:new` to `channel:{channelId}` (excluding sender).

**Errors**
- `error:not_found` with `{ code: "E_CHANNEL_NOT_FOUND" }`.
- `error:permission` with `{ code: "E_FORBIDDEN" }`.

### 5.4 Server -> Client Events

#### server:joined
**Payload**
```json
{ "serverId": 1 }
```

#### channel:joined
**Payload**
```json
{ "channelId": 1 }
```

#### typing:update
**Payload**
```json
{ "channelId": 1, "userId": 2, "username": "Sara", "isTyping": true }
```

#### message:new
**Payload (MessageDTO)**
```json
{
  "id": 10,
  "channel_id": 1,
  "content": "Hello",
  "created_at": "2026-02-02T12:00:00.000Z",
  "updated_at": "2026-02-02T12:00:00.000Z",
  "user": { "id": 2, "username": "Sara" }
}
```

#### presence:update
**Payload**
```json
{ "serverId": 1, "onlineUserIds": [2, 5, 9] }
```

#### server:member_joined
**Payload**
```json
{ "serverId": 1, "userId": 2, "username": "Sara" }
```

#### server:member_left
**Payload**
```json
{ "serverId": 1, "userId": 2, "username": "Sara" }
```

### 5.5 Error Events
- `error:not_found` with `{ code: "E_CHANNEL_NOT_FOUND" }`
- `error:permission` with `{ code: "E_FORBIDDEN" }`
- Connection failure when unauthenticated: `E_UNAUTHORIZED`

## 6. Data Model
Relevant DTOs:
- MessageDTO fields: `id`, `channel_id`, `content`, `created_at`, `updated_at`, `user`.
- Presence payload uses `serverId` and `onlineUserIds`.

## 7. Security Considerations
- Session cookie is required for socket handshake.
- Membership checks are enforced for `server:join`, `channel:join`, and `message:create`.
- Typing events currently do not check membership; should be aligned with channel join/membership.
- Consider rate limiting for message creation and typing spam.

## 8. Alternatives Considered
- SSE instead of Socket.IO: rejected due to bidirectional needs (typing + message send).
- JWT-based socket auth: rejected to keep session model consistent with REST.

## 9. Migration / Rollout
- Implementation already exists in `src/backend/infrastructure/ws/socket.ts`.
- Align `docs/SOCKET_SPEC.md` with presence and member join/leave events.
- Add missing membership checks for typing events if required.
