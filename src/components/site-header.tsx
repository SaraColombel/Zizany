"use client"
import * as React from "react"
import { IconSettings } from "@tabler/icons-react"
import { useServers } from "@/components/servers-context"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ServerSettingsPanel } from "@/components/server-settings-panel"

export function SiteHeader() {
  const pathname = usePathname()
  const { servers } = useServers()
  const [isOwner, setIsOwner] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  // match /servers ou /servers/srv-3 ou /servers/srv-3/...
  const parts = pathname.split("/").filter(Boolean)
  const serverId = parts[0] === "servers" ? parts[1] : undefined

  const server = servers.find((s) => String(s.id) === serverId)

  const title = server
    ? server.name
    : serverId
      ? "Server"
      : "Servers List"

  React.useEffect(() => {
    let cancelled = false
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

    async function loadOwnerFlag() {
      if (!serverId) {
        setIsOwner(false)
        return
      }

      setIsOwner(false)
      try {
        const res = await fetch(`${apiBase}/api/servers/${serverId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        })

        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        const json = await res.json()
        if (!cancelled) {
          setIsOwner(Boolean(json?.isOwner))
        }
      } catch {
        if (!cancelled) {
          setIsOwner(false)
        }
      }
    }

    loadOwnerFlag()
    return () => {
      cancelled = true
    }
  }, [serverId])

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 cursor-pointer [&_svg]:cursor-pointer" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <div className="flex items-center gap-2">
          <h1 className="text-base font-medium">{title}</h1>
          {serverId && isOwner && (
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 cursor-pointer"
                  aria-label="Server settings"
                >
                  <IconSettings className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[min(92vw,650px)] p-0 sm:max-w-none"
                closeClassName="top-6"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Server settings</SheetTitle>
                </SheetHeader>
                {serverId && (
                  <ServerSettingsPanel
                    serverId={serverId}
                    serverName={server?.name}
                    open={settingsOpen}
                    onOwnershipTransferred={() => {
                      setSettingsOpen(false)
                      setIsOwner(false)
                    }}
                    onDeleted={() => {
                      setSettingsOpen(false)
                      setIsOwner(false)
                    }}
                  />
                )}
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Create invitation button aligned to the right when on a specific server */}
        {serverId && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto h-8 cursor-pointer px-3 text-xs"
            onClick={() => {
              // Placeholder: later this will call something like
              // POST /api/servers/:id/invitations and show a generated link.
              window.alert(
                "Create invitation is not wired to the backend yet.\n" +
                  "Later, this button will generate an invitation link for this server."
              )
            }}
          >
            Create invitation
          </Button>
        )}
      </div>
    </header>
  )
}
