import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SHARED_SETUP,
  applySharedSetupPatch,
  isSharedSetupPatch,
  parseSharedSetup,
} from '@/lib/bluebooth/shared-settings'

describe('shared setup configuration', () => {
  it('restores defaults from an empty Phase 03 settings object', () => {
    expect(parseSharedSetup({})).toEqual(DEFAULT_SHARED_SETUP)
  })

  it('accepts the four synchronized setting groups', () => {
    expect(isSharedSetupPatch({ selectedGrid: 'strip-3' })).toBe(true)
    expect(isSharedSetupPatch({ selectedFrame: 'powder-blue' })).toBe(true)
    expect(isSharedSetupPatch({ timer: 10 })).toBe(true)
    expect(
      isSharedSetupPatch({
        layout: { gap: 12, padding: 24, radius: 16, background: '#aabbcc' },
      }),
    ).toBe(true)
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
})
