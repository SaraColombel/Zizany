import * as React from "react"
import { ServerChannelsSidebar } from "@/components/server-channels-sidebar"
import { ServerMembersSidebar } from "@/components/server-members-sidebar"
import { BannedScreen } from "@/components/banned-screen"
import { cookies } from "next/headers";

interface MembershipBase {
    user_id?: number | string | null
    banned_until?: string | null
    bannedUntil?: string | null
    ban_reason?: string | null
}

interface ServerInfos {
    currentUserId?: number | string | null
    membership?: unknown
    isAdmin?: boolean
    isOwner?: boolean
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null

const readString = (value: unknown): string | null =>
    typeof value === "string" ? value : null

const readStringOrNumber = (value: unknown): string | number | null =>
    typeof value === "string" || typeof value === "number" ? value : null

const normalizeMembership = (value: unknown): MembershipBase | null => {
    if (!isRecord(value)) return null
    const base = isRecord(value.props) ? value.props : value
    return {
        user_id: readStringOrNumber(base.user_id),
        banned_until: readString(base.banned_until),
        bannedUntil: readString(base.bannedUntil),
        ban_reason: readString(base.ban_reason),
    }
}

const getMemberships = (raw: unknown): MembershipBase[] => {
    if (!Array.isArray(raw)) return []
    return raw
        .map(normalizeMembership)
        .filter((item): item is MembershipBase => item !== null)
}

const getBannedUntil = (base: MembershipBase | null): string | null => {
    if (!base) return null
    if (base.banned_until) return base.banned_until
    if (base.bannedUntil) return base.bannedUntil
    return null
}

const buildBannedScreenFromMembership = (
    serverInfos: ServerInfos
): React.ReactNode | null => {
    const currentUserId = Number(serverInfos?.currentUserId)
    if (!Number.isFinite(currentUserId)) return null

    const memberships = getMemberships(serverInfos?.membership)
    const ownMembership =
        memberships.find((member) => Number(member.user_id) === currentUserId) ??
        null
    const bannedUntil = getBannedUntil(ownMembership)
    if (!bannedUntil) return null

    const parsed = new Date(bannedUntil)
    if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) return null

    return (
        <BannedScreen
            bannedUntil={bannedUntil}
            reason={ownMembership?.ban_reason ?? null}
        />
    )
}

const loadServerData = async (
    serverId: string,
    cookieHeader: string
): Promise<{
    serverInfos: ServerInfos | null
    bannedScreen: React.ReactNode | null
}> => {
    const res = await fetch(`http://localhost:4000/api/servers/${serverId}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            cookie: cookieHeader,
        },
    })

    if (res.status === 403) {
        const payload = await res.json().catch(() => ({}))
        const payloadRecord = isRecord(payload) ? payload : {}
        return {
            serverInfos: null,
            bannedScreen: (
                <BannedScreen
                    bannedUntil={readString(payloadRecord.bannedUntil)}
                    reason={readString(payloadRecord.reason)}
                />
            ),
        }
    }

    const serverInfos = (await res.json()) as ServerInfos
    return {
        serverInfos,
        bannedScreen: buildBannedScreenFromMembership(serverInfos),
    }
}

export default async function ServerLayout({
    children,
    params,
    }: {
    children: React.ReactNode
    params: Promise<{ serverId: string }>
    }) {
    const { serverId } = await params
    const cookieStore = cookies();
    const cookieHeader = (await cookieStore).toString();
    const { serverInfos, bannedScreen } = await loadServerData(
        serverId,
        cookieHeader
    )
    if (bannedScreen) return bannedScreen
    if (!serverInfos) return null

    return (
        <div className="flex flex-1 min-h-[calc(100vh-var(--header-height))]">
        {/* Channels */}
        <div className="w-56 shrink-0 border-r">
            <ServerChannelsSidebar serverId={serverId} canManageChannels={ serverInfos.isAdmin || serverInfos.isOwner }/>
        </div>

        {/* Messages */}
        <main className="flex-1 min-w-0">
            {children}
        </main>

        {/* Members */}
        <ServerMembersSidebar serverId={serverId} />
        </div>
    )
}
