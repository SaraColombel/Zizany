"use client";

import * as React from "react";
import { MessageList, UiMessage } from "./message-list";
import { MessageComposer } from "./message-composer";
import { io, type Socket } from "socket.io-client";

interface ApiMessage {
  id?: number | string;
  channel_id?: number | string;
  user_id?: number | string;
  content?: string;
  created_at?: string;
  updated_at?: string;
  user?: { id?: number | string; username?: string };
  props?: ApiMessage;
}

/**
 * ChatPane
 * --------
 * Main chat container for a given server + channel.
 *
 * Current behavior:
 * - loads existing messages from the backend on mount
 * - creates, edits and deletes messages via HTTP calls
 * - keeps messages in local state for the current client session
 *
 * Designed for future extensions:
 * - real-time updates via Socket.IO (not wired yet)
 * - optimistic UI with server reconciliation
 * - richer history loading / pagination
 */
export function ChatPane({
  serverId,
  channelId,
  currentUserName,
  currentUserId,
  canModerateOthers = false,
}: {
  serverId: string;
  channelId: string;
  /**
   * Display name for the currently connected user.
   * Kept as a simple prop for now so that real
   * authentication can be plugged in later.
   */
  currentUserName?: string;
  /**
   * Identifier of the current user (for ownership checks).
   */
  currentUserId?: string | number;
  /**
   * Whether the user can edit/delete messages from others (admin/owner).
   */
  canModerateOthers?: boolean;
}) {
  const [messages, setMessages] = React.useState<UiMessage[]>([]);
  const [typingUsers, setTypingUsers] = React.useState<
    Array<{ userId: number; username?: string }>
  >([]);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [channelName, setChannelName] = React.useState<string | null>(null);

  const socketRef = React.useRef<Socket | null>(null);

  /**
   * Initial load of messages for the channel.
   *
   * Backend route used:
   *   GET /api/channels/:channelId/messages
   */
  React.useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/channels/${channelId}/messages`,
          {
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        const rawMessages: ApiMessage[] = json.messages ?? [];

        const mapped: UiMessage[] = rawMessages
          .map((raw: ApiMessage) => {
            const base = raw && raw.props ? raw.props : raw;
            if (!base) return null;

            const createdAt =
              typeof base.created_at === "string"
                ? base.created_at
                : new Date().toISOString();
            const updatedAt =
              typeof base.updated_at === "string" ? base.updated_at : createdAt;

            // MessageDTO shape from backend:
            // {
            //   id, channel_id, content, created_at, updated_at,
            //   user: { id, username }
            // }
            const username =
              base.user && typeof base.user.username === "string"
                ? base.user.username
                : `User ${base.user_id}`;

            return {
              id: String(base.id),
              authorId:
                base.user && typeof base.user.id !== "undefined"
                  ? base.user.id
                  : base.user_id,
              authorName: username,
              content: String(base.content ?? ""),
              createdAt,
              isEdited: createdAt !== updatedAt,
            } as UiMessage;
          })
          .filter((m: UiMessage | null): m is UiMessage => m !== null);

        if (!cancelled) {
          setMessages(mapped);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load messages");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, [channelId]);

  /**
   * Loads channel metadata (name) so we can display a
   * human-friendly label instead of the raw channel id.
   *
   * Uses the same /api/servers/:id/channels endpoint as the sidebar
   * and supports both domain entities ({ props: { ... } })
   * and plain objects returned by the backend.
   */
  React.useEffect(() => {
    let cancelled = false;

    async function loadChannel() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/servers/${serverId}/channels`,
          {
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const numericId = Number(channelId);

        const match = (json.channels ?? []).find(
          (raw: { id?: number | string; props?: { id?: number | string } }) => {
            const base = raw && raw.props ? raw.props : raw;
            return Number(base?.id) === numericId;
          },
        );

        if (!cancelled && match) {
          const base = match.props ? match.props : match;
          setChannelName(String(base.name ?? `#${channelId}`));
        }
      } catch {
        if (!cancelled) {
          // Keep a graceful fallback; header will show the id.
          setChannelName(null);
        }
      }
    }

    loadChannel();
    return () => {
      cancelled = true;
    };
  }, [serverId, channelId]);

  React.useEffect(() => {
    setTypingUsers([]);
    const socket = io(process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000", {
      withCredentials: true,
      transports: ["websocket"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WS connected", socket.id);
      socket.emit("server:join", { serverId: Number(serverId) });
      socket.emit("channel:join", { channelId: Number(channelId) });
    });

    socket.on("connect_error", (err) => {
      console.log("WS connect_error", err.message);
    });

    socket.on("disconnect", (reason) => {
      console.log("WS disconnected", reason);
      setTypingUsers([]);
    });

    socket.on("message:new", (msg:any) => {
      const createdAt = msg.created_at;
      const updatedAt = msg.updated_at;

      const uiMsg: UiMessage = {
        id: String(msg.id),
        authorId: msg.user?.id,
        authorName: msg.user?.username ?? `User ${msg.user?.id}`,
        content: String(msg.content ?? ""),
        createdAt,
        isEdited: createdAt !== updatedAt,
      };

      setMessages((prev) => [...prev, uiMsg]);
    });

    socket.on(
      "server:member_joined",
      (payload: { serverId: number; userId: number; username?: string }) => {
        if (Number(payload.serverId) !== Number(serverId)) return;
        if (
          currentUserId != null &&
          String(payload.userId) === String(currentUserId)
        ) {
          return;
        }

        const displayName = payload.username ?? `User ${payload.userId}`;
        const content = `${displayName} has joined the server. Welcome!`;

        const systemMsg: UiMessage = {
          id: `system-${payload.userId}-${Date.now()}`,
          authorId: "system",
          authorName: "System",
          content,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, systemMsg]);
      },
    );

    socket.on(
      "server:member_left",
      (payload: { serverId: number; userId: number; username?: string }) => {
        if (Number(payload.serverId) !== Number(serverId)) return;
        if (
          currentUserId != null &&
          String(payload.userId) === String(currentUserId)
        ) {
          return;
        }

        const displayName = payload.username ?? `User ${payload.userId}`;
        const content = `${displayName} has left the server.`;

        const systemMsg: UiMessage = {
          id: `system-left-${payload.userId}-${Date.now()}`,
          authorId: "system",
          authorName: "System",
          content,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, systemMsg]);
      },
    );

    socket.on(
      "typing:update",
      (payload: {
        channelId: number;
        userId: number;
        username?: string;
        isTyping: boolean;
      }) => {
        if (Number(payload.channelId) !== Number(channelId)) return;
        setTypingUsers((prev) => {
          if (payload.isTyping) {
            const existing = prev.find((u) => u.userId === payload.userId);
            if (existing) {
              return prev.map((u) =>
                u.userId === payload.userId
                  ? { ...u, username: payload.username ?? u.username }
                  : u,
              );
            }
            return [
              ...prev,
              { userId: payload.userId, username: payload.username },
            ];
          }
          return prev.filter((u) => u.userId !== payload.userId);
        });
      },
    );

    return () => {
      socket.off("connect");
      socket.off("connect_error");
      socket.off("disconnect");
      socket.off("message:new");
      socket.off("server:member_joined");
      socket.off("server:member_left");
      socket.off("typing:update");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [serverId, channelId, currentUserId]);

  /**
   * Send handler called by MessageComposer.
   *
   * Current behavior:
   * - immediately appends an optimistic message to the UI
   * - then sends a POST request to the backend
   *
   * Future behavior:
   * - emit a Socket.IO event (message:create)
   * - listen for backend broadcasts (message:new)
   * - reconcile optimistic messages with server data
   */
  async function handleSend(content: string) {
    // Create a temporary optimistic message id so we can update status later.
    const tempId = crypto.randomUUID();

    // Use the provided currentUserName when available,
    // otherwise fall back to a neutral label.
    const effectiveUserName = currentUserName ?? "You";

    const optimistic: UiMessage = {
      id: tempId,
      authorId: currentUserId,
      authorName: effectiveUserName,
      content,
      createdAt: new Date().toISOString(),

      // Client-only flags (must never be stored in DB).
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimistic]);

    const socket = socketRef.current;
    console.log("socket connected?", socket?.connected);
    if (socket?.connected) {
      socket.emit("message:create", { channelId: Number(channelId), content });
      setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, isOptimistic: false } : m)),
    );
    return;
    }

    // Fallback REST
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ content }),
        },
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, isOptimistic: false } : m)),
    );
    } catch {
      setMessages((prev) =>
      prev.map((m) =>
      m.id === tempId ? { ...m, isOptimistic: false, isFailed: true } : m,
    ),
  );
    }
  }

  /**
   * Edit handler.
   *
   * Currently:
   * - updates the message optimistically in local state
   * - sends a PATCH request to the backend
   *
   * Later this should:
   * - enforce permissions server-side
   * - emit a socket / REST update so other clients stay in sync
   */
  async function handleEditMessage(message: UiMessage, nextContent: string) {
    const trimmed = nextContent.trim();
    if (!trimmed || trimmed === message.content) return;

    // Optimistic update in UI
    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...m,
              content: trimmed,
              isOptimistic: true,
              isFailed: false,
              isEdited: true,
            }
          : m,
      ),
    );

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/channels/${channelId}/messages/${message.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
          credentials: "include",
        },
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      // Mark as successfully synced with backend
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...m, isOptimistic: false, isEdited: true, isFailed: false }
            : m,
        ),
      );
    } catch {
      // Revert content and flag as failed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                content: message.content,
                isOptimistic: false,
                isFailed: true,
                isEdited: message.isEdited ?? false,
              }
            : m,
        ),
      );
    }
  }

  /**
   * Delete handler.
   *
   * Current behavior:
   * - calls backend DELETE /api/channels/:channelId/messages/:messageId
   * - on success, removes the message from local state
   *
   * Permissions (who can delete what) are expected to be enforced
   * server-side later (owner / admin / author).
   */
  function handleDeleteMessage(message: UiMessage) {
    setMessages((prev) => prev.filter((m) => m.id !== message.id));
  }

  const typingLabel = React.useMemo(() => {
    if (typingUsers.length === 0) return null;
    const names = typingUsers.map(
      (u) => u.username ?? `User ${u.userId}`,
    );
    if (names.length === 1) {
      return `${names[0]} is typing...`;
    }
    if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`;
    }
    return `${names.slice(0, 2).join(", ")} and ${
      names.length - 2
    } others are typing...`;
  }, [typingUsers]);

  return (
    <div className="flex h-full flex-col">
      {/* Channel header */}
      <div className="border-b px-4 py-3 text-sm">
        {channelName ?? channelId}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          loading={loading}
          error={error}
          onEdit={handleEditMessage}
          onDelete={handleDeleteMessage}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          canModerateOthers={canModerateOthers}
        />
      </div>

      {typingLabel && (
        <div className="px-3 pb-2 text-xs text-muted-foreground">
          {typingLabel}
        </div>
      )}

      {/* Message composer */}
      <div className="border-t p-3">
        <MessageComposer
          onSend={handleSend}
          onTypingStart={() => {
            const socket = socketRef.current;
            if (socket?.connected) {
              socket.emit("typing:start", { channelId: Number(channelId) });
            }
          }}
          onTypingStop={() => {
            const socket = socketRef.current;
            if (socket?.connected) {
              socket.emit("typing:stop", { channelId: Number(channelId) });
            }
          }}
          disabled={Boolean(error)}
        />
      </div>
    </div>
  );
}
