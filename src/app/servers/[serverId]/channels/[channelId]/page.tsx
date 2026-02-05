import { cookies } from "next/headers";

import { ChatPane } from "@/components/chat-pane";
import { redirect } from "next/navigation";

interface ServerContext {
  isAdmin?: boolean;
  isOwner?: boolean;
  currentUserId?: number | string | null;
  currentUserName?: string | null;
}

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ serverId: string; channelId: string }>;
}) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const cookieStore = cookies();
  const cookieHeader = (await cookieStore).toString();

  const isAuth = await fetch(`${apiBase}/api/auth/me`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (isAuth.status === 401) {
    return redirect("/auth/login");
  }

  const { serverId, channelId } = await params;
  let serverContext: ServerContext = {};
  try {
    const res = await fetch(`${apiBase}/api/servers/${serverId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "cookie": cookieHeader,
      },
      cache: "no-store",
    });

    if (res.ok) {
      serverContext = await res.json();
    }
  } catch {
    // graceful fallback; user will just see default labels
  }

  const {
    isAdmin = false,
    isOwner = false,
    currentUserId = null,
    currentUserName = null,
  } = serverContext;

  return (
    <ChatPane
      serverId={serverId}
      channelId={channelId}
      currentUserId={currentUserId ?? undefined}
      currentUserName={currentUserName ?? undefined}
      canModerateOthers={isAdmin || isOwner}
    />
  );
}
