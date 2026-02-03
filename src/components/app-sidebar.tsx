"use client"

/**
 * AppSidebar
 * ----------
 * Main application sidebar.
 *
 * Responsibilities:
 * - Display the list of servers the user belongs to
 * - Display secondary navigation actions (join / create / settings)
 * - Display the current user section
 *
 * This component is a pure UI + composition layer:
 * - it does NOT fetch data itself
 * - it does NOT contain business logic
 * - it relies entirely on context providers
 */

import * as React from "react"
import {
  IconDatabase,
  IconCirclePlus,
  IconSettings,
  IconList,
  IconPencil,
} from "@tabler/icons-react"
import dynamic from "next/dynamic"

import { useServers } from "@/components/servers-context"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar"

// NavUser uses Radix dropdown + sidebar menu button.
// Rendering it only on the client avoids occasional
// SSR/CSR id mismatches (hydration warnings) in dev.
const NavUser = dynamic(
  () => import("@/components/nav-user").then((m) => m.NavUser),
  { ssr: false }
)

/**
 * Server type as exposed to the UI.
 *
 * This is NOT the full backend model.
 * Only the fields required for navigation are present.
 */
type Server = {
  id: number
  name: string
  thumbnail: string | null
  banner: string | null
}

/**
 * Static data for user and secondary navigation.
 *
 * Notes:
 * - `navSecondary` items are UI-level actions
 * - "Create a server" is handled as an action, not as a navigation route
 *   (actual behavior is implemented in NavSecondary)
 */
const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "favicon.ico",
  },
  navSecondary: [
    {
      title: "Servers List",
      url: "/servers",
      icon: IconList,
    },
    {
      title: "Join a server",
      url: "/servers",
      icon: IconCirclePlus,
    },
    {
      title: "Create a server",
      url: "/servers/new",
      icon: IconPencil,
      // action is handled inside NavSecondary
    },
    {
      title: "Settings",
      url: "#",
      icon: IconSettings,
    },
  ],
}

export function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  /**
   * Server list comes from ServersContext.
   *
   * This context is responsible for:
   * - fetching servers from the backend
   * - exposing them to the UI
   *
   * AppSidebar only consumes the data.
   */
  const { servers } = useServers()

  /**
   * Primary navigation items (one per server).
   *
   * Each server is mapped to a sidebar entry.
   * The URL structure is expected to be:
   * /servers/:serverId
   */
  const navMain = servers
    .filter((s) => s.isMember)
    .map((s) => ({
      title: s.name,
      url: `/servers/${s.id}`,
      icon: IconDatabase,

    /**
     * Optional thumbnail.
     * If undefined, NavMain will fallback to the default icon.
     */
    imageUrl: s.thumbnail ?? undefined,

      /**
       * Placeholder: all servers are leavable for now.
       * Once we know the current user's role per server, this will become:
       *   canLeave = role !== "Owner"
       */
      canLeave: true,
    }))

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      {/* Sidebar header */}
      <SidebarHeader>
        <span className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          My servers
        </span>
      </SidebarHeader>

      {/* Main content */}
      <SidebarContent>
        {/* Server list */}
        <NavMain items={navMain} />

        {/* Secondary actions (join / create / settings) */}
        <NavSecondary
          items={data.navSecondary}
          className="mt-auto"
        />
      </SidebarContent>

      {/* User section */}
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
