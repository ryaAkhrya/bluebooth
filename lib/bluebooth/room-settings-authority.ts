export function shouldApplyRoomSnapshot(
  current: { roomId: string; revision: number } | null,
  incoming: { roomId: string; revision: number },
): boolean {
  return (
    current === null ||
    current.roomId !== incoming.roomId ||
    incoming.revision > current.revision
  )
}
