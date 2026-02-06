import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { BannedScreen } from "@/components/banned-screen";

interface ChannelApiItem {
  props?: { id: number | string };
  id?: number | string;
}

interface ChannelResponse {
  channels?: ChannelApiItem[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readString = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const buildBannedScreen = (payload: unknown) => {
  const record = isRecord(payload) ? payload : {};
  return (
    <BannedScreen
      bannedUntil={readString(record.bannedUntil)}
      reason={readString(record.reason)}
    />
  );
};

const getCookieHeader = async () => (await cookies()).toString();

const ensureAuthenticated = async (cookieHeader: string) => {
  const isAuth = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/me`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (isAuth.status === 401) {
    return redirect("/auth/login");
  }

  return null;
};

const requireServerId = async (params: Promise<{ serverId: string }>) => {
  const { serverId } = await params;
  if (!serverId) {
    redirect("/servers");
  }
  return serverId;
};

const getFirstChannelId = (channels: ChannelApiItem[]): string | number | null => {
  const first = channels[0];
  if (!first) return null;
  return "props" in first ? first.props.id : first.id;
};

const fetchChannels = async (serverId: string, cookieHeader: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/api/servers/${serverId}/channels`,
    {
      headers: { "Cookie": cookieHeader, "Content-Type": "application/json" },
      cache: "no-store",
    },
  );

  if (res.status === 403) {
    const payload = (await res.json().catch(() => ({}))) as unknown;
    return { channels: [], bannedScreen: buildBannedScreen(payload) };
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch channels for server ${serverId}`);
  }

  const json = (await res.json()) as ChannelResponse;
  return { channels: json.channels ?? [], bannedScreen: null };
};

export default async function ServerPage({
  params,
}: {
  params: Promise<{ serverId: string }>;
}) {
  const cookieHeader = await getCookieHeader();
  await ensureAuthenticated(cookieHeader);
  const serverId = await requireServerId(params);

  // Si jamais Next appelle cette page sans param (cas extrême / bug HMR),
  // on redirige proprement vers la liste des serveurs au lieu de crasher.
  const { channels, bannedScreen } = await fetchChannels(serverId, cookieHeader);
  if (bannedScreen) return bannedScreen;
  const firstId = getFirstChannelId(channels);

  if (firstId == null) {
    throw new Error(`No channel id found for server ${serverId}`);
  }

  redirect(`/servers/${serverId}/channels/${firstId}`);
}
