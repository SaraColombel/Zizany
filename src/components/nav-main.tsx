"use client"

import * as React from "react"
import { type Icon } from "@tabler/icons-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { useServers } from "@/components/servers-context"

interface NavItem {
  title: string
  url: string
  icon?: Icon
  imageUrl?: string

  /**
   * Whether the current user is allowed to leave this server.
   */
  canLeave?: boolean
}

export function NavMain({
  items,
}: {
  items: NavItem[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { refresh } = useServers()
  const [leavingId, setLeavingId] = React.useState<number | null>(null)
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

  const [leaveMenu, setLeaveMenu] = React.useState<{
    x: number
    y: number
    item: NavItem
  } | null>(null)
  const [confirmLeave, setConfirmLeave] = React.useState<NavItem | null>(null)

  function closeLeaveMenu() {
    setLeaveMenu(null)
  }

  function closeConfirmLeave() {
    setConfirmLeave(null)
  }

  function getServerId(item: NavItem) {
    const serverId = Number(item.url.split("/").filter(Boolean)[1])
    return Number.isFinite(serverId) ? serverId : null
  }

  async function handleLeave(item: NavItem) {
    const serverId = getServerId(item)
    if (serverId === null) {
      window.alert("Invalid server id.")
      closeLeaveMenu()
      closeConfirmLeave()
      return
    }
    if (leavingId === serverId) return
    closeLeaveMenu()

    setLeavingId(serverId)
    try {
      const res = await fetch(`${apiBase}/api/servers/${serverId}/leave`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        window.alert(
          data?.message ?? `Failed to leave server (HTTP ${res.status})`,
        )
        return
      }

      await refresh()
      if (pathname === item.url || pathname.startsWith(item.url + "/")) {
        router.push("/servers")
      }
    } catch (err) {
      window.alert("Network error while leaving the server.")
    } finally {
      setLeavingId(null)
      closeConfirmLeave()
    }
  }

  const leaveServerId = leaveMenu ? getServerId(leaveMenu.item) : null
  const confirmServerId = confirmLeave ? getServerId(confirmLeave) : null

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
                        <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-muted">
                          {/* Future owner-uploaded server image */}
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full rounded-full object-cover"
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

      {/* Right-click "Leave server" menu (non-owner only) */}
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
              disabled={leaveServerId !== null && leavingId === leaveServerId}
              onClick={() => setConfirmLeave(leaveMenu.item)}
            >
              {leavingId === leaveServerId
                ? "Leaving..."
                : "Leave server"}
            </Button>
          </div>
        </div>
      )}

      {confirmLeave && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={closeConfirmLeave}
          onKeyDown={(event) => {
            if (event.key === "Escape") closeConfirmLeave()
          }}
          role="presentation"
        >
          <div
            className="w-full max-w-sm rounded-md border bg-popover p-4 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-server-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="space-y-2">
              <h2 id="leave-server-title" className="text-sm font-semibold">
                Leave server
              </h2>
              <p className="text-sm text-muted-foreground">
                You are about to leave{" "}
                <span className="font-medium text-foreground">
                  {confirmLeave.title}
                </span>
                . This will remove your membership.
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-8 cursor-pointer px-3 text-xs"
                onClick={closeConfirmLeave}
                disabled={confirmServerId !== null && leavingId === confirmServerId}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-8 cursor-pointer px-3 text-xs"
                onClick={() => handleLeave(confirmLeave)}
                disabled={confirmServerId !== null && leavingId === confirmServerId}
              >
                {leavingId === confirmServerId
                  ? "Leaving..."
                  : "Leave server"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
