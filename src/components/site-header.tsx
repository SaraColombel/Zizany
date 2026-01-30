"use client"
import { useServers } from "@/components/servers-context"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

export function SiteHeader() {
  const pathname = usePathname()
  const { servers } = useServers()

  // match /servers ou /servers/srv-3 ou /servers/srv-3/...
  const parts = pathname.split("/").filter(Boolean)
  const serverId = parts[0] === "servers" ? parts[1] : undefined

  const server = servers.find((s) => String(s.id) === serverId)

  const title = server
    ? server.name
    : serverId
      ? "Server"
      : "Servers List"

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 cursor-pointer [&_svg]:cursor-pointer" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-medium">{title}</h1>

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
