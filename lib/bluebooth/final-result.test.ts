import { describe, expect, it } from 'vitest'
import { releaseFinalRenderKey } from '@/lib/bluebooth/final-result'

describe('final result render lifecycle', () => {
  it('releases an interrupted render so Strict Mode can retry it', () => {
    const key = 'session-id:2'
    expect(releaseFinalRenderKey(key, key)).toBeNull()
  })

  it('does not clear a newer render key during stale cleanup', () => {
    expect(releaseFinalRenderKey('session-id:3', 'session-id:2')).toBe(
      'session-id:3',
    )
  })
})
