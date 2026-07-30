import type { CaptureSessionStatus } from '@/types/capture'

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

interface CaptureSessionVersion {
  id: string
  revision: number
  current_shot_index: number
}

export function shouldHydrateCaptureSnapshot(
  current: { session: CaptureSessionVersion } | null,
  next: { session: CaptureSessionVersion },
): boolean {
  return (
    current === null ||
    current.session.id !== next.session.id ||
    next.session.revision >= current.session.revision
  )
}

export function getCaptureReadinessKey(
  session: CaptureSessionVersion,
  cameraReady: boolean,
): string {
  return [
    session.id,
    session.revision,
    session.current_shot_index,
    cameraReady,
  ].join(':')
}

export function shouldPollCaptureReadinessTransition(
  status: CaptureSessionStatus,
): boolean {
  return (
    status === 'preparing' ||
    status === 'waiting-for-ready' ||
    status === 'countdown' ||
    status === 'retake-countdown' ||
    status === 'capturing' ||
    status === 'waiting-for-uploads'
  )
}
