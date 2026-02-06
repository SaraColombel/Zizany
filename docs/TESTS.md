# Tests (created)

This document describes the tests we created in this project, their expected outputs, and what each test validates. It also explains how to run the test suite.

These tests validate both REST API behavior and real-time Socket.IO interactions.

## How to run

- Run all tests:
  - `npm test`
- Watch mode:
  - `npm run test:watch`


## API Auth

Existing tests already in repo:
1. **POST /api/auth/login - success**
   - Output: `200`, response includes `Set-Cookie` with `connect.sid`
   - Validates successful login creates a session cookie.

2. **GET /api/auth/me - no cookie**
   - Output: `401`, body `{ code: "E_UNAUTHORIZED_ACCESS" }`
   - Validates auth guard blocks unauthenticated access.

3. **POST /api/auth/login - wrong password**
   - Output: `401`, body `{ code: "E_UNAUTHORIZED_ACCESS" }`
   - Validates invalid credentials are rejected.

4. **POST /api/auth/login - unknown email**
   - Output: `401`, body `{ code: "E_UNAUTHORIZED_ACCESS" }`
   - Validates unknown users are rejected.

5. **POST /api/auth/login - invalid payload (email)**
   - Output: `422`
   - Validates request payload validation.

6. **POST /api/auth/signup - success**
   - Output: `200`, body `{ code: "AUTHORIZED_ACCESS", user: ... }`
   - Validates account creation path.

7. **POST /api/auth/signup - email already used**
   - Output: `401`, body `{ code: "EMAIL_ALREADY_USED" }`
   - Validates uniqueness constraint on email.

8. **POST /api/auth/signup - invalid payload**
   - Output: `422`
   - Validates payload validation on signup fields.

9. **POST /api/auth/logout - success**
   - Output: `200`, body `{ code: "DISCONNECTED" }` + cookie cleared
   - Validates session destruction and cookie clearing.

10. **GET /api/auth/me - with cookie**
   - Output: `200`, body `{ id, email, username, thumbnail }`
   - Validates session-based user retrieval.


## API Servers

1. **GET /api/servers - no cookie**
   - Output: `401`
   - Validates auth guard on servers list.

2. **GET /api/servers - with cookie**
   - Output: `200`, body with fields `members/onlineMembers/isMember/canLeave/currentUserRoleId`
   - Validates computed payload and membership flags.

3. **GET /api/servers/:id**
   - Output: `200`, body `{ server, membership, isAdmin, isOwner, currentUserId }`
   - Validates server details + role flags.

4. **POST /api/servers - missing name**
   - Output: `400`, body `{ message: "name is required" }`
   - Validates payload requirements.

5. **POST /api/servers - success**
   - Output: `201`, body `{ message, server_id }`
   - Validates server creation + auto channel "général" + owner membership.

6. **PUT /api/servers/:id - invalid id**
   - Output: `400`, body `{ message: "Invalid server id" }`
   - Validates id parsing.

7. **PUT /api/servers/:id - not found**
   - Output: `404`, body `{ message: "Server not found" }`
   - Validates update on missing server.

8. **PUT /api/servers/:id - non-owner**
   - Output: `403`, body `{ message: "Only owner can update server" }`
   - Validates ownership enforcement.

9. **DELETE /api/servers/:id - non-owner**
   - Output: `403`, body `{ message: "Only owner can delete server" }`
   - Validates ownership enforcement.

10. **DELETE /api/servers/:id - owner success**
   - Output: `204`
   - Validates cascade delete (channels/messages/memberships).


## API Memberships

1. **GET /api/servers/:id/members - invalid id**
   - Output: `400`, body `{ error: "Invalid serverId" }`
   - Validates server id parsing.

2. **GET /api/servers/:id/members - success**
   - Output: `200`, body `{ members: [...] }`
   - Validates list of members.

3. **POST /api/servers/:id/join - invalid id**
   - Output: `400`, body `{ message: "Invalid server id" }`
   - Validates server id parsing.

4. **POST /api/servers/:id/join - server not found**
   - Output: `404`, body `{ message: "Server not found" }`
   - Validates join on missing server.

5. **POST /api/servers/:id/join - already member**
   - Output: `409`, body `{ message: "Already a member" }`
   - Validates membership uniqueness.

6. **POST /api/servers/:id/join - private without code**
   - Output: `403`, body `{ message: "Server is private. Invitation code required." }`
   - Validates private server restriction.

7. **POST /api/servers/:id/join - public success**
   - Output: `201`, body `{ ok: true, membership, server }`
   - Validates join creation and side-effects.

8. **POST /api/servers/:id/invites - non admin**
   - Output: `403`, body `{ message: "Only owner or admin can create invites" }`
   - Validates invite authorization.

9. **POST /api/servers/:id/invites - owner/admin success**
   - Output: `201`, body `{ code, server_id, expires_at }`
   - Validates invite creation.

