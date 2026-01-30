"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

type Channel = {
  id: number
  server_id: number
  name: string
}

export function ServerChannelsSidebar({ serverId }: { serverId: string }) {
  const pathname = usePathname()
  const [channels, setChannels] = React.useState<Channel[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(
          `http://localhost:4000/api/servers/${serverId}/channels`,
          {
            headers: { "Content-Type": "application/json" },
          }
        )

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()

        const normalized: Channel[] = (json.channels ?? [])
          .map((raw: any) => {
            const base = raw && raw.props ? raw.props : raw
            if (!base) return null

            const id = Number(base.id)
            const server_id = Number(base.server_id)
            if (!Number.isFinite(id) || !Number.isFinite(server_id)) return null

            return {
              id,
              server_id,
              name: String(base.name ?? "Untitled channel"),
            } satisfies Channel
          })
          .filter((c: Channel | null): c is Channel => c !== null)

        if (!cancelled) {
          setChannels(normalized)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load channels")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [serverId])

  return (
    <div className="p-3">
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        Channels
      </div>

      {loading && (
        <div className="text-xs text-muted-foreground">Loading channels…</div>
      )}

      {error && !loading && (
        <div className="text-xs text-red-500">Failed to load channels</div>
      )}

      {!loading && !error && channels.length === 0 && (
        <div className="text-xs text-muted-foreground">No channels</div>
      )}

      <div className="mt-1 flex flex-col gap-1">
        {channels.map((channel) => {
          const href = `/servers/${serverId}/channels/${channel.id}`
          const isActive = pathname === href

          return (
            <Link
              key={channel.id}
              href={href}
              className={
                "rounded px-2 py-1 text-sm " +
                (isActive
                  ? "bg-muted font-medium text-foreground"
                  : "hover:bg-muted text-muted-foreground")
              }
            >
              #{channel.name}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
