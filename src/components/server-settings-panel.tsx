"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServers } from "@/components/servers-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ROLE_LABELS: Record<number, string> = {
  1: "Owner",
  2: "Admin",
  3: "Member",
};

const ROLE_OPTIONS = [
  { id: 1, label: "Owner" },
  { id: 2, label: "Admin" },
  { id: 3, label: "Member" },
];

interface Member {
  id: number;
  user_id: number;
  server_id: number;
  role_id: number;
  user?: {
    id: number;
    username: string;
    thumbnail: string | null;
  };
  role?: {
    id: number;
    name: string;
  };
}

interface RawMember extends Partial<Member> {
  props?: Partial<Member>;
}

type ServerPayload = {
  server?: {
    name?: string;
    props?: {
      name?: string;
    };
  };
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ServerSettingsPanel({
  serverId,
  serverName,
  isPublic: initialIsPublic,
  open,
  onOwnershipTransferred,
  onDeleted,
}: {
  serverId: string;
  serverName?: string;
  isPublic?: boolean;
  open: boolean;
  onOwnershipTransferred?: () => void;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const { refresh } = useServers();
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);
  const [savingIds, setSavingIds] = React.useState<Set<number>>(new Set());
  const [nameInput, setNameInput] = React.useState(serverName ?? "");
  const [savedName, setSavedName] = React.useState(serverName ?? "");
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = React.useState<string | null>(null);
  const [isSavingChanges, setIsSavingChanges] = React.useState(false);
  const [isPublic, setIsPublic] = React.useState(Boolean(initialIsPublic));
  const [savedIsPublic, setSavedIsPublic] = React.useState(
    Boolean(initialIsPublic),
  );
  const [publicError, setPublicError] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [ownerConfirm, setOwnerConfirm] = React.useState<{
    member: Member;
    nextRoleId: number;
  } | null>(null);
  const [ownerConfirmText, setOwnerConfirmText] = React.useState("");
  const [ownerConfirmError, setOwnerConfirmError] = React.useState<
    string | null
  >(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = React.useState("");
  const [deleteConfirmError, setDeleteConfirmError] = React.useState<
    string | null
  >(null);

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000";
  const ownerConfirmPhrase = "I understand";
  const trimmedName = nameInput.trim();
  const nameChanged = trimmedName !== savedName.trim();
  const isPublicChanged = isPublic !== savedIsPublic;
  const canSaveChanges =
    ((nameChanged && trimmedName.length > 0) || isPublicChanged) &&
    !isSavingChanges;
  const displayServerName =
    savedName.trim() || serverName?.trim() || "this server";

  function getUpdatedName(
    payload: ServerPayload | null,
    fallback: string,
    update: { name?: string },
  ) {
    if (typeof payload?.server?.props?.name === "string") {
      return String(payload.server.props.name);
    }
    if (typeof payload?.server?.name === "string") {
      return String(payload.server.name);
    }
    return update.name ?? fallback;
  }

  React.useEffect(() => {
    if (!open) return;
    const nextName = serverName ?? "";
    setNameInput(nextName);
    setSavedName(nextName);
    setNameError(null);
    setNameSuccess(null);
    setIsPublic(Boolean(initialIsPublic));
    setSavedIsPublic(Boolean(initialIsPublic));
    setPublicError(null);
  }, [open, serverId, serverName, initialIsPublic]);

  const loadMembers = React.useCallback(
    async ({ silent = false }: { silent?: boolean } = {}) => {
      if (!serverId) return;
      try {
        if (!silent) {
          setLoading(true);
        }
        setError(null);

        const res = await fetch(`${apiBase}/api/servers/${serverId}/members`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const normalized: Member[] = (json.members ?? [])
          .map((raw: RawMember) => {
            const base = raw && raw.props ? raw.props : raw;
            if (!base) return null;
            const id = Number(base.id);
            const user_id = Number(base.user_id);
            const server_id = Number(base.server_id);
            const role_id = Number(base.role_id);
            if (
              !Number.isFinite(id) ||
              !Number.isFinite(user_id) ||
              !Number.isFinite(server_id) ||
              !Number.isFinite(role_id)
            )
              return null;

            return {
              id,
              user_id,
              server_id,
              role_id,
              user: base.user
                ? {
                    id: Number(base.user.id),
                    username: String(base.user.username ?? "Unknown user"),
                    thumbnail: base.user.thumbnail ?? null,
                  }
                : undefined,
              role: base.role
                ? {
                    id: Number(base.role.id),
                    name: String(
                      base.role.name ?? ROLE_LABELS[role_id] ?? "Member",
                    ),
                  }
                : undefined,
            } satisfies Member;
          })
          .filter((m: Member | null): m is Member => m !== null);

        setMembers(normalized);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load members");
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [apiBase, serverId],
  );

  React.useEffect(() => {
    if (!open) return;
    loadMembers().catch(() => null);
  }, [open, loadMembers]);

  const updateRole = React.useCallback(
    async (member: Member, nextRoleId: number) => {
      if (!serverId || member.role_id === nextRoleId) return false;

      setSavingIds((prev) => {
        const next = new Set(prev);
        next.add(member.user_id);
        return next;
      });
      setError(null);

      try {
        const res = await fetch(
          `${apiBase}/api/servers/${serverId}/members/${member.user_id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ role_id: nextRoleId }),
          },
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        await loadMembers({ silent: true });
        return true;
      } catch (e) {
        setError(
          e instanceof Error
            ? `Failed to update role (${e.message})`
            : "Failed to update role",
        );
        return false;
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(member.user_id);
          return next;
        });
      }
    },
    [apiBase, serverId, loadMembers],
  );

  const handleRoleChange = React.useCallback(
    async (member: Member, nextRoleId: number) => {
      if (!serverId || member.role_id === nextRoleId) return;

      if (nextRoleId === 1) {
        setOwnerConfirm({ member, nextRoleId });
        setOwnerConfirmText("");
        setOwnerConfirmError(null);
        return;
      }

      await updateRole(member, nextRoleId);
    },
    [serverId, updateRole],
  );

  const confirmOwnerTransfer = React.useCallback(async () => {
    if (!ownerConfirm) return;

    if (ownerConfirmText.trim() !== ownerConfirmPhrase) {
      setOwnerConfirmError(
        `Please type "${ownerConfirmPhrase}" to confirm this transfer.`,
      );
      return;
    }

    setOwnerConfirm(null);
    setOwnerConfirmText("");
    setOwnerConfirmError(null);
    onOwnershipTransferred?.();

    const ok = await updateRole(ownerConfirm.member, ownerConfirm.nextRoleId);
    if (ok) {
    }
  }, [
    ownerConfirm,
    ownerConfirmPhrase,
    ownerConfirmText,
    onOwnershipTransferred,
    updateRole,
  ]);

  const handleSaveChanges = React.useCallback(async () => {
    if (!serverId || isSavingChanges) return;

    const updates: { name?: string; isPublic?: boolean } = {};

    if (nameChanged) {
      if (trimmedName.length === 0) {
        setNameError("Server name is required");
        return;
      }
      updates.name = trimmedName;
    }

    if (isPublicChanged) {
      updates.isPublic = isPublic;
    }

    if (Object.keys(updates).length === 0) return;

    setIsSavingChanges(true);
    setNameError(null);
    setNameSuccess(null);
    setPublicError(null);

    try {
      const res = await fetch(`${apiBase}/api/servers/${serverId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? `HTTP ${res.status}`);
      }

      const json = (await res.json().catch(() => null)) as ServerPayload | null;
      const updatedName = getUpdatedName(json, savedName, updates);

      setSavedName(updatedName);
      setNameInput(updatedName);
      setSavedIsPublic(
        typeof updates.isPublic === "boolean"
          ? updates.isPublic
          : savedIsPublic,
      );
      setNameSuccess("Server updated.");
      await refresh();
    } catch (e) {
      setPublicError(
        e instanceof Error ? e.message : "Failed to update server",
      );
    } finally {
      setIsSavingChanges(false);
    }
  }, [
    apiBase,
    isPublic,
    isPublicChanged,
    isSavingChanges,
    nameChanged,
    refresh,
    savedIsPublic,
    savedName,
    serverId,
    trimmedName,
  ]);

  const handleDeleteServer = React.useCallback(async () => {
    if (!serverId || isDeleting) return;
    setDeleteError(null);
    setIsDeleting(true);

    try {
      const res = await fetch(`${apiBase}/api/servers/${serverId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? `HTTP ${res.status}`);
      }

      await refresh();
      onDeleted?.();
      router.push("/servers");
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : "Failed to delete server",
      );
    } finally {
      setIsDeleting(false);
    }
  }, [apiBase, isDeleting, onDeleted, refresh, router, serverId]);

  return (
    <div className="relative flex h-full flex-col">
      <div className="border-b px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Server settings</h2>
            <p className="text-sm text-muted-foreground">
              Manage member roles for {displayServerName}.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mb-6 rounded-md border p-4">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">Server profile</h3>
            <p className="text-xs text-muted-foreground">
              Update the name shown to your members.
            </p>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <label className="text-sm font-medium">Server name</label>
            <Input
              value={nameInput}
              onChange={(event) => {
                setNameInput(event.target.value);
                if (nameError) setNameError(null);
                if (nameSuccess) setNameSuccess(null);
              }}
              placeholder="My awesome server"
            />
            {nameError && (
              <div className="text-xs text-destructive">{nameError}</div>
            )}
            {nameSuccess && (
              <div className="text-xs text-emerald-600">{nameSuccess}</div>
            )}
          </div>

          <div className="mt-4 rounded-md border bg-muted/20 p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">Server visibility</div>
                <div className="text-xs text-muted-foreground">
                  A public server is visible in the servers list and joinable
                  without invitation.
                </div>
              </div>
              <Select
                value={isPublic ? "public" : "private"}
                onValueChange={(value) => {
                  setIsPublic(value === "public");
                  if (publicError) setPublicError(null);
                  if (nameSuccess) setNameSuccess(null);
                }}
                disabled={isSavingChanges}
              >
                <SelectTrigger
                  size="sm"
                  className="min-w-28 cursor-pointer"
                  aria-label="Server visibility"
                >
                  <SelectValue
                    placeholder={isSavingChanges ? "Saving..." : "Visibility"}
                  />
                </SelectTrigger>
                <SelectContent align="end">
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {publicError && (
              <div className="mt-2 text-xs text-destructive">{publicError}</div>
            )}
          </div>
          <div className="mt-4 flex justify-end">
            <div className="text-xs text-muted-foreground">
              Remember to save your changes below.
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={handleSaveChanges}
              disabled={!canSaveChanges}
            >
              {isSavingChanges ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between pb-3">
          <div>
            <h3 className="text-sm font-semibold">Members</h3>
            <p className="text-xs text-muted-foreground">
              {members.length} member{members.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {loading && (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            Loading members...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && members.length === 0 && (
          <div className="rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            No members yet.
          </div>
        )}

        {!loading && !error && members.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const username = member.user?.username ?? "Unknown user";
                  const isOwner = member.role_id === 1;
                  const isSaving = savingIds.has(member.user_id);

                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar size="sm">
                            <AvatarImage
                              src={member.user?.thumbnail ?? undefined}
                              alt={username}
                            />
                            <AvatarFallback>
                              {getInitials(username) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium">
                              {username}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {isOwner ? (
                          <Badge variant="secondary">Owner</Badge>
                        ) : (
                          <Select
                            value={String(member.role_id)}
                            onValueChange={(value) =>
                              handleRoleChange(member, Number(value))
                            }
                            disabled={isSaving}
                          >
                            <SelectTrigger size="sm" className="min-w-35">
                              <SelectValue
                                placeholder={
                                  ROLE_LABELS[member.role_id] ?? "Member"
                                }
                              />
                            </SelectTrigger>
                            <SelectContent align="start">
                              {ROLE_OPTIONS.map((role) => (
                                <SelectItem
                                  key={role.id}
                                  value={String(role.id)}
                                >
                                  {role.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="mt-6 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-destructive">
                Danger zone
              </h3>
              <p className="text-xs text-muted-foreground">
                Deleting the server removes all channels, messages, and members.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                setDeleteConfirmOpen(true);
                setDeleteConfirmText("");
                setDeleteConfirmError(null);
              }}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete server"}
            </Button>
          </div>
          {deleteError && (
            <div className="mt-3 text-xs text-destructive">{deleteError}</div>
          )}
        </div>
      </div>

      {ownerConfirm && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Transfer ownership</h3>
              <p className="text-sm text-muted-foreground">
                You are about to set{" "}
                <span className="font-medium text-foreground">
                  {ownerConfirm.member.user?.username ?? "this member"}
                </span>{" "}
                as the new owner.
              </p>
              <p className="text-sm text-destructive">
                If you continue, you will lose all permissions and will no
                longer be able to manage this server.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold tracking-wide text-muted-foreground">
                TYPE `{ownerConfirmPhrase}` TO CONFIRM
              </label>
              <Input
                value={ownerConfirmText}
                onChange={(event) => {
                  setOwnerConfirmText(event.target.value);
                  if (ownerConfirmError) {
                    setOwnerConfirmError(null);
                  }
                }}
                placeholder={ownerConfirmPhrase}
              />
              {ownerConfirmError && (
                <div className="text-xs text-destructive">
                  {ownerConfirmError}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setOwnerConfirm(null);
                  setOwnerConfirmText("");
                  setOwnerConfirmError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmOwnerTransfer}
                disabled={
                  ownerConfirmText.trim() !== ownerConfirmPhrase ||
                  savingIds.has(ownerConfirm.member.user_id)
                }
              >
                Transfer ownership
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border bg-background p-6 shadow-lg">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-destructive">
                Delete server
              </h3>
              <p className="text-sm text-muted-foreground">
                You are about to delete{" "}
                <span className="font-medium text-foreground">
                  {displayServerName}
                </span>
                .
              </p>
              <p className="text-sm text-destructive">
                This will remove channels, messages, and memberships
                permanently.
              </p>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs font-semibold tracking-wide text-muted-foreground">
                TYPE `{ownerConfirmPhrase}` TO CONFIRM
              </label>
              <Input
                value={deleteConfirmText}
                onChange={(event) => {
                  setDeleteConfirmText(event.target.value);
                  if (deleteConfirmError) {
                    setDeleteConfirmError(null);
                  }
                }}
                placeholder={ownerConfirmPhrase}
              />
              {deleteConfirmError && (
                <div className="text-xs text-destructive">
                  {deleteConfirmError}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setDeleteConfirmText("");
                  setDeleteConfirmError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  if (deleteConfirmText.trim() !== ownerConfirmPhrase) {
                    setDeleteConfirmError(
                      `Please type "${ownerConfirmPhrase}" to confirm deletion.`,
                    );
                    return;
                  }
                  setDeleteConfirmOpen(false);
                  setDeleteConfirmText("");
                  setDeleteConfirmError(null);
                  await handleDeleteServer();
                }}
                disabled={isDeleting}
              >
                Delete server
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
