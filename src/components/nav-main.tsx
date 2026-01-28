"use client"

import { type Icon } from "@tabler/icons-react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: Icon
    imageUrl?: string
  }[]
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <a href={item.url} target="_blank" rel="noreferrer">
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
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
