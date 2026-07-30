import { describe, expect, it } from 'vitest'
import { shouldApplyRoomSnapshot } from '@/lib/bluebooth/room-settings-authority'

describe('room settings authority', () => {
  it('rejects a stale refresh that completes after a newer realtime revision', () => {
    expect(
      shouldApplyRoomSnapshot(
        { roomId: 'room-a', revision: 8 },
        { roomId: 'room-a', revision: 7 },
      ),
    ).toBe(false)
  })

  it('rejects equal revisions so reconciliation cannot overwrite current settings', () => {
    expect(
      shouldApplyRoomSnapshot(
        { roomId: 'room-a', revision: 8 },
        { roomId: 'room-a', revision: 8 },
      ),
    ).toBe(false)
  })

  it('accepts newer and different-room snapshots', () => {
    expect(
      shouldApplyRoomSnapshot(
        { roomId: 'room-a', revision: 8 },
        { roomId: 'room-a', revision: 9 },
      ),
    ).toBe(true)
    expect(
      shouldApplyRoomSnapshot(
        { roomId: 'room-a', revision: 8 },
        { roomId: 'room-b', revision: 1 },
      ),
    ).toBe(true)
  })
})
