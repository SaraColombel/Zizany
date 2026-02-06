# Socket Specification — Zizany

## 1. Purpose
This document defines the **authoritative contract** for all real-time events exchanged
between the client and server using Socket.IO.

It describes:
- connection and authentication rules
- room strategy
- event names and payloads
- error handling
- presence and typing behavior

---

## 2. Connection

- Transport: Socket.IO (WebSocket)
- Base URL: http://localhost:4000
- Path: `/socket.io`

The socket server shares the same session system as the REST API.

---

## 3. Authentication

- Mechanism: **session cookie** (`connect.sid`)
- During the Socket.IO handshake, the server reads `req.session.user_id`
- If missing or invalid, the connection is rejected

**Error**
- `E_UNAUTHORIZED` (connection refused)

---

## 4. Rooms Strategy

Socket.IO rooms are used to scope broadcasts.

- **Server room**: `server:{serverId}`
- **Channel room**: `channel:{channelId}`

Clients must explicitly join rooms using socket events.

---

## 5. Client → Server Events

### 5.1 `server:join`

**Payload**
```json
{ "serverId": 1 }
```

**Behavior**
- Checks membership of the current user in the server
- Joins room `server:{serverId}`
- Emits `server:joined`
- Triggers presence update

**Errors**
- `error:permission` -> `{ "code": "E_FORBIDDEN" }`

### 5.2 `channel:join`

**Payload**
```json
{ "channelId": 1 }
```

**Behavior**
- Loads channel and its parent server
- Checks server membership
- Joins room `channel:{channelId}`
- Emits `channel:joined`

**Errors**
- `error:not_found` -> `{ "code": "E_CHANNEL_NOT_FOUND" }`
- `error:permission` -> `{ "code": "E_FORBIDDEN" }`

### 5.3 `typing:start`

**Payload**
```json
{ "channelId": 1 }
```

**Broadcast**
- Emits `typing:update` to `channel:{channelId}` (excluding sender)

### 5.4 `typing:stop`

**Payload**
```json
{ "channelId": 1 }
```

**Broadcast**
- Emits `typing:update` to `channel:{channelId}` (excluding sender)

### 5.5 `message:create`

**Payload**
```json
{ "channelId": 1, "content": "Hello" }
```

**Behavior**
- Validates non-empty content
- Checks channel existence
- Checks membership in channel's server
- Perists message in database
- Broadcasts `message:new` to `channel:{channelId}`

**Errors**
- `error:not_found` -> `{ "code": "E_CHANNEL_NOT_FOUND" }`
- `error:permission` -> `{ "code": "E_FORBIDDEN" }`

## 6. Server -> Client Events

### 6.1 `server:joined`
```json
{ "serverId": 1 }
```

### 6.2 `channel:joined`
```json
{ "channelId": 1 }
```

### 6.3 `typing:update`
```json
{
  "channelId": 1,
  "userId": 2,
  "username": "Sara",
  "isTyping": true
}
```

### 6.4 `message:new`
```json
{
  "id": 10,
  "channel_id": 1,
  "content": "Hello",
  "created_at": "2026-02-02T12:00:00.000Z",
  "updated_at": "2026-02-02T12:00:00.000Z",
  "user": {
    "id": 2,
    "username": "Sara"
  }
}
```

### 6.5 `presence:update`
```json
{
  "serverId": 1,
  "onlineUserIds": [2, 5, 9]
}
```

### 6.6 `server:member_joined`
```json
{
  "serverId": 1,
  "userId": 2,
  "username": "Sara"
}
```

### 6.7 `server:member_left`
```json
{
  "serverId": 1,
  "userId": 2,
  "username": "Sara"
}
```

## 7. Error Events

### 7.1 `error:not_found`
```json
{ "code": "E_CHANNEL_NOT_FOUND" }
```

### 7.2 `error:permission`
```json
{ "code": "E_FORBIDDEN" }
```

## 8. Notes & Constraints
- Membership checks are enforced for:
    - `server:join`
    - `channel:join`
    - `message:create`
- Typing events assume the user already joined the channel
- Presence tracking is maintained server-side in memory
- Message history is loaded via REST, not sockets

## 9. Testing Checklist
- Authenticated socket connection succeeds
- Unauthenticated socket connection fails
- Room join works per server and channel
- Multi-tab broadcast works
- Presence updates reflect real connections