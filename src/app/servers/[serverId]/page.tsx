export default function Page({ params }: { params: { serverId: string } }) {
  return (
    <div className="p-4">
      <div className="text-sm text-muted-foreground">
        Messages du serveur {params.serverId}
      </div>
    </div>
  )
}
