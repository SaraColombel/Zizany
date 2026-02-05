"use client";

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useServers } from "@/components/servers-context"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards() {
  const router = useRouter()
  const { servers, error, refresh } = useServers()
  const [joiningIds, setJoiningIds] = React.useState<Set<number>>(new Set())
  const [joinedIds, setJoinedIds] = React.useState<Set<number>>(new Set())
  const [joinErrors, setJoinErrors] = React.useState<Record<number, string>>(
    {},
  )
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
  const availableServers = servers.filter(
    (server) => server.isPublic && !server.isMember && !joinedIds.has(server.id),
  )

  if (error) {
    return (
      <div className="px-4 text-sm text-red-500">Failed to load servers</div>
    );
  }

  if (availableServers.length === 0) {
    return <div className="px-4 text-sm text-muted-foreground">No servers</div>
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {availableServers.map((server) => {
        return (
          <Card key={server.id} className="@container/card p-0 gap-1">
            <CardHeader className="p-3 pb-2">
              <div className="relative mb-3 h-24 w-full overflow-hidden rounded-md">
                <Image
                  src={server.banner ?? "/servers/banner.jpeg"}
                  alt={`${server.name} banner`}
                  fill
                  className="object-cover object-center"
                />
              </div>
              <CardTitle className="text-1xl font-semibold @[250px]/card:text-2xl">
                {server.name}
              </CardTitle>
            </CardHeader>
            <CardFooter className="flex items-center justify-between gap-1.5 px-3 pb-3 pt-0 text-sm">
              <div className="flex flex-col items-start gap-1">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  <span>{server.members ?? "—"} members </span>
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    |
                    <span
                      className="h-2 w-2 rounded-full bg-emerald-500"
                      aria-hidden="true"
                    />
                    <span className="text-foreground">
                      {server.onlineMembers ?? 0}
                    </span>
                  </span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="cursor-pointer"
                disabled={
                  joiningIds.has(server.id) || joinedIds.has(server.id)
                }
                onClick={async () => {
                  setJoinErrors((prev) => {
                    const next = { ...prev }
                    delete next[server.id]
                    return next
                  })
                  setJoiningIds((prev) => {
                    const next = new Set(prev)
                    next.add(server.id)
                    return next
                  })

                  try {
                    const res = await fetch(
                      `${apiBase}/api/servers/${server.id}/join`,
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        credentials: "include",
                      },
                    )

                    if (!res.ok) {
                      const data = await res.json().catch(() => null)
                      setJoinErrors((prev) => ({
                        ...prev,
                        [server.id]:
                          data?.message ??
                          `Failed to join (HTTP ${res.status})`,
                      }))
                      return
                    }

                    setJoinedIds((prev) => {
                      const next = new Set(prev)
                      next.add(server.id)
                      return next
                    })
                    await refresh()
                    router.push(`/servers/${server.id}`)
                  } catch (err) {
                    setJoinErrors((prev) => ({
                      ...prev,
                      [server.id]: "Network error while joining",
                    }))
                  } finally {
                    setJoiningIds((prev) => {
                      const next = new Set(prev)
                      next.delete(server.id)
                      return next
                    })
                  }
                }}
              >
                {joinedIds.has(server.id) ? "Rejoint" : "Rejoindre"}
              </Button>
            </CardFooter>
            {joinErrors[server.id] && (
              <div className="px-3 pb-3 text-xs text-red-500">
                {joinErrors[server.id]}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
