import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { ServersProvider } from "@/components/servers-context"


export default function ServersLayout({
    children,
    }: {
    children: React.ReactNode
    }) {
    return (
        <ServersProvider>
            <SidebarProvider
                style={
                {
                    "--sidebar-width": "calc(var(--spacing) * 60)",
                    "--header-height": "calc(var(--spacing) * 12)",
                } as React.CSSProperties
                }
            >
                <AppSidebar variant="inset" />
                <SidebarInset>
                <SiteHeader />
                <div className="flex flex-1 flex-col">
                    <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col">{children}</div>
                    </div>
                </div>
                </SidebarInset>
            </SidebarProvider>
        </ServersProvider>
    )
}