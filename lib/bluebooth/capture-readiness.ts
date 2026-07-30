export function getCaptureReadiness(
  members: ReadonlyArray<{ user_id: string; left_at: string | null }>,
  acknowledgements: Readonly<Record<string, boolean>>,
  presence: ReadonlyArray<{ userId: string }>,
) {
  const activeMembers = members.filter((member) => member.left_at === null)
  const bothReady =
    activeMembers.length === 2 &&
    activeMembers.every(
      (member) => acknowledgements[member.user_id] === true,
    )
  const participantsConnected =
    activeMembers.length === 2 &&
    activeMembers.every((member) =>
      presence.some((entry) => entry.userId === member.user_id),
    )

  return {
    bothReady,
    participantsConnected,
    canStartCapture: bothReady && participantsConnected,
  }
}
