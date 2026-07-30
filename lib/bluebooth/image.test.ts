import { describe, expect, it } from 'vitest'
import {
  buildResultFilename,
  getCaptureDimensions,
  getImageDrawPlan,
} from '@/lib/bluebooth/image'

describe('image configuration', () => {
  it('cover-crops around the center', () => {
    expect(getImageDrawPlan(1600, 900, 800, 800, 'cover')).toMatchObject({
      sourceX: 350,
      sourceY: 0,
      sourceWidth: 900,
      sourceHeight: 900,
      destinationWidth: 800,
      destinationHeight: 800,
    })
  })

  it('contain-fits without stretching', () => {
    expect(getImageDrawPlan(1600, 900, 800, 800, 'contain')).toMatchObject({
      destinationX: 0,
      destinationY: 175,
      destinationWidth: 800,
      destinationHeight: 450,
    })
  })

  it('uses the photobooth 4:3 capture contract at bounded resolution', () => {
    expect(getCaptureDimensions(1920, 1080, 1920)).toEqual([1920, 1440])
    expect(getCaptureDimensions(1080, 1920, 1920)).toEqual([1440, 1920])
    expect(getCaptureDimensions(640, 480, 1920)).toEqual([640, 480])
  })

  it('generates a stable sanitized filename', () => {
    expect(buildResultFilename(' BLU 42! ', new Date(2026, 6, 30))).toBe(
      'bluebooth-blu42-2026-07-30.png',
    )
  })
})
