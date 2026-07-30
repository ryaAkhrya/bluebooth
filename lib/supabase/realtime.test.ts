import { describe, expect, it } from 'vitest'
import {
  flattenRoomPresence,
  isRoomLifecycleEvent,
  isRoomSettingsEvent,
} from '@/lib/supabase/realtime'

const envelope = {
  eventId: '11111111-1111-4111-8111-111111111111',
  roomId: '22222222-2222-4222-8222-222222222222',
  senderUserId: '33333333-3333-4333-8333-333333333333',
  sentAt: '2026-07-30T10:00:00.000Z',
}

describe('room realtime payloads', () => {
  it('accepts a small validated settings event', () => {
    expect(
      isRoomSettingsEvent({
        ...envelope,
        revision: 2,
        payload: { timer: 10 },
      }),
    ).toBe(true)
  })

  it('rejects media and unknown lifecycle payloads', () => {
    expect(
      isRoomSettingsEvent({
        ...envelope,
        revision: 2,
        payload: { image: 'data:image/png;base64,large' },
      }),
    ).toBe(false)
    expect(isRoomLifecycleEvent({ ...envelope, event: 'capture:start' })).toBe(false)
  })

  it('flattens and de-duplicates valid presence by authenticated user id', () => {
    const presence = {
      first: [
        {
          userId: envelope.senderUserId,
          displayName: 'Host',
          role: 'host',
          stage: 'waiting',
          cameraReady: false,
          joinedAt: envelope.sentAt,
        },
      ],
      duplicate: [
        {
          userId: envelope.senderUserId,
          displayName: 'Host',
          role: 'host',
          stage: 'setup',
          cameraReady: true,
          joinedAt: envelope.sentAt,
        },
      ],
      invalid: [{ userId: 'spoofed' }],
    }
    expect(flattenRoomPresence(presence)).toEqual([
      expect.objectContaining({ userId: envelope.senderUserId, stage: 'setup' }),
    ])
  })
})
