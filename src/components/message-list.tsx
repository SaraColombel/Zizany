export type UiMessage = {
    id: string
    authorName: string
    content: string
    createdAt: string
    isOptimistic?: boolean
    isFailed?: boolean
}

export function MessageList({
    messages,
    loading,
    error,
    }: {
    messages: UiMessage[]
    loading: boolean
    error: string | null
    }) {
    if (loading) {
        return <div className="p-4 text-sm text-muted-foreground">Loading…</div>
    }

    if (error) {
        return <div className="p-4 text-sm text-red-500">{error}</div>
    }

    if (messages.length === 0) {
        return <div className="p-4 text-sm text-muted-foreground">No messages yet</div>
    }

    return (
        <div className="flex flex-col gap-2 p-4">
        {messages.map((m) => (
            <div key={m.id} className="rounded-md border px-3 py-2">
            <div className="flex justify-between text-xs text-muted-foreground">
                <span>{m.authorName}</span>
                <span>
                {new Date(m.createdAt).toLocaleTimeString()}
                {m.isOptimistic && " · sending…"}
                {m.isFailed && " · failed"}
                </span>
            </div>
            <div className="text-sm">{m.content}</div>
            </div>
        ))}
        </div>
    )
}
