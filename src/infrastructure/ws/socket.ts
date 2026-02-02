import { Server as IOServer } from "socket.io";
import type http from "http";
import type { RequestHandler } from "express";
import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";

export function attachSocket(httpServer: http.Server, sessionMiddleware: RequestHandler) {
    const io = new IOServer(httpServer, {
        cors: {
            origin: "http://localhost:3000",
            credentials: true,
        },
    });

    // Bridge express-session -> socket.request
    io.use((socket, next) => {
        sessionMiddleware(socket.request as any, {} as any, next as any);
    });

    // Auth guard (session-based)
    io.use((socket, next) => {
        const req = socket.request as any;
        const userId = req?.session?.user_id;
        if (!userId) return next(new Error("E_UNAUTHORIZED"));
        socket.data.userId = Number(userId);
        next();
    });

    io.on("connection", (socket) => {
        const userId = socket.data.userId as number;

        // Join server room
        socket.on("server:join", async ({ serverId }: { serverId: number }) => {
            // check membership
            const membership = await prisma.memberships.findFirst({
                where: { server_id: serverId, user_id: userId },
            });
            if (!membership) return socket.emit("error:permission", { code: "E_FORBIDDEN" });

            socket.join(`server:${serverId}`);
            socket.emit("server:joined", { serverId });
        });

        // Join channel room
        socket.on("channel:join", async ({ channelId }: { channelId: number }) => {
            const channel = await prisma.channels.findUnique({ where: { id: channelId } });
            if (!channel) return socket.emit("error:not_found", { code: "E_CHANNEL_NOT_FOUND" });

            const membership = await prisma.memberships.findFirst({
                where: { server_id: channel.server_id, user_id: userId },
            });
            if (!membership) return socket.emit("error:permission", { code: "E_FORBIDDEN" });

            socket.join(`channel:${channelId}`);
            socket.emit("channel:joined", { channelId });
        });

        // Typing
        socket.on("typing:start", ({ channelId }: { channelId: number }) => {
            socket.to(`channel:${channelId}`).emit("typing:update", {
                channelId,
                userId,
                isTyping: true,
            });
        });

        socket.on("typing:stop", ({ channelId }: { channelId: number }) => {
            socket.to(`channel:${channelId}`).emit("typing:update", {
                channelId,
                userId,
                isTyping: false,
            });
        });

        // Message create -> DB -> broadcast
        socket.on(
            "message:create",
            async ({ channelId, content }: { channelId: number; content: string }) => {
                const trimmed = content.trim();
                if (!trimmed) return;

                const channel = await prisma.channels.findUnique({ where: { id: channelId } });
                if (!channel) return socket.emit("error:not_found", { code: "E_CHANNEL_NOT_FOUND" });

                const membership = await prisma.memberships.findFirst({
                    where: { server_id: channel.server_id, user_id: userId },
                });
                if (!membership) return socket.emit("error:permission", { code: "E_FORBIDDEN" });

                const created = await prisma.messages.create({
                    data: { channel_id: channelId, user_id: userId, content: trimmed },
                    include : {
                        user : { select: { id: true, username: true } },
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

                socket.to(`channel:${channelId}`).emit("message:new", dto);
            },
        );
    });

    return io;
}