import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ChatPane } from "@/components/chat-pane";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface ServerContext {
  isAdmin?: boolean;
  isOwner?: boolean;
  currentUserId?: number | string | null;
  currentUserName?: string | null;
}

async function getCookieHeader() {
  const cookieStore = cookies();
  return (await cookieStore).toString();
}

async function isAuthenticated(cookieHeader: string) {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  return res.status !== 401;
}

async function fetchServerContext(
  serverId: string,
  cookieHeader: string,
): Promise<ServerContext> {
  try {
    const res = await fetch(`${API_BASE}/api/servers/${serverId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
      },
      cache: "no-store",
    });

    if (!res.ok) return {};
    return (await res.json()) as ServerContext;
  } catch {
    // graceful fallback; user will just see default labels
    return {};
  }
}

function toChatContext(context: ServerContext) {
  return {
    currentUserId: context.currentUserId ?? undefined,
    currentUserName: context.currentUserName ?? undefined,
    canModerateOthers: Boolean(context.isAdmin || context.isOwner),
  };
}

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ serverId: string; channelId: string }>;
}) {
  const cookieHeader = await getCookieHeader();
  const isAuth = await isAuthenticated(cookieHeader);

  if (!isAuth) {
    return redirect("/auth/login");
  }

  const { serverId, channelId } = await params;
  const serverContext = await fetchServerContext(serverId, cookieHeader);
  const chatContext = toChatContext(serverContext);

  return (
    <ChatPane
      serverId={serverId}
      channelId={channelId}
      currentUserId={chatContext.currentUserId}
      currentUserName={chatContext.currentUserName}
      canModerateOthers={chatContext.canModerateOthers}
    />
  );
}
