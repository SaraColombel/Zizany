interface BannedScreenProps {
  bannedUntil?: string | null;
  reason?: string | null;
}

function formatBanEnd(bannedUntil?: string | null) {
  if (!bannedUntil) return null;
  const date = new Date(bannedUntil);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

export function BannedScreen({ bannedUntil, reason }: BannedScreenProps) {
  const endLabel = formatBanEnd(bannedUntil);

  return (
    <div className="flex flex-1 min-h-[calc(100vh-var(--header-height))] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border bg-background p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold">You have been banned</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You can no longer access this server for now.
        </p>
        {endLabel && (
          <p className="mt-4 text-sm">
            Ban ends:{" "}
            <span className="font-medium text-foreground">{endLabel}</span>
          </p>
        )}
        {reason && (
          <p className="mt-2 text-sm">
            Reason:{" "}
            <span className="font-medium text-foreground">{reason}</span>
          </p>
        )}
      </div>
    </div>
  );
}
