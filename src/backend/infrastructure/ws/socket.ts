import { Server as IOServer } from "socket.io";
import type http from "http";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { prisma } from "../persistence/prisma/prisma.client.js";
import {
  getOnlineUserIdSet,
  markOffline,
  markOnline,
} from "./presence_store.js";

let ioRef: IOServer | null = null;

interface SocketSession {
  user_id?: number | string;
}

interface SocketRequest extends http.IncomingMessage {
  session?: SocketSession;
}

function toSocketRequest(request: unknown): SocketRequest {
  return request as SocketRequest;
}

export function getSocketServer() {
  return ioRef;
}

export function attachSocket(
  httpServer: http.Server,
  sessionMiddleware: RequestHandler,
) {
  const io = new IOServer(httpServer, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });
  ioRef = io;

  // Bridge express-session -> socket.request
  io.use((socket, next) => {
    const req = toSocketRequest(socket.request);
    sessionMiddleware(
      req as unknown as Request,
      {} as Response,
      next as unknown as NextFunction,
    );
  });

  // Auth guard (session-based)
  io.use((socket, next) => {
    const req = toSocketRequest(socket.request);
    const userId = req?.session?.user_id;
    if (!userId) return next(new Error("E_UNAUTHORIZED"));
    socket.data.userId = Number(userId);
    next();
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as number;
    let cachedUsername: string | null = null;
    const emitPresence = async (serverId: number) => {
      const members = await prisma.memberships.findMany({
        where: { server_id: serverId },
        select: { user_id: true },
      });
      const onlineSet = getOnlineUserIdSet();
      const onlineUserIds = members
        .map((m) => m.user_id)
        .filter((id) => onlineSet.has(id));
      io.to(`server:${serverId}`).emit("presence:update", {
        serverId,
        onlineUserIds,
      });
    };

    const emitPresenceForUserServers = async () => {
      const memberships = await prisma.memberships.findMany({
        where: { user_id: userId },
        select: { server_id: true },
      });
      const serverIds = Array.from(
        new Set(memberships.map((m) => m.server_id)),
      );
      await Promise.all(
        serverIds.map((serverId) => emitPresence(serverId as number)),
      );
    };

    const ensureUsername = async () => {
      if (cachedUsername) return cachedUsername;
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: { username: true },
      });
      cachedUsername = user?.username ?? null;
      return cachedUsername;
    };

    const becameOnline = markOnline(userId);
    if (becameOnline) {
      emitPresenceForUserServers().catch((err) => {
        console.error("presence update failed", err);
      });
    }

    // Join server room
    socket.on("server:join", async ({ serverId }: { serverId: number }) => {
      // check membership
      const membership = await prisma.memberships.findFirst({
        where: { server_id: serverId, user_id: userId },
      });
      if (!membership)
        return socket.emit("error:permission", { code: "E_FORBIDDEN" });

      await socket.join(`server:${serverId}`);
      socket.emit("server:joined", { serverId });
      await emitPresence(serverId);
    });

    // Join channel room
    socket.on("channel:join", async ({ channelId }: { channelId: number }) => {
      const channel = await prisma.channels.findUnique({
        where: { id: channelId },
      });
      if (!channel)
        return socket.emit("error:not_found", { code: "E_CHANNEL_NOT_FOUND" });

      const membership = await prisma.memberships.findFirst({
        where: { server_id: channel.server_id, user_id: userId },
      });
      if (!membership)
        return socket.emit("error:permission", { code: "E_FORBIDDEN" });

      socket.join(`channel:${channelId}`);
      socket.emit("channel:joined", { channelId });
    });

    // Typing
    socket.on("typing:start", async ({ channelId }: { channelId: number }) => {
      const username = await ensureUsername();
      socket.to(`channel:${channelId}`).emit("typing:update", {
        channelId,
        userId,
        username: username ?? undefined,
        isTyping: true,
      });
    });

    socket.on("typing:stop", async ({ channelId }: { channelId: number }) => {
      const username = await ensureUsername();
      socket.to(`channel:${channelId}`).emit("typing:update", {
        channelId,
        userId,
        username: username ?? undefined,
        isTyping: false,
      });
    });

    // Message create -> DB -> broadcast
    socket.on(
      "message:create",
      async ({
        channelId,
        content,
      }: {
        channelId: number;
        content: string;
      }) => {
        const trimmed = content.trim();
        if (!trimmed) return;

        const channel = await prisma.channels.findUnique({
          where: { id: channelId },
        });
        if (!channel)
          return socket.emit("error:not_found", {
            code: "E_CHANNEL_NOT_FOUND",
          });

        const membership = await prisma.memberships.findFirst({
          where: { server_id: channel.server_id, user_id: userId },
        });
        if (!membership)
          return socket.emit("error:permission", { code: "E_FORBIDDEN" });

        const created = await prisma.messages.create({
          data: { channel_id: channelId, user_id: userId, content: trimmed },
          include: {
            user: { select: { id: true, username: true } },
          },
        });

        const dto = {
          id: created.id,
          channel_id: created.channel_id,
          content: created.content,
          created_at: created.created_at.toISOString(),
          updated_at: created.updated_at.toISOString(),
          user: { id: created.user.id, username: created.user.username },
        };

        io.to(`channel:${channelId}`).emit("message:new", dto);
      },
    );

    // Realtime delete
    socket.on(
      "message:delete",
      async ({ messageId }: { messageId: number }) => {
        if (!Number.isFinite(messageId)) return;

        const msg = await prisma.messages.findUnique({
          where: { id: messageId },
          include: { channel: true },
        });
        if (!msg)
          return socket.emit("error:not_found", {
            code: "E_MESSAGE_NOT_FOUND",
          });

        const membership = await prisma.memberships.findFirst({
          where: { server_id: msg.channel.server_id, user_id: userId },
        });
        if (!membership)
          return socket.emit("error: permission", { code: "E_FORBIDDEN" });

        await prisma.messages.delete({ where: { id: messageId } });

        io.to(`channel:${msg.channel_id}`).emit("message:deleted", {
          messageId,
        });
      },
    );

    // Realtime update
    socket.on(
      "message:update",
      async ({
        messageId,
        content,
      }: {
        messageId: number;
        content: string;
      }) => {
        if (!Number.isFinite(messageId)) return;
        const trimmed = content.trim();
        if (!trimmed) return;

        const msg = await prisma.messages.findUnique({
          where: { id: messageId },
          include: { channel: true },
        });
        if (!msg)
          return socket.emit("error:not_found", {
            code: "E_MESSAGE_NOT_FOUND",
          });

        const membership = await prisma.memberships.findFirst({
          where: { server_id: msg.channel.server_id, user_id: userId },
        });
        if (!membership)
          return socket.emit("error:permission", { code: "E_FORBIDDEN" });

        const updated = await prisma.messages.update({
          where: { id: messageId },
          data: { content: trimmed },
          include: { user: { select: { id: true, username: true } } },
        });

        const dto = {
          id: updated.id,
          channel_id: updated.channel_id,
          content: updated.content,
          created_at: updated.created_at.toISOString(),
          updated_at: updated.updated_at.toISOString(),
          user: { id: updated.user.id, username: updated.user.username },
        };

        io.to(`channel:${updated.channel_id}`).emit("message:updated", dto);
      },
    );

    socket.on("disconnect", () => {
      const becameOffline = markOffline(userId);
      if (becameOffline) {
        emitPresenceForUserServers().catch((err) => {
          console.error("presence update failed", err);
        });
      }
    });
  });

  return io;
}
