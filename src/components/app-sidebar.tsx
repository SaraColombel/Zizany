"use client"

import * as React from "react"
import {
  IconCamera,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconCirclePlus,
  IconSettings,
  IconList
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Epitech",
      url: "/servers/srv-1",
      icon: IconDatabase,
      imageUrl: "/servers/epitech.png",
    },
    {
      title: "Döppelgang HQ",
      url: "/servers/srv-2",
      icon: IconDatabase,
    },
    {
      title: "Space Nerds",
      url: "/servers/srv-3",
      icon: IconDatabase,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: IconCamera,
      isActive: true,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Proposal",
      icon: IconFileDescription,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
    {
      title: "Prompts",
      icon: IconFileAi,
      url: "#",
      items: [
        {
          title: "Active Proposals",
          url: "#",
        },
        {
          title: "Archived",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Server List",
      url: "/servers",
      icon: IconList,
    },
    {
      title: "Join a server",
      url: "/servers",
      icon: IconCirclePlus,
    },
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
  ]
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <span className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          My servers
        </span>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}