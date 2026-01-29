"use client"

import * as React from "react"
import { IconUsers, IconChevronLeft, IconChevronRight } from "@tabler/icons-react"

const membersData = [
    { name: "Sara" },
    { name: "Jeremy" },
    { name: "Mathieu" },
]

export function ServerMembersSidebar({ serverId }: { serverId: string }) {
    const [open, setOpen] = React.useState(true)

    return (
        <aside
        className={[
            "border-l shrink-0 h-full",
            open ? "w-40" : "w-12",
            "transition-[width] duration-200",
        ].join(" ")}
        >
        <div className="p-3 flex items-center justify-between">
            {open && (
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Members ({membersData.length})
            </span>
            )}

            <button
                onClick={() => setOpen(v => !v)}
                aria-label="Toggle members panel"
                className="
                    rounded
                    p-1
                    hover:bg-muted
                    cursor-pointer
                    transition
                "
                >
                {open ? (
                    <IconChevronRight className="h-4 w-4" />
                ) : (
                    <IconChevronLeft className="h-4 w-4" />
                )}
            </button>
        </div>

        {open && (
            <div className="px-3 pb-3 space-y-2 text-sm">
            {membersData.map(m => (
                <div key={m.name} className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted">
                <IconUsers className="h-4 w-4" />
                <span>{m.name}</span>
                </div>
            ))}
            </div>
        )}
        </aside>
    )
}
