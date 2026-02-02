"use client"

import * as React from "react"
import { MessageList, UiMessage } from "./message-list"
import { MessageComposer } from "./message-composer"

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
}: {
  serverId: string
  channelId: string
  /**
   * Display name for the currently connected user.
   * Kept as a simple prop for now so that real
   * authentication can be plugged in later.
   */
  currentUserName?: string
}) {
  const [messages, setMessages] = React.useState<UiMessage[]>([])


  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [channelName, setChannelName] = React.useState<string | null>(null)

  /**
   * Initial load of messages for the channel.
   *
   * Backend route used:
   *   GET /api/channels/:channelId/messages
   */
  React.useEffect(() => {
    let cancelled = false

    async function loadMessages() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(
          `http://localhost:4000/api/channels/${channelId}/messages`,
          {
            headers: { "Content-Type": "application/json" },
          }
        )

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }

        const json = await res.json()
        const rawMessages: any[] = json.messages ?? []

        const mapped: UiMessage[] = rawMessages
          .map((raw) => {
            const base = raw && raw.props ? raw.props : raw
            if (!base) return null

            const createdAt =
              typeof base.created_at === "string"
                ? base.created_at
                : new Date().toISOString()
            const updatedAt =
              typeof base.updated_at === "string"
                ? base.updated_at
                : createdAt

            // MessageDTO shape from backend:
            // {
            //   id, channel_id, content, created_at, updated_at,
            //   user: { id, username }
            // }
            const username =
              base.user && typeof base.user.username === "string"
                ? base.user.username
                : `User ${base.user_id}`

            return {
              id: String(base.id),
              authorName: username,
              content: String(base.content ?? ""),
              createdAt,
              isEdited: createdAt !== updatedAt,
            } as UiMessage
          })
          .filter((m: UiMessage | null): m is UiMessage => m !== null)

        if (!cancelled) {
          setMessages(mapped)
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Failed to load messages"
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadMessages()
    return () => {
      cancelled = true
    }
  }, [channelId])

  /**
   * Loads channel metadata (name) so we can display a
   * human-friendly label instead of the raw channel id.
   *
   * Uses the same /api/servers/:id/channels endpoint as the sidebar
   * and supports both domain entities ({ props: { ... } })
   * and plain objects returned by the backend.
   */
  React.useEffect(() => {
    let cancelled = false

    async function loadChannel() {
      try {
        const res = await fetch(
          `http://localhost:4000/api/servers/${serverId}/channels`,
          {
            headers: { "Content-Type": "application/json" },
          }
        )

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        const numericId = Number(channelId)

        const match = (json.channels ?? []).find((raw: any) => {
          const base = raw && raw.props ? raw.props : raw
          return Number(base?.id) === numericId
        })

        if (!cancelled && match) {
          const base = match.props ? match.props : match
          setChannelName(String(base.name ?? `#${channelId}`))
        }
      } catch {
        if (!cancelled) {
          // Keep a graceful fallback; header will show the id.
          setChannelName(null)
        }
      }
    }

    loadChannel()
    return () => {
      cancelled = true
    }
  }, [serverId, channelId])

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
    // Create a temporary optimistic message id so we can update its status later.
    const tempId = crypto.randomUUID()

    // Use the provided currentUserName when available,
    // otherwise fall back to a neutral label.
    const effectiveUserName = currentUserName ?? "You"

    const optimistic: UiMessage = {
      id: tempId,
      authorName: effectiveUserName,
      content,
      createdAt: new Date().toISOString(),

      // Client-only flags (must never be stored in DB).
      isOptimistic: true,
      isEdited: false,
    }

    setMessages((prev) => [...prev, optimistic])

    try {
      const res = await fetch(
        `http://localhost:4000/api/channels/${channelId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      )

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      // Mark the optimistic message as successfully sent.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, isOptimistic: false }
            : m
        )
      )
    } catch {
      // Mark the optimistic message as failed.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId
            ? { ...m, isOptimistic: false, isFailed: true }
            : m
        )
      )
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

    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...m,
              content: trimmed,
              isOptimistic: true,
              isFailed: false,
            }
          : m
      )
    );
    const numericId = Number(message.id);

    if (!Number.isFinite(numericId)) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id ? { ...m, isOptimistic: false } : m
        )
      );
    return;
    }

    try {
      const res = await fetch(
        `http://localhost:4000/api/channels/${channelId}/messages/${numericId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: trimmed }),
        }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? { ...m, isOptimistic: false, isEdited: true }
            : m
        )
      );
    } catch (e) {
      console.error(e);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === message.id
            ? {
                ...m,
                content: message.content,
                isOptimistic: false,
                isFailed: true,
              }
            : m
        )
      );
      window.alert("Failed to update message (backend error).");
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
  async function handleDeleteMessage(message: UiMessage) {
    // If this is a purely optimistic (local-only) message or the id is not numeric,
    // we just remove it locally without calling the backend.
    const numericId = Number(message.id)
    if (!Number.isFinite(numericId)) {
      setMessages((prev) => prev.filter((m) => m.id !== message.id))
      return
    }

    try {
      const res = await fetch(
        `http://localhost:4000/api/channels/${channelId}/messages/${message.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      )

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      setMessages((prev) => prev.filter((m) => m.id !== message.id))
    } catch (e) {
      // Keep the message in the UI for now and just notify the user.
      console.error(e)
      window.alert("Failed to delete message (backend error).")
    }
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
        <MessageComposer
          onSend={handleSend}
          disabled={!!error}
        />
      </div>
    </div>
  )
}
