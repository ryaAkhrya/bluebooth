import { describe, expect, it } from 'vitest'
import {
  initialSynchronizedSessionState,
  synchronizedSessionReducer,
} from '@/lib/bluebooth/synchronized-session-machine'
import type { CaptureEvent } from '@/types/capture'

const base = {
  roomId: '11111111-1111-4111-8111-111111111111',
  sessionId: '22222222-2222-4222-8222-222222222222',
  senderUserId: '33333333-3333-4333-8333-333333333333',
  sentAt: '2026-07-30T12:00:00.000Z',
}

function event(
  eventId: string,
  revision: number,
  type: 'capture:ready-ack',
): CaptureEvent {
  return {
    ...base,
    eventId,
    revision,
    type,
    payload: { cameraReady: true },
  }
}

describe('synchronized session reducer', () => {
  it('moves from preparation to one shared countdown and cancellation', () => {
    const prepared = synchronizedSessionReducer(
      initialSynchronizedSessionState,
      {
        type: 'event',
        event: {
          ...base,
          eventId: '77777777-7777-4777-8777-777777777777',
          revision: 0,
          type: 'capture:prepare',
          payload: { shotCount: 4, shotIndex: 0 },
        },
      },
    )
    const started = synchronizedSessionReducer(prepared, {
      type: 'event',
      event: {
        ...base,
        eventId: '88888888-8888-4888-8888-888888888888',
        revision: 1,
        type: 'capture:start',
        payload: {
          shotIndex: 0,
          captureAt: '2026-07-30T12:00:03.000Z',
        },
      },
    })
    const cancelled = synchronizedSessionReducer(started, {
      type: 'event',
      event: {
        ...base,
        eventId: '99999999-9999-4999-8999-999999999999',
        revision: 2,
        type: 'capture:cancel',
      },
    })
    expect(prepared.phase).toBe('waiting-for-ready')
    expect(started).toMatchObject({
      phase: 'countdown',
      captureAt: '2026-07-30T12:00:03.000Z',
    })
    expect(cancelled).toMatchObject({ phase: 'cancelled', captureAt: null })
  })

  it('ignores duplicate event ids', () => {
    const first = synchronizedSessionReducer(initialSynchronizedSessionState, {
      type: 'event',
      event: event('44444444-4444-4444-8444-444444444444', 0, 'capture:ready-ack'),
    })
    const duplicate = synchronizedSessionReducer(first, {
      type: 'event',
      event: event('44444444-4444-4444-8444-444444444444', 0, 'capture:ready-ack'),
    })
    expect(duplicate).toBe(first)
  })

  it('ignores stale revisions and requests refresh for revision gaps', () => {
    const hydrated = synchronizedSessionReducer(initialSynchronizedSessionState, {
      type: 'hydrate',
      sessionId: base.sessionId,
      revision: 3,
      phase: 'waiting-for-ready',
      shotIndex: 0,
      shotCount: 4,
      captureAt: null,
    })
    expect(
      synchronizedSessionReducer(hydrated, {
        type: 'event',
        event: event('55555555-5555-4555-8555-555555555555', 2, 'capture:ready-ack'),
      }),
    ).toBe(hydrated)
    expect(
      synchronizedSessionReducer(hydrated, {
        type: 'event',
        event: event('66666666-6666-4666-8666-666666666666', 5, 'capture:ready-ack'),
      }).needsRefresh,
    ).toBe(true)
  })
})
