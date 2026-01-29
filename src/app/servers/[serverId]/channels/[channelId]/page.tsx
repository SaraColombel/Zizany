import { ChatPane } from "@/components/chat-pane"

export default async function ChannelPage({
    params,
    }: {
    params: Promise<{ serverId: string; channelId: string }>
    }) {
    const { serverId, channelId } = await params

    return <ChatPane serverId={serverId} channelId={channelId} />
}
