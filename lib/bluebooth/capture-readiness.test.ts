import { describe, expect, it } from 'vitest'
import { getCaptureReadiness } from '@/lib/bluebooth/capture-readiness'

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
})
