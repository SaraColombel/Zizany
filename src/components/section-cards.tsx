"use client"

import Image from "next/image"
import Link from "next/link"
import { useServers } from "@/components/servers-context"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SectionCards() {
  const { servers, error } = useServers()

  if (error) {
    return <div className="px-4 text-sm text-red-500">Failed to load servers</div>
  }

  if (servers.length === 0) {
    return <div className="px-4 text-sm text-muted-foreground">No servers</div>
  }

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {servers.map((server) => {
        return (
          <Card key={server.id} className="@container/card">
            <CardHeader>
              <div className="relative mb-2 h-24 w-full overflow-hidden rounded-md">
                <Image
                  src={server.banner ?? "/servers/banner.jpeg"}
                  alt={`${server.name} banner`}
                  fill
                  className="object-cover"
                />
              </div>
              <CardTitle className="text-1xl font-semibold @[250px]/card:text-2xl">
                {server.name}
              </CardTitle>
            </CardHeader>
              <CardFooter className="flex items-center justify-between gap-1.5 text-sm">
              <div className="flex flex-col items-start gap-1">
                <div className="line-clamp-1 flex gap-2 font-medium">
                  <span>{server.members ?? "—"} members </span>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
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
                {/* <div className="text-muted-foreground">
                  {server.subtitle}
                </div> */}
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/servers/${server.id}`}>
                  Rejoindre
                </Link>
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
