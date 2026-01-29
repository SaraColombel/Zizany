"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export function MessageComposer({
    onSend,
    disabled,
    }: {
    onSend: (content: string) => void | Promise<void>
    disabled?: boolean
    }) {
    const [value, setValue] = React.useState("")

    function submit() {
        const trimmed = value.trim()
        if (!trimmed) return
        onSend(trimmed)
        setValue("")
    }

    return (
        <div className="flex gap-2 mb-4 mt-2">
            <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Write a message…"
            disabled={disabled}
            onKeyDown={(e) => {
            if (e.key === "Enter") submit()
            }}
        />
        <Button onClick={submit} disabled={disabled}>
            Send
        </Button>
        </div>
    )
}
