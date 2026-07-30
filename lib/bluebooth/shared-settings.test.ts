import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHARED_SETUP,
  applySharedSetupPatch,
  isSharedSetupPatch,
  isSharedSetupSettings,
  parseSharedSetup,
} from '@/lib/bluebooth/shared-settings'

describe('shared setup configuration', () => {
  it('restores defaults from an empty Phase 03 settings object', () => {
    expect(parseSharedSetup({})).toEqual(DEFAULT_SHARED_SETUP)
    expect(isSharedSetupSettings(DEFAULT_SHARED_SETUP)).toBe(true)
  })

  it('accepts host-controlled synchronized setting groups', () => {
    expect(isSharedSetupPatch({ selectedGrid: 'strip-3' })).toBe(true)
    expect(isSharedSetupPatch({ selectedFrame: 'powder-blue' })).toBe(true)
    expect(isSharedSetupPatch({ timer: 10 })).toBe(true)
    expect(
      isSharedSetupPatch({
        layout: { gap: 12, padding: 24, radius: 16, background: '#aabbcc' },
      }),
    ).toBe(true)
    expect(
      isSharedSetupPatch({
        cameraSettings: {
          mirror: false,
          brightness: 1.1,
          contrast: 0.9,
          saturation: 1,
          warmth: 5,
          zoom: 1.2,
          fit: 'cover',
          filter: 'warm',
        },
      }),
    ).toBe(true)
    expect(isSharedSetupPatch({ cameraMode: 'split' })).toBe(true)
    expect(isSharedSetupPatch({ shotDelay: 3 })).toBe(true)
    expect(isSharedSetupPatch({ timerSound: false })).toBe(true)
  })

  it('rejects local-only or oversized patch shapes', () => {
    expect(isSharedSetupPatch({ cameraSettings: { mirror: true } })).toBe(false)
    expect(isSharedSetupPatch({ selectedGrid: 'strip-3', timer: 3 })).toBe(false)
    expect(isSharedSetupPatch({ layout: { gap: 999 } })).toBe(false)
  })

  it('applies a patch without mutating the previous state', () => {
    const next = applySharedSetupPatch(DEFAULT_SHARED_SETUP, { timer: 10 })
    expect(next.timer).toBe(10)
    expect(DEFAULT_SHARED_SETUP.timer).toBe(5)
  })

  it('applies host camera presentation settings as one authoritative value', () => {
    const cameraSettings = {
      mirror: false,
      brightness: 1.2,
      contrast: 0.8,
      saturation: 1.1,
      warmth: 12,
      zoom: 1.3,
      fit: 'contain' as const,
      filter: 'film',
    }
    const next = applySharedSetupPatch(DEFAULT_SHARED_SETUP, {
      cameraSettings,
    })

    expect(next.cameraSettings).toEqual(cameraSettings)
    expect(next.cameraSettings).not.toBe(cameraSettings)
    expect(DEFAULT_SHARED_SETUP.cameraSettings.mirror).toBe(true)
  })

  it('applies the complete host booth configuration in revision order', () => {
    const patches = [
      { selectedGrid: 'strip-3' } as const,
      { selectedFrame: 'powder-blue' } as const,
      {
        layout: {
          gap: 12,
          padding: 24,
          radius: 16,
          background: '#aabbcc',
        },
      } as const,
      { cameraMode: 'split' } as const,
      { swap: true } as const,
      { timer: 10 } as const,
      {
        cameraSettings: {
          mirror: false,
          brightness: 1.2,
          contrast: 0.9,
          saturation: 1.1,
          warmth: 8,
          zoom: 1.25,
          fit: 'contain',
          filter: 'warm',
        },
      } as const,
    ]
    const settings = patches.reduce(applySharedSetupPatch, DEFAULT_SHARED_SETUP)

    expect(settings).toMatchObject({
      selectedGrid: 'strip-3',
      selectedFrame: 'powder-blue',
      cameraMode: 'split',
      swap: true,
      timer: 10,
      layout: patches[2].layout,
      cameraSettings: patches[6].cameraSettings,
    })
  })
})
