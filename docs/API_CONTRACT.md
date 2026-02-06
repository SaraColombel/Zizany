# API Contract — Zizany

This document defines the REST API exposed by the Zizany backend.
All endpoints require an authenticated session unless stated otherwise.

Base URL: `/api`

---

## Authentication

### POST /auth/signup
Create a new user account.

**Body**
```json
{ "email": "user@example.com", "password": "string", "username": "string" }
```

**Responses**
- `200 OK`
- `401` Email already used
- `422` Invalid payload

### POST /auth/login
Authenticate a user and start a session

**Body**
```json
{ "email": "user@example.com", "password": "string" }
```

**Responses**
- `200 OK` (session cookie set)
- `401 Unauthorized`
- `422` Invalid payload

### POST /auth/logout
Destroy the current session

**Responses**
- `200 OK`
- `401 Unauthorized`

### GET /auth/me
Retrieve the currently authenticated user.

**Responses**
- `200 OK`
```json
{ "id": 1, "email": "user@example.com", "username": "user" }
```
- `401 Unauthorized`

## Servers

### GET /servers
List servers the user belongs to.

**Responses**
- `200 OK`
- `401 Unauthorized`

### POST /servers
Create a new server.
The creator automatically becomes Owner.

**Body**
```json
{ "name": "My Server", "isPublic": true }
```

**Responses**
- `201 Created`
- `400` Missing name
- `401 Unauthorized`

### GET /servers/:id
Retrieve server details and membership flags.

**Responses**
- `200 OK`
- `404 Not found`
- `401 Unauthorized`

### PUT /servers/:id
Update a server (Owner only).

**Responses**
- `200 OK`
- `403 Forbidden`
- `404 Not found`

### DELETE /servers/:id
Delete a server (Owner only).

**Responses**
- `204 No Content`
- `403 Forbidden`
- `404 Not found`

### POST /servers/:id/join
Join a server (public or via invitation)

**Responses**
- `201 Created`
- `403 Forbidden`
- `404 Not found`
- `409 Already a member`

### DELETE /servers/:id/leave
Leave a server (Owner cannot leave).

**Responses**
- `204 No Content`
- `403 Forbidden`

### GET /servers/:id/members
List server members

**Responses**
- `200 OK`
- `400 Invalid id`
- `401 Unauthorized`

### PUT /servers/:id/members/:userId
Update a member role (Owner only)

**Responses**
- `204 No Content`
- `403 Forbidden`

## Channels

### GET /servers/:id/channels
List channels of a server

**Responses**
- `200 OK`
- `401 Unauthorized`

### POST /servers/:id/channels
Create a channel (Admin+)

**Responses**
-  `201 Created`
- `422 Invalid payload`
- `403 Forbidden`

### PUT /servers/:id/channels/:channelId
Update a channel (Admin+).

**Responses**
- `200 OK`
- `422 Invalid payload`
- `403 Forbidden`

### DELETE /servers/:id/channels/:channelId
Delete a channel (Admin+).

**Responses**
- `200 OK`
- `403 Forbidden`

## Messages

### GET /channels/:id/messages
Retrieve message history for a channel.

**Responses**
- `200 OK`
- `401 Unauthorized`

### POST /channels/:id/messages
Create a message.

**Body**
```json
{ "content": "Hello" }
```

**Responses**
- `201 Created`
- `400 Missing content`
- `401 Unauthorized`
- `403 Forbidden`

### PATCH /channels/:channelId/messages/:messageId
Update a message.

**Responses**
- `204 No Content`
- `403 Forbidden`

### DELETE /channels/:channelId/messages/:messageId
Delete a message

**Responses**
- `204 No Content`
- `403 Forbidden`

## Real-Time
All real-time events are documented in:
- `docs/SOCKET_SPEC.md`