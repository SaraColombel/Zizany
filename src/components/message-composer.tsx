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
    onTypingStart,
    onTypingStop,
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
     * Optional typing callbacks (used for realtime indicators).
     */
    onTypingStart?: () => void
    onTypingStop?: () => void

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
    const typingTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(
        null,
    )
    const isTypingRef = React.useRef(false)

    function stopTyping() {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
            typingTimeoutRef.current = null
        }
        if (isTypingRef.current) {
            isTypingRef.current = false
            onTypingStop?.()
        }
    }

    function signalTyping() {
        if (!isTypingRef.current) {
            isTypingRef.current = true
            onTypingStart?.()
        }
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current)
        }
        typingTimeoutRef.current = setTimeout(() => {
            stopTyping()
        }, 1800)
    }

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
        stopTyping()
    }

    return (
        <div className="flex gap-2 mb-4 mt-2">
        {/* Message input */}
        <Input
            value={value}
            onChange={(e) => {
                const nextValue = e.target.value
                setValue(nextValue)
                if (nextValue.trim().length > 0) {
                    signalTyping()
                } else {
                    stopTyping()
                }
            }}
            placeholder="Write a message…"
            disabled={disabled}
            onBlur={stopTyping}
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
