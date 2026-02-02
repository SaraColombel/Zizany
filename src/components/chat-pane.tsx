"use client";

import * as React from "react";
import { MessageList, UiMessage } from "./message-list";
import { MessageComposer } from "./message-composer";
import { io, type Socket } from "socket.io-client";

/**
 * ChatPane
 * --------
 * Main chat container for a given server + channel.
 *
 * IMPORTANT DESIGN CHOICE (for now):
 * - NO message history is loaded yet
 * - messages only exist for the current client session
 *
 * This component is intentionally prepared for:
 * - real-time messages via Socket.IO
 * - optimistic UI
 * - future REST-based history loading
 *
 * But at this stage:
 * - no REST fetch
 * - no socket connection
 * - no persistence
 */
export function ChatPane({
  serverId,
  channelId,
  currentUserName,
}: {
  serverId: string;
  channelId: string;
  /**
   * Display name for the currently connected user.
   * For now, this is a simple prop so that wiring
   * real auth later is straightforward.
   */
  currentUserName?: string;
}) {
  const [messages, setMessages] = React.useState<UiMessage[]>([]);

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
          `http://localhost:4000/api/channels/${channelId}/messages`,
          {
            headers: { "Content-Type": "application/json" },
          },
        );

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const json = await res.json();
        const rawMessages: any[] = json.messages ?? [];

        const mapped: UiMessage[] = rawMessages
          .map((raw) => {
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
   * Load channel metadata (name) so we can display it
   * instead of the raw channel id.
   *
   * Uses the same /api/servers/:id/channels endpoint as the sidebar
   * and is resilient to the backend returning either domain entities
   * ({ props: { ... } }) or plain objects.
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

        const match = (json.channels ?? []).find((raw: any) => {
          const base = raw && raw.props ? raw.props : raw;
          return Number(base?.id) === numericId;
        });

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
    const socket = io(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000", {
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("server:join", { serverId: Number(serverId) });
      socket.emit("channel:join", { channelId: Number(channelId) });
    });

    socket.on("message:new", (msg:any) => {
      const createdAt = msg.created_at;
      const updatedAt = msg.updated_at;

      const uiMsg: UiMessage = {
        id: String(msg.id),
        authorName: msg.user?.username ?? `User ${msg.user?.id}`,
        content: String(msg.content ?? ""),
        createdAt,
        isEdited: createdAt !== updatedAt,
      };

      setMessages((prev) => [...prev, uiMsg]);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [serverId, channelId]);

  /**
   * Send handler called by MessageComposer.
   *
   * Current behavior:
   * - immediately append an optimistic message
   * - no backend call yet
   *
   * Future behavior:
   * - emit socket event (message:create)
   * - backend will broadcast message:new
   * - optimistic message will be reconciled
   */
  async function handleSend(content: string) {
    // Create a temporary optimistic message id so we can update status later.
    const tempId = crypto.randomUUID();

    // Use the provided currentUserName when available,
    // otherwise fall back to a neutral label.
    const effectiveUserName = currentUserName ?? "You";

    const optimistic: UiMessage = {
      id: tempId,
      authorName: effectiveUserName,
      content,
      createdAt: new Date().toISOString(),

      // Client-only flags (must never be stored in DB)
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimistic]);

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("message:create", { channelId: Number(channelId), content });
      setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, isOptimistic: false } : m)),
    );
    return;
    }
  }

  /**
   * Edit handler (UI-only).
   *
   * This currently updates bd.
   * Later, this must:
   * - check permissions (backend)
   * - emit socket / REST update
   */
  async function handleEditMessage(message: UiMessage, nextContent: string) {
    const trimmed = nextContent.trim();
    if (!trimmed || trimmed === message.content) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...m,
              content: trimmed,
              isOptimistic: true,
              isFailed: false,
            }
          : m,
      ),
    );
  }

  /**
   * Delete handler (UI-only).
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
        />
      </div>

      {/* Message composer */}
      <div className="border-t p-3">
        <MessageComposer onSend={handleSend} disabled={!!error} />
      </div>
    </div>
  );
}
