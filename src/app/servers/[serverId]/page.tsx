import { redirect } from "next/navigation"

type ChannelApiItem =
  | { props: { id: number | string } }
  | { id: number | string }

export default async function ServerPage({
  params,
}: {
  params: Promise<{ serverId: string }>
}) {
  const { serverId } = await params

  // Si jamais Next appelle cette page sans param (cas extrême / bug HMR),
  // on redirige proprement vers la liste des serveurs au lieu de crasher.
  if (!serverId) {
    redirect("/servers")
  }

  const res = await fetch(
    `http://localhost:4000/api/servers/${serverId}/channels`,
    {
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    }
  )

  if (!res.ok) {
    throw new Error(`Failed to fetch channels for server ${serverId}`)
  }

  const json: { channels: ChannelApiItem[] } = await res.json()
  const first = json.channels?.[0]

  const firstId =
    first && "props" in first ? first.props.id : (first as any)?.id

  if (firstId == null) {
    throw new Error(`No channel id found for server ${serverId}`)
  }

  redirect(`/servers/${serverId}/channels/${firstId}`)
}
