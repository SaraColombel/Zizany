"use client"

import * as React from "react"
import { IconUsers, IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { io, type Socket } from "socket.io-client"
import { cn } from "@/lib/utils"

interface Member {
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

interface RawMember extends Partial<Member> {
  props?: Partial<Member>
}

async function fetchMembers(serverId: string, apiBase: string): Promise<Member[]> {
  const res = await fetch(`${apiBase}/api/servers/${serverId}/members`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const json = await res.json()
  const normalized: Member[] = (json.members ?? [])
    .map((raw: RawMember) => {
      const base = raw && raw.props ? raw.props : raw
      if (!base) return null
      const id = Number(base.id)
      const user_id = Number(base.user_id)
      const server_id = Number(base.server_id)
      const role_id = Number(base.role_id)
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
        user: base.user
          ? {
              id: Number(base.user.id),
              username: String(base.user.username ?? "Unknown user"),
              thumbnail: base.user.thumbnail ?? null,
            }
          : undefined,
        role: base.role
          ? {
              id: Number(base.role.id),
              name: String(base.role.name ?? "Member"),
            }
          : undefined,
      } satisfies Member
    })
    .filter((m: Member | null): m is Member => m !== null)

  return normalized
}

export function ServerMembersSidebar({ serverId }: { serverId: string }) {
  const OFFLINE_GRACE_MS = 1500
  const [open, setOpen] = React.useState(true)
  const [members, setMembers] = React.useState<Member[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const [onlineUserIds, setOnlineUserIds] = React.useState<number[]>([])
  const [presenceReady, setPresenceReady] = React.useState(false)
  const socketRef = React.useRef<Socket | null>(null)
  const mountedRef = React.useRef(true)
  const offlineTimersRef = React.useRef<Map<number, ReturnType<typeof setTimeout>>>(
    new Map(),
  )
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

  const onlineSet = React.useMemo(() => {
    return new Set(onlineUserIds)
  }, [onlineUserIds])

  const onlineMembers = React.useMemo(() => {
    return members.filter((m) => onlineSet.has(m.user_id))
  }, [members, onlineSet])

  const offlineMembers = React.useMemo(() => {
    return members.filter((m) => !onlineSet.has(m.user_id))
  }, [members, onlineSet])

  function getRoleMeta(roleId: number) {
    if (roleId === 1) {
      return { label: "Owner", className: "text-yellow-200" }
    }
    if (roleId === 2) {
      return { label: "Admin", className: "text-red-300" }
    }
    return { label: null, className: "" }
  }

  React.useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const refreshMembers = React.useCallback(
    async (options?: { silent?: boolean }) => {
      if (!serverId) {
        if (!mountedRef.current) return
        setMembers([])
        setLoading(false)
        setError(null)
        return
      }

      if (!options?.silent) {
        setLoading(true)
        setError(null)
      }

      try {
        const normalized = await fetchMembers(serverId, apiBase)
        if (!mountedRef.current) return
        setMembers(normalized)
        setError(null)
      } catch (e) {
        if (!mountedRef.current) return
        if (!options?.silent) {
          setError(e instanceof Error ? e.message : "Failed to load members")
        }
      } finally {
        if (!options?.silent && mountedRef.current) {
          setLoading(false)
        }
      }
    },
    [serverId, apiBase],
  )

  React.useEffect(() => {
    refreshMembers()
  }, [refreshMembers])

  React.useEffect(() => {
    const offlineTimers = offlineTimersRef.current
    setOnlineUserIds([])
    setPresenceReady(false)
    offlineTimers.forEach((timer) => clearTimeout(timer))
    offlineTimers.clear()
    const socket = io(process.env.NEXT_PUBLIC_WS_URL ?? "http://localhost:4000", {
      withCredentials: true,
      transports: ["websocket"],
    })

    socketRef.current = socket

    socket.on("connect", () => {
      socket.emit("server:join", { serverId: Number(serverId) })
    })

    socket.on(
      "presence:update",
      (payload: { serverId: number; onlineUserIds: number[] }) => {
        if (Number(payload.serverId) !== Number(serverId)) return
        const nextOnline = new Set(
          Array.isArray(payload.onlineUserIds) ? payload.onlineUserIds : [],
        )
        setOnlineUserIds((prev) => {
          const merged = new Set(prev)

          nextOnline.forEach((id) => {
            const timer = offlineTimers.get(id)
            if (timer) {
              clearTimeout(timer)
              offlineTimers.delete(id)
            }
            merged.add(id)
          })

          merged.forEach((id) => {
            if (nextOnline.has(id)) return
            if (offlineTimers.has(id)) return
            const timer = setTimeout(() => {
              setOnlineUserIds((current) => current.filter((x) => x !== id))
              offlineTimers.delete(id)
            }, OFFLINE_GRACE_MS)
            offlineTimers.set(id, timer)
          })

          return Array.from(merged)
        })
        setPresenceReady(true)
      },
    )

    socket.on(
      "server:member_joined",
      (payload: { serverId: number; userId: number; username?: string }) => {
        if (Number(payload.serverId) !== Number(serverId)) return
        refreshMembers({ silent: true })
      },
    )

    socket.on(
      "server:member_left",
      (payload: { serverId: number; userId: number; username?: string }) => {
        if (Number(payload.serverId) !== Number(serverId)) return
        refreshMembers({ silent: true })
      },
    )

    socket.on("disconnect", () => {
      setPresenceReady(false)
    })

    return () => {
      socket.off("connect")
      socket.off("presence:update")
      socket.off("server:member_joined")
      socket.off("server:member_left")
      socket.off("disconnect")
      socket.disconnect()
      socketRef.current = null
      offlineTimers.forEach((timer) => clearTimeout(timer))
      offlineTimers.clear()
    }
  }, [serverId, refreshMembers])

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
          {!loading && !error && !presenceReady && (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Membres
              </div>
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted"
                >
                  <IconUsers className="h-4 w-4" />
                  <span
                    className={getRoleMeta(m.role_id).className}
                    title={getRoleMeta(m.role_id).label ?? undefined}
                  >
                    {m.user?.username ?? "Unknown user"}
                  </span>
                </div>
              ))}
            </>
          )}

          {!loading && !error && presenceReady && (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                En ligne ({onlineMembers.length})
              </div>
              {onlineMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted"
                >
                  <IconUsers className="h-4 w-4" />
                  <span
                    className={getRoleMeta(m.role_id).className}
                    title={getRoleMeta(m.role_id).label ?? undefined}
                  >
                    {m.user?.username ?? "Unknown user"}
                  </span>
                  <span
                    className="ml-auto h-2 w-2 rounded-full bg-emerald-500"
                    aria-label="Online"
                  />
                </div>
              ))}

              <div className="pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Hors ligne ({offlineMembers.length})
              </div>
              {offlineMembers.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-2 rounded px-2 py-1 text-muted-foreground"
                >
                  <IconUsers className="h-4 w-4" />
                  <span
                    className={getRoleMeta(m.role_id).className}
                    title={getRoleMeta(m.role_id).label ?? undefined}
                  >
                    {m.user?.username ?? "Unknown user"}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </aside>
  )
}
