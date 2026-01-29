"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

/**
 * MessageComposer
 * ----------------
 * Input + submit button used to compose and send a chat message.
 *
 * This component is intentionally dumb:
 * - it does NOT know about servers, channels, sockets or REST
 * - it only manages local input state
 *
 * All side effects (optimistic UI, socket emit, REST calls, etc.)
 * must be handled by the parent component (e.g. ChatPane).
 */
export function MessageComposer({
    onSend,
    disabled,
}: {
    /**
     * Callback triggered when the user submits a message.
     *
     * Expected behavior (handled by parent):
     * - create optimistic message
     * - send message to backend / socket
     * - handle success / failure
     */
    onSend: (content: string) => void | Promise<void>

    /**
     * When true, the composer is disabled.
     * Typically used when:
     * - channel is not ready
     * - user is not allowed to send messages
     * - a fatal error occurred
     */
    disabled?: boolean
}) {
    /**
     * Local input state.
     * This is reset immediately after submit.
     */
    const [value, setValue] = React.useState("")

    /**
     * Submit handler.
     *
     * Notes:
     * - trims whitespace
     * - ignores empty messages
     * - delegates actual send logic to `onSend`
     *
     * This function does NOT:
     * - validate permissions
     * - talk to the backend
     * - handle optimistic updates
     */
    function submit() {
        const trimmed = value.trim()
        if (!trimmed) return

        onSend(trimmed)
        setValue("")
    }

    return (
        <div className="flex gap-2 mb-4 mt-2">
        {/* Message input */}
        <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Write a message…"
            disabled={disabled}
            onKeyDown={(e) => {
            /**
             * Send message on Enter key.
             * (Shift+Enter handling can be added later if needed.)
             */
            if (e.key === "Enter") submit()
            }}
        />

        {/* Send button */}
        <Button
            onClick={submit}
            disabled={disabled}
            className="cursor-pointer"
        >
            Send
        </Button>
        </div>
    )
}
