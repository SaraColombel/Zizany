"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const CHANNELS = [
  { id: "general", name: "general" },
  { id: "random", name: "random" },
]

export function ServerChannelsSidebar({ serverId }: { serverId: string }) {
  const pathname = usePathname()

  return (
    <div className="p-3">
      <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
        Channels
      </div>

      <div className="flex flex-col gap-1">
        {CHANNELS.map((channel) => {
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
