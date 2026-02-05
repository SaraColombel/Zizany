# RFC: Session-Based Authentication for HTTP and Socket.IO

Status: Draft

Authors: TBD

Created: 2026-02-04

Related docs: docs/API_CONTRACT.md, docs/SOCKET_SPEC.md, docs/TESTS.md

## 1. Summary
This RFC defines the authentication and authorization model for the project. The system uses server-side sessions (express-session) stored in an HTTP-only cookie (`connect.sid`) to authenticate API requests and Socket.IO connections. The design targets a simple, secure, and testable flow that supports SSR and real-time features.

## 2. Motivation
We need a consistent auth mechanism that:
- Works for both REST endpoints and Socket.IO.
- Supports SSR routing guards on the Next.js app.
- Keeps user identity server-side (no JWT storage in the browser).

## 3. Goals
- Session-based authentication with a cookie.
- Clear login/signup/logout/me endpoints with validation and error codes.
- Auth guard enforced on protected routes and Socket.IO handshake.
- Minimal surface area for the frontend (credentials include + redirect).

## 4. Non-goals
- OAuth or social login.
- Stateless JWT-based auth.
- Fine-grained permissions beyond server membership and roles.

## 5. Proposed Design

### 5.1 Auth Model
- Backend uses `express-session` with a cookie named `connect.sid`.
- Session data includes:
  - `user_id`
  - `email`
  - `username`
- Session cookie configuration (current implementation):
  - httpOnly: true
  - secure: false (local dev)
  - sameSite: lax
  - maxAge: 24h
  - rolling: true
- CORS is configured with `origin: true` and `credentials: true` to allow cookies.

### 5.2 Password Handling
- Passwords are hashed with bcrypt (12 rounds).
- Login verifies the bcrypt hash.
- Unknown user login performs a dummy hash to reduce timing signals.

### 5.3 Endpoints (HTTP)

#### POST /api/auth/login
- Request body:
  ```json
  { "email": "user@example.com", "password": "string" }
  ```
- Success (200):
  ```json
  {
    "code": "AUTHORIZED_ACCESS",
    "user": { "id": 1, "email": "user@example.com", "username": "user", "thumbnail": null }
  }
  ```
- Failure (401):
  ```json
  { "code": "E_UNAUTHORIZED_ACCESS", "message": "Invalid credentials" }
  ```
- Validation errors (422):
  ```json
  { "status": 422, "code": "E_VALIDATION_ERROR", "message": "...", "infos": { ... } }
  ```

#### POST /api/auth/signup
- Request body:
  ```json
  { "username": "user", "email": "user@example.com", "password": "...", "confirmPassword": "..." }
  ```
- Success (200):
  ```json
  {
    "code": "AUTHORIZED_ACCESS",
    "user": { "id": 1, "email": "user@example.com", "username": "user", "thumbnail": null }
  }
  ```
- Failure (401):
  ```json
  { "code": "EMAIL_ALREADY_USED" }
  ```
- Validation errors (422) same structure as login.

#### POST /api/auth/logout
- Requires session.
- Success (200):
  ```json
  { "code": "DISCONNECTED" }
  ```
- Side effects: server destroys the session and clears `connect.sid`.

#### GET /api/auth/me
- Requires session.
- Success (200):
  ```json
  { "id": 1, "email": "user@example.com", "username": "user", "thumbnail": null }
  ```
- Failure (401):
  ```json
  { "message": "Unauthorized" }
  ```

### 5.4 Validation Rules
- Email: required, valid email, normalized.
- Password: required (no minimum length enforced yet).
- Username (signup): letters, dashes, underscores only, max length 24.
- confirmPassword must match password.

### 5.5 Authorization Guard
- `AuthMiddleware.handle` blocks unauthenticated access and returns `E_UNAUTHORIZED_ACCESS`.
- `AuthMiddleware.silent` prevents login/signup when already authenticated.

### 5.6 SSR and Frontend Integration
- Frontend uses `credentials: include` for auth endpoints.
- Server-side routes fetch `/api/auth/me` with the incoming cookie to decide redirects.

### 5.7 Socket.IO Authentication
- Socket.IO reuses the same session middleware during the handshake.
- If `req.session.user_id` is missing, the connection fails with `E_UNAUTHORIZED`.
- Authenticated sockets store `userId` in `socket.data`.

## 6. Data Model
Relevant fields in `Users`:
- id (int, primary key)
- email (unique)
- password (bcrypt hash)
- username
- thumbnail (nullable)

## 7. Security Considerations
- Session fixation is mitigated by `req.session.regenerate()` on login.
- Cookie is httpOnly to prevent JS access.
- `secure: false` is only acceptable for local dev; should be `true` in production.
- Session secret is currently hard-coded; should be moved to env.
- Default session store is in-memory; replace with persistent store for production.
- Consider adding rate limiting and password policy in the future.

## 8. Alternatives Considered
- JWT-based auth: rejected for now to keep SSR and Socket.IO simple with a single cookie.
- OAuth: out of scope for the current milestone.

## 9. Migration / Rollout
- Implementation already exists in the backend and frontend.
- Align docs (`docs/API_CONTRACT.md`) with actual endpoints and error payloads.
- Ensure tests in `docs/TESTS.md` remain accurate as changes land.
