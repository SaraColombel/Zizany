"use client"

/**
 * ServerChannelsSidebar
 * ---------------------
 * Sidebar section that lists channels for the current server.
 *
 * Responsibilities (UI only):
 * - Fetch and display channels for a given server
 * - Show loading / error / empty states
 * - Expose a "Create channel" button that opens a simple pop-up
 *   to collect the new channel name (backend wiring will be added later)
 */

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconPlus } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Minimal channel shape used in the sidebar.
 * Matches the subset of fields returned by the channels API.
 */
type Channel = {
  id: number
  server_id: number
  name: string
}

type ServerChannelsSidebarProps = {
  serverId: string

  /**
   * Whether the current user is allowed to manage channels
   * (Admin OR Owner on this server).
   *
   * Backend integration plan:
   * - once we can fetch the current membership for this server,
   *   we will compute:
   *     canManageChannels = role === "Admin" || role === "Owner"
   *   in the parent layout and pass it down here.
   */
  canManageChannels?: boolean
}

export function ServerChannelsSidebar({
  serverId,
  canManageChannels = true,
}: ServerChannelsSidebarProps) {
  const pathname = usePathname()

  // Channels list and fetch status.
  const [channels, setChannels] = React.useState<Channel[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)

  // Local state for the "create channel" pop-up.
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [newChannelName, setNewChannelName] = React.useState("")

  /**
   * Load channels for the given server on mount and whenever serverId changes.
   *
   * Notes:
   * - The backend may return either domain entities ({ props }) or plain objects, so
   *   we normalize the payload here.
   * - The `cancelled` flag prevents state updates after unmount.
   */
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

  /**
   * Handle submission of the "create channel" pop-up form.
   *
   * For now this does not call the backend:
   * - it only logs the future payload in the console
   * - real API integration (POST /servers/:id/channels) will be added later
   */
  function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault()
    const trimmed = newChannelName.trim()
    if (!trimmed) return

    console.log(
      "New channel created on server",
      serverId,
      "named:",
      trimmed
    )

    setNewChannelName("")
    setIsCreateOpen(false)
  }

  return (
    <div className="relative p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
        <span>Channels</span>

        {/* Add channel button (visible only to Admin/Owner once roles are wired) */}
        {canManageChannels && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 cursor-pointer p-0"
            aria-label="Add a channel"
            onClick={() => {
              setIsCreateOpen(true)
            }}
          >
            <IconPlus className="h-3 w-3" />
          </Button>
        )}
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

      {/* Simple centered pop-up to enter the new channel name (Admin/Owner only) */}
      {canManageChannels && isCreateOpen && (
        <div className="bg-background/80 pointer-events-auto absolute inset-0 z-20 flex items-center justify-center backdrop-blur-sm">
          <div className="w-full max-w-xs rounded-md border bg-popover p-4 shadow-lg">
            <h2 className="mb-3 text-sm font-semibold">
              Create a new channel
            </h2>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">
                  Channel name
                </label>
                <Input
                  autoFocus
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="ex: general"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 cursor-pointer text-xs"
                  onClick={() => {
                    setIsCreateOpen(false)
                    setNewChannelName("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 cursor-pointer text-xs"
                  disabled={!newChannelName.trim()}
                >
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
