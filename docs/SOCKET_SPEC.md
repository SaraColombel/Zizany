# Socket Specification - Zizany

## 1. Purpose
This document describes the real-time events used by the client and server (Socket.IO).

## 2. Connection
- Transport: Socket.IO (WebSocket)
- Base URL: http://localhost:4000
- Path: /socket.io

## 3. Authentification
- Mechanism: session cookie (connect.sid)
- Requirement: server reads `req.session.user_id` during the Socket.IO handshake
- On failure: connection rejected with `E_UNAUTHORIZED`

## 4. Rooms (namespaces)
The server uses Socket.IO rooms to broadcast events.

- Server room: `server:{serverId}`
- Channel room: `channel:{channelId}`

## 5. Client -> server events

### 5.1 server:join
**Payload**
```json
{ "serverId": 1 }
```

**Behavior**
- Checks membership of the current user in the server
- Joins room `server:{serverId}`
- Emits `server:joined`

**Errors**
- `error:permission` (`E_FORBIDDEN`) if not a member

### 5.2 channel:join
**Payload**
```json
{ "channelId": 1 }
```

**Behavior**
- Loads channel and its `server_id`
- Checks membership in the parent server
- Joins room `channel:{channelId}`
- Emits `channel:joined`

**Errors**
- `error:not_found` (`E_CHANNEL_NOT_FOUND`) if channel does not exist
- `error:permission` (`E_FORBIDDEN`) if not a member

### 5.3 typing:start
**Payload**
```json
{ "channelId": 1}
```

**Broadcast**
- Emits `typing:update` to `channel:{channelId}` (excluding sender)

### 5.4 typing:stop
**Payload**
```json
{ "channelId": 1 }
```

**Broadcast**
- Emits `typing:update` to `channel:{channelId}` (excluding sender)

### 5.5 message:create
**Payload**
```json
{ "channelId": 1, "content": "Hello" }
```

**Behavior**
- Validates non-empty content
- Checks channel existence
- Checks membership in channel's parent server
- Persists message in DB
- Broadcasts `message:new` to room `channel:{channelId}`

**Errors**
- `error:not_found` (`E_CHANNEL_NOT_FOUND`)
- `error:permission` (`E_FORBIDDEN`)

## 6. Server -> Client events

### 6.1 server:joined

**Payload**
```json
{ "serverId": 1 }
```

### 6.2 channel:joined

**Payload**
```json
{ "channelId": 1 }
```

### 6.3 typing:update

**Payload**
```json
{ "channelId": 1, "userId": 2, "isTyping": true }
```

### 6.4 message:new

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

## 7. Error events

### 7.1 error:not_found

```json
{ "code": "E_CHANNEL_NOT_FOUND" }
```

### 7.2 error:permission

```json
{ "code": "E_FORBIDDEN" }
```

## 8. Testing checklist

- Login sets a valid session cookie (connects.sid)
- Socket connection succeeds (no `E_UNAUTHORIZED`)
- Join server/channel rooms
- Multi-tab message broadcast works
- Reload shows persisted messages via REST history