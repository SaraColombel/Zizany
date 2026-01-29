import * as React from "react"
import { ServerChannelsSidebar } from "@/components/server-channels-sidebar"
import { ServerMembersSidebar } from "@/components/server-members-sidebar"

export default function ServerLayout({
    children,
    params,
    }: {
    children: React.ReactNode
    params: { serverId: string }
    }) {
    const { serverId } = params

    return (
        <div className="flex flex-1 min-h-[calc(100vh-var(--header-height))]">
        <div className="w-50 shrink-0 border-r">
            <ServerChannelsSidebar serverId={serverId} />
        </div>

        {/* Messages (centre) */}
        <main className="flex-1 min-w-0">
            {children}
        </main>

        {/* Members (rabattable à droite) */}
        <ServerMembersSidebar serverId={serverId} />
        </div>
    )
}
