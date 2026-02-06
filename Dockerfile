FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    openssl \
    libc6-dev \
    build-essential \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* tsconfig*.json ./

RUN npm ci

COPY . .

RUN npm run build:all

EXPOSE 3000 4000

ENV NODE_ENV=production
ENV DATABASE_URL="postgres://root:root@db:5432/zizany"
ENV NEXT_PUBLIC_API_URL="http://localhost:4000"

CMD npx prisma migrate deploy && npx prisma db seed && npm run start
