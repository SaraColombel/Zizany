"use client"

import * as React from "react"
import { MessageList, UiMessage } from "./message-list"
import { MessageComposer } from "./message-composer"

// Historique mocké par serveur et channel
const MOCK_HISTORY: Record<string, Record<string, UiMessage[]>> = {
  "srv-1": {
    general: [
      {
        id: "s1-g-1",
        authorName: "Alice",
        content: "Bienvenue sur le serveur Epitech 👋",
        createdAt: "2024-01-01T09:00:00.000Z",
      },
      {
        id: "s1-g-2",
        authorName: "Bob",
        content: "N’oubliez pas de lire le règlement dans #general.",
        createdAt: "2024-01-01T09:05:00.000Z",
      },
    ],
    random: [
      {
        id: "s1-r-1",
        authorName: "Charlie",
        content: "Ici c’est le channel pour les memes 😄",
        createdAt: "2024-01-02T10:00:00.000Z",
      },
    ],
  },
  "srv-2": {
    general: [
      {
        id: "s2-g-1",
        authorName: "Bot",
        content: "Bienvenue sur Döppelgang HQ.",
        createdAt: "2024-01-03T08:00:00.000Z",
      },
      {
        id: "s2-g-2",
        authorName: "Admin",
        content: "Les déploiements se font le vendredi.",
        createdAt: "2024-01-03T08:10:00.000Z",
      },
    ],
    random: [
      {
        id: "s2-r-1",
        authorName: "Dev",
        content: "Qui est chaud pour un game ce soir ?",
        createdAt: "2024-01-04T18:30:00.000Z",
      },
    ],
  },
  "srv-3": {
    general: [
      {
        id: "s3-g-1",
        authorName: "SpaceNerd",
        content: "Bienvenue sur Space Nerds 🚀",
        createdAt: "2024-01-05T12:00:00.000Z",
      },
    ],
    random: [
      {
        id: "s3-r-1",
        authorName: "Astro",
        content: "Vous avez vu la dernière photo de la NASA ?",
        createdAt: "2024-01-05T12:30:00.000Z",
      },
    ],
  },
}

export function ChatPane({
  serverId,
  channelId,
}: {
  serverId: string
  channelId: string
}) {
  const [messages, setMessages] = React.useState<UiMessage[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Chargement historique (mock)
  React.useEffect(() => {
    let cancelled = false

    async function loadHistory() {
      try {
        setLoading(true)
        setError(null)

        const serverHistory = MOCK_HISTORY[serverId] ?? {}
        const channelHistory = serverHistory[channelId] ?? []

        if (!cancelled) setMessages(channelHistory)
      } catch (e) {
        if (!cancelled) setError("Failed to load messages")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadHistory()
    return () => {
      cancelled = true
    }
  }, [serverId, channelId])

  async function handleSend(content: string) {
    const optimistic: UiMessage = {
      id: crypto.randomUUID(),
      authorName: "You",
      content,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    }

    setMessages((prev) => [...prev, optimistic])

    // TODO:
    // socket.emit("message:create", { serverId, channelId, content })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Channel header */}
      <div className="border-b px-4 py-3 text-sm">
        Channel {channelId}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <MessageList messages={messages} loading={loading} error={error} />
      </div>

      {/* Composer */}
      <div className="border-t p-3">
        <MessageComposer onSend={handleSend} disabled={!!error} />
      </div>
    </div>
  )
}
