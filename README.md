# Zizany (T-JSF-600-TLS1)

Real Time Chat application built with :
- Next.js (frontend)
- Express.js (REST API)
- Socket.IO (real-time, coming next)
- PostgreSQL (Docker)

## Architecture

- Frontend: Next.js (port 3000)
- Backend API: Express.js (port 4000)
- Database: PostgreSQL (Docker)
- Admin tools:
    - Adminer: http://localhost:8080
    - Mailpit: http://localhost:8025

## Prerequisites

- Node.js (via nvm recommended)
- Docker + Docker Compose
- npm

## How to run

### 1. Start services
```bash
docker compose up -d
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start backend API
```bash
npm run dev:api
```

### 4. Start frontend
```bash
npm run dev
```

### 5. Health check
```bash
curl http://localhost:4000/api/health
```