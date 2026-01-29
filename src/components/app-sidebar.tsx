"use client"

import * as React from "react"
import {
  IconDatabase,
  IconCirclePlus,
  IconSettings,
  IconList
} from "@tabler/icons-react"

import { useServers } from "@/components/servers-context"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"

type Server = {
  id:number
  name: string
  thumbnail: string | null
  banner: string | null
}

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "favicon.ico",
  },
  navSecondary: [
    { title: "Server List", url: "/servers", icon: IconList },
    { title: "Join a server", url: "/servers", icon: IconCirclePlus },
    { title: "Settings", url: "#", icon: IconSettings },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { servers } = useServers()

  const navMain = servers.map((s) => ({
    title: s.name,
    url: `/servers/${s.id}`,
    icon: IconDatabase,
    imageUrl: s.thumbnail ?? undefined,
  }))

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <span className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          My servers
        </span>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}