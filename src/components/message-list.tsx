import { MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/**
 * UI-level representation of a chat message.
 *
 * Notes:
 * - This is NOT the backend message model.
 * - Flags like `isOptimistic` and `isFailed` are client-only
 *   and must never be persisted in the database.
 */
export type UiMessage = {
  id: string
  authorName: string
  content: string
  createdAt: string

  /**
   * True while the message has been sent by the client
   * but not yet confirmed by the backend (optimistic UI).
   */
  isOptimistic?: boolean

  /**
   * True when the backend rejected the message
   * or a network error occurred.
   */
  isFailed?: boolean
}

/**
 * MessageList
 * -----------
 * Displays a list of chat messages with optional action menu.
 *
 * Responsibilities:
 * - Render loading / error / empty states
 * - Display message metadata (author, time, status)
 * - Expose edit / delete actions when provided
 *
 * Does NOT:
 * - Fetch messages
 * - Manage socket connections
 * - Apply permission logic (that belongs to the backend)
 */
export function MessageList({
  messages,
  loading,
  error,
  onEdit,
  onDelete,
}: {
  messages: UiMessage[]
  loading: boolean
  error: string | null

  /**
   * Optional callbacks.
   * If provided, the message action menu is enabled.
   */
  onEdit?: (message: UiMessage) => void
  onDelete?: (message: UiMessage) => void
}) {
  /**
   * Loading state while fetching message history.
   */
  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  /**
   * Error state (network / backend failure).
   */
  if (error) {
    return (
      <div className="p-4 text-sm text-red-500">
        {error}
      </div>
    )
  }

  /**
   * Empty channel state.
   */
  if (messages.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No messages yet
      </div>
    )
  }

  /**
   * Enable the dropdown menu only if at least one action exists.
   * This allows reuse of the component in read-only contexts.
   */
  const hasMenu = !!onEdit || !!onDelete

  return (
    <div className="flex flex-col gap-2 p-4">
      {messages.map((m) => (
        <div
          key={m.id}
          className="rounded-md border px-3 py-2"
        >
          {/* Message header: author, timestamp, status, actions */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{m.authorName}</span>

            <div className="flex items-center gap-2">
              {/* Timestamp + client-side delivery status */}
              <span>
                {new Date(m.createdAt).toLocaleTimeString()}
                {m.isOptimistic && " · sending…"}
                {m.isFailed && " · failed"}
              </span>

              {/* Message actions menu (edit / delete) */}
              {hasMenu && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 p-0 cursor-pointer"
                      aria-label="Message actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    {/* Edit action (if enabled) */}
                    {onEdit && (
                      <DropdownMenuItem
                        className="cursor-pointer"
                        onSelect={() => onEdit(m)}
                      >
                        Modify
                      </DropdownMenuItem>
                    )}

                    {/* Delete action (if enabled) */}
                    {onDelete && (
                      <DropdownMenuItem
                        variant="destructive"
                        className="cursor-pointer"
                        onSelect={() => onDelete(m)}
                      >
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Message content */}
          <div className="text-sm">
            {m.content}
          </div>
        </div>
      ))}
    </div>
  )
}
