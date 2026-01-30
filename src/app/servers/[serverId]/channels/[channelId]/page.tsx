import { ChatPane } from "@/components/chat-pane"

export default async function ChannelPage({
    params,
    }: {
    params: Promise<{ serverId: string; channelId: string }>
    }) {
    const { serverId, channelId } = await params

    // TODO: when auth is implemented, replace this hard-coded
    // username with the logged-in user's username.
    return (
      <ChatPane
        serverId={serverId}
        channelId={channelId}
        currentUserName="sarac"
      />
    )
}
