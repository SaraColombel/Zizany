"use client"

import * as React from "react"
import { IconHash, IconVolume2, IconSettings } from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
} from "@/components/ui/sidebar"

// Mock: plus tard => dépendra de serverId (API/Socket)
const channelsData = {
    navMain: [
        { title: "general", url: "#", icon: IconHash },
        { title: "random", url: "#", icon: IconHash },
        { title: "voice", url: "#", icon: IconVolume2 },
    ],
    navSecondary: [
        { title: "Channel settings", url: "#", icon: IconSettings },
    ],
}

export function ServerChannelsSidebar({ serverId }: { serverId: string }) {
    return (
        <div className="h-full p-3">
            <div className=" text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Channels
            </div>

            <div className="mt-3 space-y-1 text-sm">
                <button className="w-full text-left rounded px-2 py-1 hover:bg-muted"># general</button>
                <button className="w-full text-left rounded px-2 py-1 hover:bg-muted"># random</button>
            </div>
    </div>
    )
}
