"use client"

import * as React from "react"
import { IconUsers, IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

type Member = {
  id: number
  user_id: number
  server_id: number
  role_id: number
  user?: {
    id: number
    username: string
    thumbnail: string | null
  }
  role?: {
    id: number
    name: string
  }
}

export function ServerMembersSidebar({ serverId }: { serverId: string }) {
  const [open, setOpen] = React.useState(true)
  const [members, setMembers] = React.useState<Member[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

    async function loadMembers() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(`${apiBase}/api/servers/${serverId}/members`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        const normalized: Member[] = (json.members ?? [])
          .map((raw: any) => {
            if (!raw) return null
            const id = Number(raw.id)
            const user_id = Number(raw.user_id)
            const server_id = Number(raw.server_id)
            const role_id = Number(raw.role_id)
            if (
              !Number.isFinite(id) ||
              !Number.isFinite(user_id) ||
              !Number.isFinite(server_id) ||
              !Number.isFinite(role_id)
            )
              return null

            return {
              id,
              user_id,
              server_id,
              role_id,
              user: raw.user
                ? {
                    id: Number(raw.user.id),
                    username: String(raw.user.username ?? "Unknown user"),
                    thumbnail: raw.user.thumbnail ?? null,
                  }
                : undefined,
              role: raw.role
                ? {
                    id: Number(raw.role.id),
                    name: String(raw.role.name ?? "Member"),
                  }
                : undefined,
            } satisfies Member
          })
          .filter((m: Member | null): m is Member => m !== null)

        if (!cancelled) setMembers(normalized)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load members")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (serverId) {
      loadMembers()
    } else {
      setMembers([])
      setLoading(false)
    }

    return () => {
      cancelled = true
    }
  }, [serverId])

  return (
    <aside
      className={[
        "border-l shrink-0 h-full",
        open ? "w-40" : "w-12",
        "transition-[width] duration-200",
      ].join(" ")}
    >
      <div className="p-3 flex items-center justify-between">
        {open && (
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Members ({members.length})
          </span>
        )}

        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle members panel"
          className={cn("rounded p-1 hover:bg-muted cursor-pointer transition")}
        >
          {open ? (
            <IconChevronRight className="h-4 w-4" />
          ) : (
            <IconChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-2 text-sm">
          {loading && (
            <div className="text-xs text-muted-foreground">Loading...</div>
          )}
          {error && !loading && (
            <div className="text-xs text-destructive">
              Failed to load members.
            </div>
          )}
          {!loading && !error && members.length === 0 && (
            <div className="text-xs text-muted-foreground">No members yet.</div>
          )}
          {!loading &&
            !error &&
            members.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted"
              >
                <IconUsers className="h-4 w-4" />
                <span>{m.user?.username ?? "Unknown user"}</span>
              </div>
            ))}
        </div>
      )}
    </aside>
  )
}
