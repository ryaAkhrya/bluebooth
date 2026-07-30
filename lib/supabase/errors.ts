import type { PostgrestError } from '@supabase/supabase-js'

export class SupabaseServiceError extends Error {
  readonly code: string | undefined

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'SupabaseServiceError'
    this.code = code
  }
}

export type RoomErrorKind =
  | 'authentication'
  | 'invalid-code'
  | 'invalid-name'
  | 'not-found'
  | 'expired'
  | 'closed'
  | 'full'
  | 'membership'
  | 'revision-conflict'
  | 'invalid-settings'
  | 'unavailable'

export class RoomServiceError extends SupabaseServiceError {
  readonly kind: RoomErrorKind

  constructor(kind: RoomErrorKind, message: string, code?: string) {
    super(message, code)
    this.name = 'RoomServiceError'
    this.kind = kind
  }
}

const roomErrorMessages: Record<string, { kind: RoomErrorKind; message: string }> = {
  authentication_required: {
    kind: 'authentication',
    message: 'Online authentication is unavailable.',
  },
  invalid_room_code: { kind: 'invalid-code', message: 'Enter a valid room code.' },
  invalid_display_name: { kind: 'invalid-name', message: 'Enter a valid display name.' },
  invalid_room_name: { kind: 'invalid-name', message: 'Enter a valid room name.' },
  room_not_found: { kind: 'not-found', message: 'That room could not be found.' },
  room_expired: { kind: 'expired', message: 'That room has expired.' },
  room_closed: { kind: 'closed', message: 'That room is closed.' },
  room_not_available: { kind: 'closed', message: 'That room is no longer available.' },
  room_full: { kind: 'full', message: 'That room already has two participants.' },
  membership_required: {
    kind: 'membership',
    message: 'You are no longer an active room member.',
  },
  settings_revision_conflict: {
    kind: 'revision-conflict',
    message: 'The room settings changed on another device.',
  },
  invalid_settings_patch: {
    kind: 'invalid-settings',
    message: 'That setup change is not supported.',
  },
}

export function roomServiceError(
  error: Pick<PostgrestError, 'code' | 'message'>,
): RoomServiceError {
  const matched = Object.entries(roomErrorMessages).find(([token]) =>
    error.message.includes(token),
  )?.[1]
  return matched
    ? new RoomServiceError(matched.kind, matched.message, error.code)
    : new RoomServiceError(
        'unavailable',
        'Online room services are temporarily unavailable.',
        error.code,
      )
}

export function throwPostgrestError(error: PostgrestError): never {
  throw new SupabaseServiceError(error.message, error.code)
}
