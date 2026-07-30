import { BlueboothApp } from '@/components/bluebooth/bluebooth-app'

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  return <BlueboothApp initialJoinCode={code.slice(0, 6).toUpperCase()} />
}
