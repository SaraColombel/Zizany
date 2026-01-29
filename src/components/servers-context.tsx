"use client"

import * as React from "react"

export type Server = {
    id: number
    name: string
    thumbnail: string | null
    banner: string | null
    members: number
}

type ServersContextType = {
servers: Server[]
error: string | null
}

const ServersContext = React.createContext<ServersContextType | null>(null)

export function ServersProvider({ children }: { children: React.ReactNode }) {
    const [servers, setServers] = React.useState<Server[]>([])
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        let cancelled = false

        async function load() {
        try {
            const res = await fetch("http://localhost:4000/api/servers", {
            headers: { "Content-Type": "application/json" },
            })

            if (!res.ok) throw new Error(`HTTP ${res.status}`)

            const json: { servers: Server[] } = await res.json()
            if (!cancelled) setServers(json.servers ?? [])
        } catch (e) {
            if (!cancelled) {
            setError(e instanceof Error ? e.message : "Fetch failed")
            }
        }
        }

        load()
        return () => {
        cancelled = true
        }
    }, [])

    return (
        <ServersContext.Provider value={{ servers, error }}>
        {children}
        </ServersContext.Provider>
    )
}

export function useServers() {
    const ctx = React.useContext(ServersContext)
    if (!ctx) {
        throw new Error("useServers must be used inside ServersProvider")
    }
    return ctx
}
