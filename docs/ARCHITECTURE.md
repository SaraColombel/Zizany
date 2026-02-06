# Architecture — Zizany

This document describes the global architecture of the Zizany real-time chat application.
The goal is to explain **where responsibilities live**, **how data flows**, and **why this structure was chosen**.

---

## Global Overview

Zizany is composed of three main technical parts:

- **Frontend**: Next.js application (UI + real-time subscriptions)
- **Backend API**: Express.js REST API
- **Real-time layer**: Socket.IO server
- **Persistence**: PostgreSQL via Prisma ORM

The architecture follows a **layered design** to ensure:
- separation of concerns
- testability
- scalability
- ease of maintenance

---

## High-Level Layers

┌──────────────────────┐
│ Frontend             │
│ Next.js + Socket.IO  │
└─────────▲────────────┘
          │ REST / WS
┌─────────┴────────────┐
│ HTTP Controllers     │
│ Express Routes       │
└─────────▲────────────┘
          │
┌─────────┴────────────┐
│ Domain Layer         │
│ Entities • DTOs •    │
│ Repository Contracts │
└─────────▲────────────┘
          │
┌─────────┴────────────┐
│ Persistence Layer    │
│ Prisma Repositories  │
│ + Mappers            │
└─────────▲────────────┘
          │
┌─────────┴────────────┐
│ PostgreSQL DB        │
└──────────────────────┘


---

## Frontend Layer

**Location**

src/app
src/components
src/hooks


**Responsibilities**
- UI rendering (servers, channels, messages)
- Routing (Next.js App Router)
- User interactions
- Socket.IO client subscriptions
- Optimistic UI updates

The frontend **does not contain business rules**.
All permissions and validations are enforced server-side.

---

## HTTP Layer (Express)

**Location**

src/backend/infrastructure/http/express

### Controllers

controllers/
auth_controller.ts
server_controller.ts
channel_controller.ts
message_controller.ts
membership_controller.ts


**Responsibilities**
- Parse HTTP requests
- Validate input (via VineJS)
- Call domain repositories
- Format HTTP responses
- Handle errors and status codes

Controllers are intentionally kept thin.
They **do not implement business logic directly**.

---

## Domain Layer

**Location**

src/backend/domain

### Entities

entities/
user.ts
server.ts
channel.ts
message.ts
membership.ts
role.ts

Entities represent **core business concepts**.
They are framework-agnostic and independent from HTTP or databases.

### Repository Contracts

repositories/
user_repository.ts
server_repository.ts
channel_repository.ts
message_repository.ts
membership_repository.ts

Repositories define **what the application needs**, not how it is implemented.

This abstraction allows:
- in-memory repositories (for tests)
- Prisma repositories (production)
- future DB swaps with minimal impact

---

## Persistence Layer

**Location**

src/backend/infrastructure/persistence

### Prisma

prisma/
schema.prisma
migrations/
seed.ts

### Repositories & Mappers

prisma/repositories/
prisma/mappers/

**Responsibilities**
- Translate domain entities ↔ database models
- Isolate Prisma-specific logic
- Prevent database details from leaking into the domain

---

## Real-Time Layer (Socket.IO)

**Location**

src/backend/infrastructure/ws


Files:
- `socket.ts` — socket server initialization & events
- `presence_store.ts` — in-memory presence tracking

**Responsibilities**
- Real-time message delivery
- Presence tracking (connected users per server)
- Typing indicators
- Broadcast system events (join / leave)

Socket events are documented in detail in:
- `docs/SOCKET_SPEC.md`

---

## Authentication & Security

- Session-based authentication (Express sessions)
- Cookies shared between HTTP and WebSocket layers
- Auth middleware protects API routes
- Permissions enforced at controller level based on:
  - server membership
  - role (Owner / Admin / Member)

---

## Typical Flows

### Send a Message
1. Frontend emits HTTP POST `/channels/:id/messages`
2. Controller validates input
3. Message is persisted via repository
4. Socket.IO broadcasts message to channel subscribers
5. Clients update UI in real time

### Join a Server
1. User sends invitation code (HTTP)
2. Membership is created
3. Socket event notifies connected users
4. Presence store updates server state

---

## Testing Strategy

- Domain logic is testable independently
- API endpoints tested via HTTP
- WebSocket behavior tested separately
- Database-dependent tests run on isolated test DB

See `docs/TESTS.md` for details.

---

## Why This Architecture

This design avoids common pitfalls:
- no 200-line route handlers
- no database logic in controllers
- no tight coupling between layers

It allows:
- easier testing
- safer refactors
- onboarding new contributors without fear

---

## Future Evolution

This architecture allows:
- switching database engines
- adding GraphQL alongside REST
- scaling WebSocket infrastructure
- adding new real-time features without rewriting the core