import { describe, expect, it } from 'vitest'
import {
  getCompositionGeometry,
  getSlotIds,
  getSplitRects,
} from '@/lib/bluebooth/geometry'
import { getFramePreset } from '@/lib/bluebooth/presets/frames'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'

const emptyLayout = { gap: 0, padding: 0, radius: 0, background: '#fff' }

describe('composition geometry', () => {
  it.each([
    ['ig-square-1', 1],
    ['ig-square-4', 4],
    ['ig-story-3', 3],
    ['editorial-portrait', 4],
    ['wide-main-2-side', 3],
    ['contact-3x3', 9],
  ])('keeps slot count and ordering for %s', (id, count) => {
    const preset = getGridPreset(id)
    expect(getSlotIds(preset)).toHaveLength(count)
    expect(getCompositionGeometry({
      preset,
      frame: getFramePreset('clean-white'),
      layout: emptyLayout,
    }).slots.map((slot) => slot.id)).toEqual(getSlotIds(preset))
  })

  it.each([
    ['ig-square-1', [1080, 1080]],
    ['ig-portrait-1', [1080, 1350]],
    ['ig-story-1', [1080, 1920]],
    ['strip-3', [600, 1560]],
    ['land-1', [1600, 900]],
    ['cinematic-3', [1920, 800]],
  ] as const)('preserves configured output dimensions for %s', (id, output) => {
    const geometry = getCompositionGeometry({
      preset: getGridPreset(id),
      frame: getFramePreset('clean-white'),
      layout: emptyLayout,
    })
    expect([geometry.width, geometry.height]).toEqual(output)
  })

  it('calculates a symmetric 2 by 2 grid', () => {
    const geometry = getCompositionGeometry({
      preset: getGridPreset('ig-square-4'),
      frame: getFramePreset('clean-white'),
      layout: emptyLayout,
    })
    expect(geometry.slots[0]).toMatchObject({ x: 0, y: 0, width: 540, height: 540 })
    expect(geometry.slots[3]).toMatchObject({ x: 540, y: 540, width: 540, height: 540 })
  })

  it('calculates asymmetric editorial spans', () => {
    const geometry = getCompositionGeometry({
      preset: getGridPreset('editorial-portrait'),
      frame: getFramePreset('clean-white'),
      layout: emptyLayout,
    })
    expect(geometry.slots[0]).toMatchObject({ id: 'a', width: 720, height: 900 })
    expect(geometry.slots[3]).toMatchObject({ id: 'd', width: 1080, height: 450 })
  })

  it('reserves frame padding and label bands in the same geometry', () => {
    const geometry = getCompositionGeometry({
      preset: getGridPreset('ig-portrait-1'),
      frame: getFramePreset('top-label'),
      layout: { gap: 8, padding: 16, radius: 8, background: '#fff' },
      showDate: true,
    })
    expect(geometry.padding).toBeGreaterThan(0)
    expect(geometry.topBand).toBeGreaterThan(0)
    expect(geometry.bottomBand).toBeGreaterThan(0)
    expect(geometry.slots[0].y).toBe(geometry.padding + geometry.topBand)
  })

  it('splits a slot into ordered equal halves', () => {
    const rect = { id: 'a', x: 10, y: 20, width: 100, height: 80, radius: 8 }
    expect(getSplitRects(rect)).toEqual([
      { ...rect, id: 'a-left', width: 50 },
      { ...rect, id: 'a-right', x: 60, width: 50 },
    ])
    expect(getSplitRects(rect, true)[0].id).toBe('a-right')
  })
})
