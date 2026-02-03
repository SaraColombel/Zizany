"use client";

import * as React from "react";

export type Server = {
  id: number;
  name: string;
  thumbnail: string | null;
  banner: string | null;
  members: number;
  onlineMembers: number;
  isMember: boolean;
  canLeave: boolean;
  currentUserRoleId: number | null;
};

type ServersContextType = {
  servers: Server[];
  error: string | null;
  refresh: () => Promise<void>;
};

const ServersContext = React.createContext<ServersContextType | null>(null);

export function ServersProvider({ children }: { children: React.ReactNode }) {
  const [servers, setServers] = React.useState<Server[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
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
       * - array of plain objects `{ id, name, thumbnail, banner, members }`
       */
      const isRecord = (value: unknown): value is Record<string, unknown> =>
        typeof value === "object" && value !== null;

      const normalized: Server[] = (json.servers ?? [])
        .map((raw: unknown) => {
          const rawRecord = isRecord(raw) ? raw : null;
          const base =
            rawRecord && "props" in rawRecord ? rawRecord.props : rawRecord;

          if (!isRecord(base)) return null;

          const id = Number(base.id);
          if (!Number.isFinite(id)) return null;

          const roleId =
            typeof base.currentUserRoleId === "number"
              ? base.currentUserRoleId
              : null;
          const isMember = Boolean(
            (rawRecord && "isMember" in rawRecord
              ? rawRecord.isMember
              : base.isMember) ?? false,
          );
          const canLeave =
            typeof base.canLeave === "boolean"
              ? base.canLeave
              : isMember && roleId !== 1;

          return {
            id,
            name: String(base.name ?? "Untitled server"),
            thumbnail:
              typeof base.thumbnail === "string" ? base.thumbnail : null,
            banner: typeof base.banner === "string" ? base.banner : null,
            members:
              typeof base.members === "number" && base.members >= 0
                ? base.members
                : 0,
            onlineMembers:
              typeof base.onlineMembers === "number" && base.onlineMembers >= 0
                ? base.onlineMembers
                : 0,
            isMember,
            canLeave,
            currentUserRoleId: roleId,
          } satisfies Server;
        })
        .filter((s: Server | null): s is Server => s !== null);

      setServers(normalized);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fetch failed");
    }
  }, []);

  React.useEffect(() => {
    refresh().catch(() => null);
  }, [refresh]);

  return (
    <ServersContext.Provider value={{ servers, error, refresh }}>
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
