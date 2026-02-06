import { prisma } from "@/backend/infrastructure/persistence/prisma/prisma.client";

export class HttpError extends Error {
  status: number;
  payload: Record<string, unknown>;

  constructor(status: number, payload: Record<string, unknown>) {
    super(typeof payload?.message === "string" ? payload.message : "HttpError");
    this.status = status;
    this.payload = payload;
  }
}

export async function assertNotBanned(
  userId: number,
  serverId: number,
): Promise<void> {
  if (!Number.isFinite(userId) || !Number.isFinite(serverId)) {
    return;
  }

  const membership = await prisma.memberships.findFirst({
    where: { user_id: userId, server_id: serverId },
    select: { banned_until: true, ban_reason: true },
  });

  if (membership?.banned_until && membership.banned_until > new Date()) {
    throw new HttpError(403, {
      message: "Vous avez été banni de ce serveur",
      bannedUntil: membership.banned_until.toISOString(),
      reason: membership.ban_reason ?? null,
    });
  }
}
