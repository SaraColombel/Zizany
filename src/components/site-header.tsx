"use client"
import * as React from "react"
import { IconSettings, IconCopy } from "@tabler/icons-react"
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
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [isCreatingInvite, setIsCreatingInvite] = React.useState(false)
  const [invitePanelOpen, setInvitePanelOpen] = React.useState(false)
  const [inviteCode, setInviteCode] = React.useState<string | null>(null)
  const [inviteExpiresAt, setInviteExpiresAt] = React.useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = React.useState(false)

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
        setIsAdmin(false)
        return
      }

      setIsOwner(false)
      setIsAdmin(false)
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
          setIsAdmin(Boolean(json?.isAdmin))
        }
      } catch {
        if (!cancelled) {
          setIsOwner(false)
          setIsAdmin(false)
        }
      }
    }

    loadOwnerFlag()
    return () => {
      cancelled = true
    }
  }, [serverId])

  const handleCreateInvite = React.useCallback(async () => {
    if (!serverId || isCreatingInvite) return
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

    setIsCreatingInvite(true)
    try {
      const res = await fetch(`${apiBase}/api/servers/${serverId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.message ?? `HTTP ${res.status}`)
      }

      const json = await res.json().catch(() => null)
      const code = typeof json?.code === "string" ? json.code : null
      const expiresAt = json?.expires_at
        ? new Date(json.expires_at).toLocaleString()
        : null

      if (!code) {
        throw new Error("Invite code missing from response")
      }

      setInviteCode(code)
      setInviteExpiresAt(expiresAt)
      setInviteCopied(false)
      setInvitePanelOpen(true)
    } catch (error) {
      window.alert(
        error instanceof Error
          ? `Failed to create invitation: ${error.message}`
          : "Failed to create invitation",
      )
    } finally {
      setIsCreatingInvite(false)
    }
  }, [isCreatingInvite, serverId])

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
                    isPublic={server?.isPublic}
                    open={settingsOpen}
                    onOwnershipTransferred={() => {
                      setSettingsOpen(false)
                      setIsOwner(false)
                      setIsAdmin(false)
                    }}
                    onDeleted={() => {
                      setSettingsOpen(false)
                      setIsOwner(false)
                      setIsAdmin(false)
                    }}
                  />
                )}
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Create invitation button aligned to the right when on a specific server */}
        {serverId && (isOwner || isAdmin) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto h-8 cursor-pointer px-3 text-xs"
            onClick={handleCreateInvite}
            disabled={isCreatingInvite}
          >
            {isCreatingInvite ? "Creating..." : "Create invitation"}
          </Button>
        )}
      </div>

      {invitePanelOpen && inviteCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Invitation code</h2>
                <p className="text-xs text-muted-foreground">
                  Share this code with the person you want to invite.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="cursor-pointer"
                onClick={() => {
                  setInvitePanelOpen(false)
                  setInviteCopied(false)
                }}
              >
                Close
              </Button>
            </div>

            <div className="mt-4 rounded-md border bg-muted/30 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="font-mono text-lg tracking-widest">
                  {inviteCode}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="cursor-pointer gap-2"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteCode)
                      setInviteCopied(true)
                      setTimeout(() => setInviteCopied(false), 1500)
                    } catch {
                      setInviteCopied(false)
                    }
                  }}
                >
                  <IconCopy className="h-4 w-4" />
                  {inviteCopied ? "Copied" : "Copy"}
                </Button>
              </div>
              {inviteExpiresAt && (
                <div className="mt-2 text-xs text-muted-foreground">
                  Expires at {inviteExpiresAt}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
