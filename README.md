# Zizany — Real Time Chat Application  
**T-JSF-600-TLS1**

Zizany is a real-time chat application inspired by community-based platforms (servers, channels, roles).
It combines a REST API for data management with WebSockets for real-time interactions.

The project was built with a strong focus on:
- clean architecture
- separation of concerns
- testability
- scalability

---

## Features

### Authentication
- User signup / login / logout
- Session-based authentication (cookies)

### Servers
- Create and manage servers
- Join servers via invitation code
- Leave a server (except owner)
- Role-based permissions (Owner, Admin, Member)

### Channels
- Create, update and delete channels (Admin+)
- Read channel history

### Messages
- Send and receive messages in real time
- See previous messages when joining a channel
- Delete own messages (or any message if Admin+)

### Real-time (Socket.IO)
- Live message delivery
- Presence tracking (connected users)
- Typing indicators
- Server join/leave notifications

---

## Tech Stack

### Frontend
- **Next.js** (App Router)
- TypeScript
- Socket.IO Client

### Backend
- **Express.js** (REST API)
- Socket.IO (WebSocket server)
- Prisma ORM
- PostgreSQL

### Tooling
- Docker & Docker Compose
- Vitest (API + WebSocket tests)
- ESLint

---

## Architecture Overview

The application follows a layered architecture:

- **Frontend**: UI, routing, real-time subscriptions
- **HTTP layer**: Express controllers & routes
- **Domain layer**: entities, repositories, business rules
- **Persistence layer**: Prisma repositories & mappers
- **WebSocket layer**: real-time events & presence tracking

A detailed explanation is available in:
- `docs/ARCHITECTURE.md`

---

## Documentation

All technical documentation lives in the `docs/` directory:

- `API_CONTRACT.md` — REST endpoints specification
- `SOCKET_SPEC.md` — WebSocket events and payloads
- `RFC_AUTH.md` — authentication rules
- `RFC_SERVERS.md` — servers & roles logic
- `RFC_CHANNELS.md` — channels behavior
- `RFC_MEMBERSHIPS.md` — membership rules
- `TESTS.md` — testing strategy

---

## Prerequisites

- Node.js (via nvm recommended)
- Docker & Docker Compose
- npm

---

## Installation & Run

### 1. Start infrastructure services

```bash
docker compose up -d
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup database
```bash
npx prisma generate
npx migrate reset
npx prisma db seed
```

### 4. Start backend API
```bash
npm run dev:api
```

### 5. Start frontend
```bash
npm run dev
```

## Health check
```bash
curl http://localhost:4000/api/health
```

## Tests
```bash
npm test
```

Tests cover :
- REST API endpoints
- Authentication
- Permissions
- WebSocket real-time behavior

See `docs/TESTS.md` for details.

## Services & Ports
| Service     | URL                                            |
| ----------- | ---------------------------------------------- |
| Frontend    | [http://localhost:3000](http://localhost:3000) |
| Backend API | [http://localhost:4000](http://localhost:4000) |
| Adminer     | [http://localhost:8080](http://localhost:8080) |
| Mailpit     | [http://localhost:8025](http://localhost:8025) |

## Authors

Project developed as part of the T-JSF-600 module.