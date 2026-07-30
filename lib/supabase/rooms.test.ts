import { describe, expect, it } from 'vitest'
import { RoomServiceError, roomServiceError } from '@/lib/supabase/errors'
import { isValidRoomCode, normalizeRoomCode } from '@/lib/supabase/rooms'

describe('room service utilities', () => {
  it('normalizes a room code without truncating invalid input', () => {
    expect(normalizeRoomCode(' blu482 ')).toBe('BLU482')
    expect(isValidRoomCode(normalizeRoomCode('BLU4827'))).toBe(false)
  })

  it('maps stable RPC errors into room domain errors', () => {
    const error = roomServiceError({
      code: 'P0001',
      message: 'room_full',
    })
    expect(error).toBeInstanceOf(RoomServiceError)
    expect(error.kind).toBe('full')
    expect(error.message).toBe('That room already has two participants.')
  })

  it('keeps unexpected failures recoverable', () => {
    const error = roomServiceError({
      code: '08006',
      message: 'connection failure',
    })
    expect(error.kind).toBe('unavailable')
  })
})
