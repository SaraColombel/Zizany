"use client";

import * as React from "react";

export type Server = {
  id: number;
  name: string;
  thumbnail: string | null;
  banner: string | null;
  members: number;
  onlineMembers: number;
};

type ServersContextType = {
  servers: Server[];
  error: string | null;
};

const ServersContext = React.createContext<ServersContextType | null>(null);

export function ServersProvider({ children }: { children: React.ReactNode }) {
  const [servers, setServers] = React.useState<Server[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const cancelledRef = React.useRef(false);
  const inFlightRef = React.useRef(false);
  const pendingRef = React.useRef(false);

  const load = React.useCallback(async () => {
    if (cancelledRef.current) return;
    if (inFlightRef.current) {
      pendingRef.current = true;
      return;
    }
    inFlightRef.current = true;
    pendingRef.current = false;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/servers`,
        {
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        },
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();

      /**
       * Normalize backend payload to the UI `Server` shape.
       *
       * Supports both:
       * - array of domain entities serialized as `{ props: { ... } }`
       * - array of plain objects `{ id, name, thumbnail, banner, members, onlineMembers }`
       */
      const normalized: Server[] = (json.servers ?? [])
        .map((raw: any) => {
          const base = raw && raw.props ? raw.props : raw;
          if (!base) return null;

          const id = Number(base.id);
          if (!Number.isFinite(id)) return null;

          return {
            id,
            name: String(base.name ?? "Untitled server"),
            thumbnail: base.thumbnail ?? null,
            banner: base.banner ?? null,
            members:
              typeof base.members === "number" && base.members >= 0
                ? base.members
                : 0,
            onlineMembers:
              typeof base.onlineMembers === "number" &&
              base.onlineMembers >= 0
                ? base.onlineMembers
                : 0,
          } satisfies Server;
        })
        .filter((s: Server | null): s is Server => s !== null);

      if (!cancelledRef.current) setServers(normalized);
    } catch (e) {
      if (!cancelledRef.current) {
        setError(e instanceof Error ? e.message : "Fetch failed");
      }
    } finally {
      inFlightRef.current = false;
      if (pendingRef.current && !cancelledRef.current) {
        pendingRef.current = false;
        load();
      }
    }
  }, []);

  React.useEffect(() => {
    cancelledRef.current = false;
    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, [load]);

  React.useEffect(() => {
    function handlePresence() {
      load();
    }

    window.addEventListener("presence:connected", handlePresence);
    window.addEventListener("presence:disconnected", handlePresence);
    return () => {
      window.removeEventListener("presence:connected", handlePresence);
      window.removeEventListener("presence:disconnected", handlePresence);
    };
  }, [load]);

  return (
    <ServersContext.Provider value={{ servers, error }}>
      {children}
    </ServersContext.Provider>
  );
}

export function useServers() {
  const ctx = React.useContext(ServersContext);
  if (!ctx) {
    throw new Error("useServers must be used inside ServersProvider");
  }
  return ctx;
}
