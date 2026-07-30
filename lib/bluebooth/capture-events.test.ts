import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  captureIsDue,
  countdownSeconds,
  isCaptureEvent,
  parseFrozenCaptureConfiguration,
  resolveCapturedSlotImages,
  resolveSlotCaptureSources,
} from '@/lib/bluebooth/capture-events'
import {
  DEFAULT_SHARED_SETUP,
  sharedSetupToJson,
} from '@/lib/bluebooth/shared-settings'

const envelope = {
  eventId: '11111111-1111-4111-8111-111111111111',
  roomId: '22222222-2222-4222-8222-222222222222',
  sessionId: '33333333-3333-4333-8333-333333333333',
  senderUserId: '44444444-4444-4444-8444-444444444444',
  revision: 2,
  sentAt: '2026-07-30T12:00:00.000Z',
}

describe('capture event contracts', () => {
  afterEach(() => vi.useRealTimers())
  it('accepts typed timestamp commands and rejects media payloads', () => {
    expect(
      isCaptureEvent({
        ...envelope,
        type: 'capture:start',
        payload: { shotIndex: 1, captureAt: '2026-07-30T12:00:05.000Z' },
      }),
    ).toBe(true)
    expect(
      isCaptureEvent({
        ...envelope,
        type: 'capture:start',
        payload: { image: 'data:image/webp;base64,nope' },
      }),
    ).toBe(false)
  })

  it('derives countdown state from the shared target timestamp', () => {
    const target = '2026-07-30T12:00:05.000Z'
    expect(countdownSeconds(target, Date.parse('2026-07-30T12:00:01.250Z'))).toBe(4)
    expect(captureIsDue(target, Date.parse('2026-07-30T12:00:04.999Z'))).toBe(false)
    expect(captureIsDue(target, Date.parse(target))).toBe(true)
  })

  it('stays timestamp-derived when browser timers are throttled', () => {
    vi.useFakeTimers()
    vi.setSystemTime('2026-07-30T12:00:00.000Z')
    const target = '2026-07-30T12:00:03.000Z'
    expect(countdownSeconds(target, Date.now())).toBe(3)
    vi.setSystemTime('2026-07-30T12:00:02.600Z')
    expect(countdownSeconds(target, Date.now())).toBe(1)
    vi.setSystemTime('2026-07-30T12:00:05.000Z')
    expect(countdownSeconds(target, Date.now())).toBe(0)
  })

  it('assigns roles deterministically for alternate and split modes', () => {
    expect(
      resolveSlotCaptureSources({ cameraMode: 'alternate', swap: false }, 4),
    ).toEqual([
      { kind: 'single', role: 'host' },
      { kind: 'single', role: 'partner' },
      { kind: 'single', role: 'host' },
      { kind: 'single', role: 'partner' },
    ])
    expect(
      resolveSlotCaptureSources({ cameraMode: 'split', swap: true }, 1),
    ).toEqual([{ kind: 'split', left: 'partner', right: 'host' }])
    expect(
      resolveCapturedSlotImages(
        { cameraMode: 'split', swap: false },
        1,
        { 0: { host: 'host.webp', partner: 'partner.webp' } },
      ),
    ).toEqual([{ left: 'host.webp', right: 'partner.webp' }])
  })

  it('restores frozen host camera presentation settings for capture', () => {
    const cameraSettings = {
      ...DEFAULT_SHARED_SETUP.cameraSettings,
      mirror: false,
      brightness: 1.25,
      fit: 'contain' as const,
      filter: 'film',
    }
    const settings = {
      ...DEFAULT_SHARED_SETUP,
      cameraSettings,
    }
    const frozen = parseFrozenCaptureConfiguration(
      sharedSetupToJson(settings),
      {
        ...DEFAULT_SHARED_SETUP,
        customFrame: null,
        customFrameStoragePath: null,
      },
    )

    expect(frozen.cameraSettings).toEqual(cameraSettings)
  })
})
