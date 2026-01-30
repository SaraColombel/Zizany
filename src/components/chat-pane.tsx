"use client"

import * as React from "react"
import { MessageList, UiMessage } from "./message-list"
import { MessageComposer } from "./message-composer"

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
  serverId: string
  channelId: string
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
              createdAt: String(base.created_at ?? new Date().toISOString()),
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
   * Load channel metadata (name) so we can display it
   * instead of the raw channel id.
   *
   * Uses the same /api/servers/:id/channels endpoint as the sidebar
   * and is resilient to the backend returning either domain entities
   * ({ props: { ... } }) or plain objects.
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
    const tempId = crypto.randomUUID()

    const optimistic: UiMessage = {
      id: tempId,
      authorName: "You",
      content,
      createdAt: new Date().toISOString(),

      // Client-only flag (must never be stored in DB)
      isOptimistic: true,
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
   * Edit handler (UI-only).
   *
   * This currently updates local state only.
   * Later, this must:
   * - check permissions (backend)
   * - emit socket / REST update
   */
  function handleEditMessage(message: UiMessage) {
    const next = window.prompt("Edit message:", message.content)
    if (next == null) return

    setMessages((prev) =>
      prev.map((m) =>
        m.id === message.id
          ? {
              ...m,
              content: next,
              isOptimistic: true, // until backend confirms
            }
          : m
      )
    )
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
