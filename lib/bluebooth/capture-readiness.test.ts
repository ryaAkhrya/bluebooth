import { describe, expect, it } from 'vitest'
import {
  getCaptureReadiness,
  getCaptureReadinessKey,
  shouldHydrateCaptureSnapshot,
  shouldPollCaptureReadinessTransition,
} from '@/lib/bluebooth/capture-readiness'

const members = [
  { user_id: 'host', left_at: null },
  { user_id: 'partner', left_at: null },
]

describe('capture readiness authority', () => {
  it('accepts two durable acknowledgements even with duplicate presence entries', () => {
    expect(
      getCaptureReadiness(
        members,
        { host: true, partner: true },
        [{ userId: 'host' }, { userId: 'partner' }, { userId: 'partner' }],
      ),
    ).toEqual({
      bothReady: true,
      participantsConnected: true,
      canStartCapture: true,
    })
  })

  it('blocks capture when either acknowledgement is missing', () => {
    expect(
      getCaptureReadiness(
        members,
        { host: true, partner: false },
        [{ userId: 'host' }, { userId: 'partner' }],
      ).canStartCapture,
    ).toBe(false)
  })

  it('blocks capture when an acknowledged participant disconnects', () => {
    expect(
      getCaptureReadiness(
        members,
        { host: true, partner: true },
        [{ userId: 'host' }],
      ),
    ).toEqual({
      bothReady: true,
      participantsConnected: false,
      canStartCapture: false,
    })
  })

  it('rejects a delayed snapshot from the previous shot revision', () => {
    const current = {
      session: { id: 'session', revision: 2, current_shot_index: 1 },
    }
    const delayed = {
      session: { id: 'session', revision: 1, current_shot_index: 0 },
    }

    expect(shouldHydrateCaptureSnapshot(current, delayed)).toBe(false)
    expect(shouldHydrateCaptureSnapshot(delayed, current)).toBe(true)
  })

  it('allows same-revision refreshes to add readiness acknowledgements', () => {
    const session = {
      session: { id: 'session', revision: 2, current_shot_index: 1 },
    }

    expect(shouldHydrateCaptureSnapshot(session, session)).toBe(true)
  })

  it('scopes readiness acknowledgement caching to the current shot', () => {
    expect(
      getCaptureReadinessKey(
        { id: 'session', revision: 2, current_shot_index: 1 },
        true,
      ),
    ).not.toBe(
      getCaptureReadinessKey(
        { id: 'session', revision: 2, current_shot_index: 2 },
        true,
      ),
    )
  })

  it('keeps durable reconciliation active across a multi-shot boundary', () => {
    expect(shouldPollCaptureReadinessTransition('countdown')).toBe(true)
    expect(shouldPollCaptureReadinessTransition('waiting-for-uploads')).toBe(
      true,
    )
    expect(shouldPollCaptureReadinessTransition('waiting-for-ready')).toBe(true)
    expect(shouldPollCaptureReadinessTransition('review')).toBe(false)
    expect(shouldPollCaptureReadinessTransition('completed')).toBe(false)
  })
})
