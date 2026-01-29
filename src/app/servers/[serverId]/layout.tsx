import * as React from "react"
import { ServerChannelsSidebar } from "@/components/server-channels-sidebar"
import { ServerMembersSidebar } from "@/components/server-members-sidebar"

export default async function ServerLayout({
    children,
    params,
    }: {
    children: React.ReactNode
    params: Promise<{ serverId: string }>
    }) {
    const { serverId } = await params

    return (
        <div className="flex flex-1 min-h-[calc(100vh-var(--header-height))]">
        {/* Channels */}
        <div className="w-56 shrink-0 border-r">
            <ServerChannelsSidebar serverId={serverId} />
        </div>

        {/* Messages */}
        <main className="flex-1 min-w-0">
            {children}
        </main>

        {/* Members */}
        <ServerMembersSidebar serverId={serverId} />
        </div>
    )
}
