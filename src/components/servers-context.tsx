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

        const json = await res.json()

        /**
         * Normalize backend payload to the UI `Server` shape.
         *
         * Supports both:
         * - array of domain entities serialized as `{ props: { ... } }`
         * - array of plain objects `{ id, name, thumbnail, banner, members }`
         */
        const normalized: Server[] = (json.servers ?? [])
          .map((raw: any) => {
            const base = raw && raw.props ? raw.props : raw
            if (!base) return null

            const id = Number(base.id)
            if (!Number.isFinite(id)) return null

            return {
              id,
              name: String(base.name ?? "Untitled server"),
              thumbnail: base.thumbnail ?? null,
              banner: base.banner ?? null,
              members:
                typeof base.members === "number" && base.members >= 0
                  ? base.members
                  : 0,
            } satisfies Server
          })
          .filter((s: Server | null): s is Server => s !== null)

        if (!cancelled) setServers(normalized)
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
