"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconPlus } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Minimal channel shape used in the sidebar.
 * Matches the subset of fields returned by the channels API.
 */
type Channel = {
  id: number;
  server_id: number;
  name: string;
};

type ServerChannelsSidebarProps = {
  serverId: string;

  /**
   * Whether the current user is allowed to manage channels
   * (Admin OR Owner on this server).
   *
   * Backend integration plan:
   * - once we can fetch the current membership for this server,
   *   we will compute:
   *     canManageChannels = role === "Admin" || role === "Owner"
   *   in the parent layout and pass it down here.
   */
  canManageChannels?: boolean;
};

export function ServerChannelsSidebar({
  serverId,

  // true = you are admin view / false = member view
  canManageChannels = true,
}: ServerChannelsSidebarProps) {
  const pathname = usePathname();

  // Channels list and fetch status.
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

  // UI state for overlays:
  // - "none": no overlay
  // - "create": create channel panel (fullscreen)
  // - "actions": channel actions (bottom panel)
  // - "rename": rename channel panel (fullscreen)
  const [uiMode, setUiMode] = React.useState<
    "none" | "create" | "actions" | "rename"
  >("none");

  // Channel currently selected for actions / rename.
  const [selectedChannel, setSelectedChannel] = React.useState<Channel | null>(
    null,
  );

  // Position for the "actions" panel (right-click menu).
  const [contextPos, setContextPos] = React.useState<{
    x: number;
    y: number;
  } | null>(null);

  // Form state for create / rename flows.
  const [newChannelName, setNewChannelName] = React.useState("");
  const [renameName, setRenameName] = React.useState("");

  /**
   * Load channels for the given server on mount and whenever serverId changes.
   *
   * Notes:
   * - The backend may return either domain entities ({ props }) or plain objects, so
   *   we normalize the payload here.
   * - The `cancelled` flag prevents state updates after unmount.
   */
  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/servers/${serverId}/channels`,
          {
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          },
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();

        const normalized: Channel[] = (json.channels ?? [])
          .map((raw: any) => {
            const base = raw && raw.props ? raw.props : raw;
            if (!base) return null;

            const id = Number(base.id);
            const server_id = Number(base.server_id);
            if (!Number.isFinite(id) || !Number.isFinite(server_id))
              return null;

            return {
              id,
              server_id,
              name: String(base.name ?? "Untitled channel"),
            } satisfies Channel;
          })
          .filter((c: Channel | null): c is Channel => c !== null);

        if (!cancelled) {
          setChannels(normalized);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load channels");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  /**
   * Close any open overlay (create / actions / rename) and reset selection.
   */
  function closeOverlays() {
    setUiMode("none");
    setSelectedChannel(null);
    setContextPos(null);
    setNewChannelName("");
    setRenameName("");
  }

  /**
   * Handle submission of the "create channel" pop-up form.
   *
   * For now this does not call the backend:
   * - it only logs the future payload in the console
   * - real API integration (POST /servers/:id/channels) will be added later
   */
  function handleCreateSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newChannelName.trim();
    if (!trimmed) return;

    console.log("New channel created on server", serverId, "named:", trimmed);

    setNewChannelName("");
    setUiMode("none");
  }

  return (
    <div className="relative p-3">
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
        <span>Channels</span>

        {/* Add channel button (visible only to Admin/Owner once roles are wired) */}
        {canManageChannels && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-6 w-6 cursor-pointer p-0"
            aria-label="Add a channel"
            onClick={() => {
              setSelectedChannel(null);
              setNewChannelName("");
              setUiMode("create");
            }}
          >
            <IconPlus className="h-3 w-3" />
          </Button>
        )}
      </div>

      {loading && (
        <div className="text-xs text-muted-foreground">Loading channels…</div>
      )}

      {error && !loading && (
        <div className="text-xs text-red-500">Failed to load channels</div>
      )}

      {!loading && !error && channels.length === 0 && (
        <div className="text-xs text-muted-foreground">No channels</div>
      )}

      <div className="mt-1 flex flex-col gap-1">
        {channels.map((channel) => {
          const href = `/servers/${serverId}/channels/${channel.id}`;
          const isActive = pathname === href;

          return (
            <div
              key={channel.id}
              onContextMenu={(event) => {
                if (!canManageChannels) return;
                event.preventDefault();
                // Open the action panel (Modify / Delete) for this channel at the click position.
                setSelectedChannel(channel);
                setContextPos({ x: event.clientX, y: event.clientY });
                setUiMode("actions");
              }}
            >
              <Link
                href={href}
                className={
                  "block w-full rounded px-2 py-1 text-sm " +
                  (isActive
                    ? "bg-muted font-medium text-foreground"
                    : "hover:bg-muted text-muted-foreground")
                }
              >
                #{channel.name}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Simple centered pop-up to enter the new channel name (Admin/Owner only) */}
      {canManageChannels && uiMode === "create" && (
        <div
          className="bg-background/80 pointer-events-auto fixed inset-0 z-30 flex items-center justify-center backdrop-blur-m"
          onClick={closeOverlays}
        >
          <div
            className="w-full max-w-xs rounded-md border bg-popover p-4 shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-3 text-sm font-semibold">Create a new channel</h2>
            <form onSubmit={handleCreateSubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Channel name</label>
                <Input
                  autoFocus
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="ex: general"
                  className="h-8 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 cursor-pointer text-xs"
                  onClick={() => {
                    closeOverlays();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="h-8 cursor-pointer text-xs"
                  disabled={!newChannelName.trim()}
                >
                  Create
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Channel action panel (opened via right-click, fixed at click position) */}
      {canManageChannels &&
        uiMode === "actions" &&
        selectedChannel &&
        contextPos && (
          <div
            className="pointer-events-auto fixed inset-0 z-30"
            onClick={closeOverlays}
          >
            <div
              className="w-52 rounded-md border bg-popover p-2 shadow-lg"
              style={{
                position: "absolute",
                top: contextPos.y,
                left: contextPos.x,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="space-y-1">
                <Button
                  type="button"
                  className="h-9 w-full cursor-pointer px-3 text-sm"
                  onClick={() => {
                    setRenameName(selectedChannel.name);
                    setUiMode("rename");
                  }}
                >
                  Modify name
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="h-9 w-full cursor-pointer px-3 text-sm"
                  onClick={() => {
                    const ok = window.confirm(
                      `Delete channel "${selectedChannel.name}"? This will be wired to the backend later.`,
                    );
                    if (!ok) return;
                    setChannels((prev) =>
                      prev.filter((ch) => ch.id !== selectedChannel.id),
                    );
                    closeOverlays();
                  }}
                >
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-full cursor-pointer px-3 text-sm"
                  onClick={() => {
                    closeOverlays();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

      {/* Rename channel panel (opened after selecting "Modify name", anchored at the same position) */}
      {canManageChannels &&
        uiMode === "rename" &&
        selectedChannel &&
        contextPos && (
          <div
            className="pointer-events-auto fixed inset-0 z-30"
            onClick={closeOverlays}
          >
            <div
              className="w-60 rounded-md border bg-popover p-3 shadow-lg"
              style={{
                position: "absolute",
                top: contextPos.y,
                left: contextPos.x,
              }}
              onClick={(event) => event.stopPropagation()}
            >
              <h2 className="mb-2 text-sm font-semibold">
                Modify channel name
              </h2>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const trimmed = renameName.trim();
                  if (!trimmed) return;

                  setChannels((prev) =>
                    prev.map((ch) =>
                      ch.id === selectedChannel.id
                        ? { ...ch, name: trimmed }
                        : ch,
                    ),
                  );
                  closeOverlays();
                }}
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Channel name</label>
                  <Input
                    autoFocus
                    value={renameName}
                    onChange={(e) => setRenameName(e.target.value)}
                    placeholder="ex: general"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="mt-1 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8 cursor-pointer px-3 text-xs"
                    onClick={() => {
                      closeOverlays();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-8 cursor-pointer px-3 text-xs"
                    disabled={!renameName.trim()}
                  >
                    Modify
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
    </div>
  );
}
