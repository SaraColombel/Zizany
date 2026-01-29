"use client"

/**
 * NavSecondary
 * ------------
 * Secondary navigation for the sidebar.
 * Handles classic navigation links AND the "Create server" action,
 * which opens a Drawer containing a fully prepared creation form.
 *
 * The button "Create a server" is frontend-ready for backend integration:
 * - controlled form inputs
 * - file validation
 * - image previews
 * - multipart/form-data payload
 * - success / error feedback
 * Once the backend is connected, only the fetch() endpoint needs adjustment.
 */

import * as React from "react"
import { type Icon } from "@tabler/icons-react"
import { usePathname } from "next/navigation"
import Link from "next/link"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type NavItem = {
  title: string
  url: string
  icon: Icon
}

/**
 * Client-side constraints for uploaded images.
 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB

function isImage(file: File) {
  return file.type.startsWith("image/")
}

/**
 * Utility for human-readable file sizes.
 */
function humanBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB"]
  let i = 0
  let b = bytes
  while (b >= 1024 && i < units.length - 1) {
    b /= 1024
    i++
  }
  return `${b.toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function NavSecondary({
  items,
  ...props
}: {
  items: NavItem[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
  const pathname = usePathname()
  const activeIndex = items.findIndex((item) => pathname === item.url)

  /**
   * Drawer open state (Create server form)
   */
  const [openCreate, setOpenCreate] = React.useState(false)

  /**
   * Form state (fully controlled, ready for backend)
   */
  const [name, setName] = React.useState("")
  const [bannerFile, setBannerFile] = React.useState<File | null>(null)
  const [thumbnailFile, setThumbnailFile] = React.useState<File | null>(null)

  /**
   * Local preview URLs (client-only, revoked on cleanup)
   */
  const [bannerPreview, setBannerPreview] = React.useState<string | null>(null)
  const [thumbnailPreview, setThumbnailPreview] = React.useState<string | null>(null)

  /**
   * UX feedback state
   */
  const [apiError, setApiError] = React.useState<string | null>(null)
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  /**
   * Temporary detection logic for the "Create server" menu item.
   * Can be replaced by an explicit flag in NavItem later.
   */
  const isCreateItem = (item: NavItem) =>
    item.title.toLowerCase().includes("create") &&
    item.title.toLowerCase().includes("server")

  /**
   * Reset the form and all related UI state.
   * Called on cancel, close, or successful creation.
   */
  function resetForm() {
    setName("")
    setBannerFile(null)
    setThumbnailFile(null)
    setApiError(null)
    setSuccessMsg(null)
  }

  /**
   * Generate and clean up banner preview URL.
   */
  React.useEffect(() => {
    if (!bannerFile) {
      setBannerPreview(null)
      return
    }
    const url = URL.createObjectURL(bannerFile)
    setBannerPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [bannerFile])

  /**
   * Generate and clean up thumbnail preview URL.
   */
  React.useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview(null)
      return
    }
    const url = URL.createObjectURL(thumbnailFile)
    setThumbnailPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [thumbnailFile])

  /**
   * Client-side validation
   */
  const trimmedName = name.trim()
  const nameError = trimmedName.length === 0 ? "Server name is required" : null

  function validateFile(file: File | null, label: string): string | null {
    if (!file) return null
    if (!isImage(file)) return `${label} must be an image`
    if (file.size > MAX_IMAGE_BYTES) {
      return `${label} is too large (max ${humanBytes(MAX_IMAGE_BYTES)})`
    }
    return null
  }

  const bannerError = validateFile(bannerFile, "Banner")
  const thumbnailError = validateFile(thumbnailFile, "Thumbnail")

  /**
   * Final submit guard.
   */
  const canSubmit =
    !nameError &&
    !bannerError &&
    !thumbnailError &&
    !isSubmitting

  /**
   * Create server handler.
   *
   * Current behavior:
   * - attempts POST to backend
   * - fails naturally if backend is not connected
   * - displays success message
   *
   * Backend :
   * POST /api/servers
   * multipart/form-data:
   *  - name: string
   *  - banner: File (optional)
   *  - thumbnail: File (optional)
   */
  async function onCreate() {
    setApiError(null)
    setSuccessMsg(null)

    if (!canSubmit) return

    try {
      setIsSubmitting(true)

      const fd = new FormData()
      fd.append("name", trimmedName)
      if (bannerFile) fd.append("banner", bannerFile)
      if (thumbnailFile) fd.append("thumbnail", thumbnailFile)

      const res = await fetch("http://localhost:4000/api/servers", {
        method: "POST",
        body: fd,
      })

      if (!res.ok) {
        let details = ""
        try {
          const json = await res.json()
          const msg = (json?.message ?? json?.error ?? "").toString()
          if (msg) details = `: ${msg}`
        } catch {
          // ignore invalid JSON error payload
        }
        throw new Error(`Create failed (HTTP ${res.status})${details}`)
      }

      /**
       * This message will appear automatically
       * as soon as the backend is properly connected.
       */
      setSuccessMsg("Server successfully created")

      setOpenCreate(false)
      resetForm()
    } catch (e) {
      /**
       * Natural failure path when backend is missing or unreachable.
       * This is EXPECTED until backend integration is complete.
       */
      setApiError(
        e instanceof Error
          ? e.message
          : "Create failed (backend not connected)"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Secondary navigation */}
      <SidebarGroup {...props}>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item, index) => {
              const isActive = index === activeIndex
              const isCreate = isCreateItem(item)

              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild={!isCreate}
                    isActive={isActive}
                    onClick={
                      isCreate
                        ? () => {
                            setApiError(null)
                            setSuccessMsg(null)
                            setOpenCreate(true)
                          }
                        : undefined
                    }
                    className="cursor-pointer"
                  >
                    {isCreate ? (
                      <>
                        <item.icon />
                        <span>{item.title}</span>
                      </>
                    ) : (
                      <Link href={item.url} className="flex items-center gap-2">
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Create server drawer */}
      <Drawer
        open={openCreate}
        onOpenChange={(v) => {
          setOpenCreate(v)
          if (!v) resetForm()
        }}
        direction="left"
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Create a server</DrawerTitle>
          </DrawerHeader>

          <div className="flex flex-col gap-4 p-4">
            {/* Success feedback (backend-ready) */}
            {successMsg && (
              <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
                {successMsg}
              </div>
            )}

            {/* Error feedback */}
            {apiError && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
                {apiError}
              </div>
            )}

            {/* Server name */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Server name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My awesome server"
              />
              {nameError && (
                <span className="text-xs text-red-500">{nameError}</span>
              )}
            </div>

            {/* Banner upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Banner</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setBannerFile(e.target.files?.[0] ?? null)
                }
                className="cursor-pointer file:cursor-pointer hover:bg-muted/40"
              />
              {bannerError && (
                <span className="text-xs text-red-500">{bannerError}</span>
              )}

              {bannerPreview && (
                <div className="overflow-hidden rounded-md border">
                  <img
                    src={bannerPreview}
                    alt="Banner preview"
                    className="h-24 w-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Thumbnail upload */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Thumbnail</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setThumbnailFile(e.target.files?.[0] ?? null)
                }
                className="cursor-pointer file:cursor-pointer hover:bg-muted/40"
              />
              {thumbnailError && (
                <span className="text-xs text-red-500">{thumbnailError}</span>
              )}

              {thumbnailPreview && (
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 overflow-hidden rounded-md border">
                    <img
                      src={thumbnailPreview}
                      alt="Thumbnail preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <DrawerFooter className="p-0">
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  type="button"
                  className="cursor-pointer"
                  onClick={() => {
                    setOpenCreate(false)
                    resetForm()
                  }}
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={onCreate}
                  disabled={!canSubmit}
                  className="cursor-pointer"
                >
                  {isSubmitting ? "Creating..." : "Create"}
                </Button>
              </div>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  )
}
