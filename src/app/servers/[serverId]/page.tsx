import { redirect } from "next/navigation"

export default async function ServerPage({
  params,
}: {
  params: Promise<{ serverId: string }>
}) {
  const { serverId } = await params

  // Redirige vers le premier channel du serveur
  redirect(`/servers/${serverId}/channels/general`)
}
