const onlineUsers = new Map<number, number>();

export function markOnline(userId: number) {
  const next = (onlineUsers.get(userId) ?? 0) + 1;
  onlineUsers.set(userId, next);
  return next === 1;
}

export function markOffline(userId: number) {
  const current = onlineUsers.get(userId);
  if (!current) return false;
  if (current <= 1) {
    onlineUsers.delete(userId);
    return true;
  }
  onlineUsers.set(userId, current - 1);
  return false;
}

export function getOnlineUserIds() {
  return Array.from(onlineUsers.keys());
}

export function getOnlineUserIdSet() {
  return new Set(onlineUsers.keys());
}
