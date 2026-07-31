import { describe, expect, it } from 'vitest'
import {
  getResultHistoryDisplay,
  signedUrlNeedsRefresh,
} from '@/lib/bluebooth/result-history'

describe('result history presentation', () => {
  it('derives grid name and ratio from frozen result metadata', () => {
    expect(
      getResultHistoryDisplay(
        { configuration: { selectedGrid: 'ig-square-4' } },
        1080,
        1080,
      ),
    ).toEqual({ gridName: 'Square 4', ratio: '1:1' })
  })

  it('falls back to a reduced dimensions ratio for legacy metadata', () => {
    expect(getResultHistoryDisplay({}, 1600, 900)).toEqual({
      gridName: 'Photobooth result',
      ratio: '16:9',
    })
  })

  it('refreshes signed URLs only near expiry', () => {
    expect(signedUrlNeedsRefresh(120_000, 60_000)).toBe(false)
    expect(signedUrlNeedsRefresh(85_000, 60_000)).toBe(true)
  })
})
