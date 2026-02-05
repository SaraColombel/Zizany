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
 * Static data for user and secondary navigation.
 *
 * Notes:
 * - `navSecondary` items are UI-level actions
 * - "Create a server" is handled as an action, not as a navigation route
 *   (actual behavior is implemented in NavSecondary)
 */
const data = {
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
    // {
    //   title: "Settings",
    //   url: "#",
    //   icon: IconSettings,
    // },
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
  const [user, setUser] = React.useState<{
    name: string
    email: string
    avatar: string | null
  } | null>(null)

  React.useEffect(() => {
    let cancelled = false
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000"

    async function loadUser() {
      try {
        const res = await fetch(`${apiBase}/api/auth/me`, {
          method: "GET",
          credentials: "include",
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        if (cancelled) return

        setUser({
          name: String(json.username ?? "Unknown user"),
          email: String(json.email ?? ""),
          avatar: typeof json.thumbnail === "string" ? json.thumbnail : null,
        })
      } catch {
        if (!cancelled) {
          setUser(null)
        }
      }
    }

    loadUser()
    return () => {
      cancelled = true
    }
  }, [])

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
       * Backend provides whether the current user can leave the server.
       */
      canLeave: s.canLeave,
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
        {user ? (
          <NavUser user={user} />
        ) : (
          <div className="px-3 py-4 text-xs text-muted-foreground">
            Loading profile...
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
