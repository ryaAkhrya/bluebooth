import {
  isSharedSetupPatch,
  isSharedSetupSettings,
} from '@/lib/bluebooth/shared-settings'
import type {
  RoomLifecycleEvent,
  RoomPresence,
  RoomSettingsEvent,
} from '@/types/room'

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

export function isRoomPresence(value: unknown): value is RoomPresence {
  if (!isRecord(value)) return false
  return (
    typeof value.userId === 'string' &&
    uuidPattern.test(value.userId) &&
    typeof value.displayName === 'string' &&
    value.displayName.length > 0 &&
    value.displayName.length <= 32 &&
    (value.role === 'host' || value.role === 'partner') &&
    (value.stage === 'waiting' || value.stage === 'setup') &&
    typeof value.cameraReady === 'boolean' &&
    isIsoDate(value.joinedAt)
  )
}

function hasEventEnvelope(value: Record<string, unknown>): boolean {
  return (
    typeof value.eventId === 'string' &&
    uuidPattern.test(value.eventId) &&
    typeof value.roomId === 'string' &&
    uuidPattern.test(value.roomId) &&
    typeof value.senderUserId === 'string' &&
    uuidPattern.test(value.senderUserId) &&
    isIsoDate(value.sentAt)
  )
}

export function isRoomSettingsEvent(value: unknown): value is RoomSettingsEvent {
  if (!isRecord(value) || !hasEventEnvelope(value)) return false
  return (
    typeof value.revision === 'number' &&
    Number.isSafeInteger(value.revision) &&
    value.revision >= 0 &&
    isSharedSetupPatch(value.payload) &&
    (!('settings' in value) || isSharedSetupSettings(value.settings))
  )
}

export function isRoomLifecycleEvent(value: unknown): value is RoomLifecycleEvent {
  if (!isRecord(value) || !hasEventEnvelope(value)) return false
  return value.event === 'setup-entered' || value.event === 'member-left'
}

export function flattenRoomPresence(
  state: Record<string, unknown[]>,
): RoomPresence[] {
  const latestByUser = new Map<string, RoomPresence>()
  for (const entries of Object.values(state)) {
    for (const entry of entries) {
      if (isRoomPresence(entry)) latestByUser.set(entry.userId, entry)
    }
  }
  return [...latestByUser.values()]
}
