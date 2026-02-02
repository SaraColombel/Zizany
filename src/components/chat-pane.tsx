"use client";

import * as React from "react";
import { MessageList, UiMessage } from "./message-list";
import { MessageComposer } from "./message-composer";

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
}: {
  serverId: string;
  channelId: string;
}) {
  /**
   * In-memory message list.
   * This state will later be fed by:
   * - optimistic messages (on send)
   * - socket events (message:new)
   * - REST history (future)
   */
  const [messages, setMessages] = React.useState<UiMessage[]>([]);

  /**
   * Loading / error states are kept on purpose,
   * even if unused for now, to keep the component API stable
   * when backend integration starts.
   */
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [channelName, setChannelName] = React.useState<string | null>(null);

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
          `${process.env.EXPRESS_PUBLIC_API_URL}/api/servers/${serverId}/channels`,
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
    const optimistic: UiMessage = {
      id: crypto.randomUUID(),
      authorName: "You",
      content,
      createdAt: new Date().toISOString(),

      // Client-only flag (must never be stored in DB)
      isOptimistic: true,
    };

    setMessages((prev) => [...prev, optimistic]);

    /**
     * TODO (backend):
     * socket.emit("message:create", {
     *   serverId,
     *   channelId,
     *   content,
     * })
     */
  }

  /**
   * Edit handler (UI-only).
   *
   * This currently updates local state only.
   * Later, this must:
   * - check permissions (backend)
   * - emit socket / REST update
   */
  function handleEditMessage(message: UiMessage) {
    const next = window.prompt("Edit message:", message.content);
    if (next == null) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...m,
              content: next,
              isOptimistic: true, // until backend confirms
            }
          : m,
      ),
    );
  }

  /**
   * Delete handler (UI-only).
   *
   * This is a local removal for now.
   * Backend integration will be required to:
   * - enforce permissions
   * - propagate deletion to other clients
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