10. **POST /api/invites/accept - invite success**
    - Output: `201`, body `{ ok: true, membership, server }`
    - Validates join via invite code.

11. **POST /api/invites/accept - invite reused**
    - Output: `409`, body `{ message: "Invitation already used" }`
    - Validates single-use codes.

12. **POST /api/invites/accept - invite concurrent**
    - Output: `201/409`
    - Validates race condition on single-use codes.

13. **DELETE /api/servers/:id/leave - owner**
    - Output: `403`, body `{ message: "Owner cannot leave server (delete it instead)" }`
    - Validates owner restriction.

14. **DELETE /api/servers/:id/leave - success**
    - Output: `204`
    - Validates membership removal.

15. **PUT /api/servers/:id/members/:userId - caller not owner**
    - Output: `403`, body `{ message: "Only owner can update roles" }`
    - Validates role update permissions.

16. **PUT /api/servers/:id/members/:userId - update role**
    - Output: `204`
    - Validates role update success.


## API Channels

1. **GET /api/channels/:id**
   - Output: `200`, body `{ channel }`
   - Validates channel retrieval.

2. **GET /api/channels/:id/messages**
   - Output: `200`, body `{ messages: [...] }` ordered by `created_at`
   - Validates message listing order.

3. **POST /api/channels/:id/messages - missing content**
   - Output: `400`, body `{ message: "content is required" }`
   - Validates content requirement.

4. **POST /api/channels/:id/messages - no cookie**
   - Output: `401`, body `{ message: "Unauthorized" }`
   - Validates auth guard on message creation.

5. **POST /api/channels/:id/messages - success**
   - Output: `201`, body `{ ok: true }`
   - Validates message creation.

6. **PATCH /api/channels/:channelId/messages/:messageId - invalid id**
   - Output: `400`, body `{ message: "Invalid ids" }`
   - Validates id parsing.

7. **PATCH /api/channels/:channelId/messages/:messageId - missing content**
   - Output: `400`, body `{ message: "content is required" }`
   - Validates payload requirement.

8. **PATCH /api/channels/:channelId/messages/:messageId - success**
   - Output: `204`
   - Validates update path.

9. **DELETE /api/channels/:channelId/messages/:messageId - invalid id**
   - Output: `400`, body `{ message: "Invalid ids" }`
   - Validates id parsing.

10. **DELETE /api/channels/:channelId/messages/:messageId - success**
    - Output: `204`
    - Validates deletion path.

11. **GET /api/servers/:id/channels**
    - Output: `200`, body `{ channels: [...] }`
    - Validates server-scoped channel list.

12. **POST /api/servers/:id/channels - invalid name**
    - Output: `422`
    - Validates channel creation validation.
   
13. **POST /api/servers/:id/channels - success**
    - Output: `201`, body `{ ok: true, channel }`
    - Validates server channel creation.

14. **POST /api/servers/:id/channels - serverId >= 10**
    - Output: `201` (or expected failure)
    - Validates multi-digit server id handling (covers current `req.params.id[0]` bug).

15. **PUT /api/servers/:id/channels/:channelId - invalid name**
    - Output: `422`
    - Validates channel update validation.

16. **PUT /api/servers/:id/channels/:channelId - success**
    - Output: `200`, body `{ ok: true }`
    - Validates channel update.

17. **DELETE /api/servers/:id/channels/:channelId - invalid id**
    - Output: `400`, body `{ error: "Invalid channelId" }`
    - Validates id parsing.

18. **DELETE /api/servers/:id/channels/:channelId - success**
    - Output: `200`, body `{ ok: true }`
    - Validates channel delete + message cascade.


## WebSocket

1. **Connect without session**
   - Output: connection rejected with `E_UNAUTHORIZED`
   - Validates session-based auth guard.

2. **Connect with session**
   - Output: connection accepted
   - Validates normal connection path.

3. **server:join without membership**
   - Output: `error:permission` with `{ code: "E_FORBIDDEN" }`
   - Validates permission on server join.

4. **server:join success**
   - Output: `server:joined`, then `presence:update`
   - Validates room join and presence update.

5. **channel:join with missing channel**
   - Output: `error:not_found` with `{ code: "E_CHANNEL_NOT_FOUND" }`
   - Validates not-found handling.

6. **channel:join without membership**
   - Output: `error:permission` with `{ code: "E_FORBIDDEN" }`
   - Validates permission on channel join.

7. **typing:start / typing:stop**
   - Output: `typing:update` with `isTyping: true/false`
   - Validates typing signals.

8. **message:create with empty content**
   - Output: no event broadcast
   - Validates content guard.

9. **message:create success**
   - Output: broadcast `message:new` with payload
   - Validates message broadcast on creation.

10. **disconnect**
    - Output: presence updates for user servers
    - Validates online/offline transitions.
