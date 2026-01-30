"use client"

import * as React from "react"
import { type Icon } from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

type NavItem = {
  title: string
  url: string
  icon?: Icon
  imageUrl?: string

  /**
   * Whether the current user is allowed to leave this server.
   *
   * Backend integration plan:
   * - once we know the current user's membership + owner status,
   *   the parent (AppSidebar) will compute:
   *     canLeave = role !== "Owner"
   *   and pass it down.
   */
  canLeave?: boolean
}

export function NavMain({
  items,
}: {
  items: NavItem[]
}) {
  const pathname = usePathname()

  const [leaveMenu, setLeaveMenu] = React.useState<{
    x: number
    y: number
    item: NavItem
  } | null>(null)

  function closeLeaveMenu() {
    setLeaveMenu(null)
  }

  return (
    <>
      <SidebarGroup>
        <SidebarGroupContent className="flex flex-col gap-2">
          <SidebarMenu>
            {items.map((item) => {
              const isActive =
                pathname === item.url || pathname.startsWith(item.url + "/")

              return (
                <SidebarMenuItem
                  key={item.url}
                  onContextMenu={(event) => {
                    // Only show "Leave" if allowed for this server.
                    if (!item.canLeave) return
                    event.preventDefault()
                    setLeaveMenu({
                      x: event.clientX,
                      y: event.clientY,
                      item,
                    })
                  }}
                >
                  <SidebarMenuButton asChild tooltip={item.title} isActive={isActive}>
                    <Link href={item.url}>
                      {item.imageUrl ? (
                        <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-md bg-muted">
                          {/* Future owner-uploaded server image */}
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-5 w-5 object-cover"
                          />
                        </span>
                      ) : (
                        item.icon && <item.icon />
                      )}
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Right-click "Leave server" menu (non-owner only in the future) */}
      {leaveMenu && (
        <div
          className="pointer-events-auto fixed inset-0 z-40"
          onClick={closeLeaveMenu}
          onContextMenu={(event) => {
            event.preventDefault()
            closeLeaveMenu()
          }}
        >
          <div
            className="rounded-md border bg-popover p-2 shadow-lg"
            style={{
              position: "absolute",
              top: leaveMenu.y,
              left: leaveMenu.x,
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <Button
              type="button"
              variant="destructive"
              className="h-8 w-full cursor-pointer px-3 text-xs"
              onClick={() => {
                // Placeholder: later this will call something like
                // DELETE /api/servers/:id/memberships/me
                // and redirect away from the server.
                const serverId = leaveMenu.item.url.split("/").filter(Boolean)[1]
                window.alert(
                  `Leave server "${leaveMenu.item.title}" (id: ${serverId ?? "unknown"}) is not wired to the backend yet.\n` +
                    "Later, this action will remove your membership from this server."
                )
                closeLeaveMenu()
              }}
            >
              Leave server
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
