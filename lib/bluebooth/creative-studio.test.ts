import { describe, expect, it } from 'vitest'
import {
  assignStudioAsset,
  autoFillStudio,
  createStudioDraft,
  originalAssetId,
  resolveCaptureCount,
  shuffleStudio,
  swapStudioSlots,
} from '@/lib/bluebooth/creative-studio'

describe('creative studio workflow', () => {
  it('separates quick template slots from creative capture targets', () => {
    expect(resolveCaptureCount('quick', 12, 4)).toBe(4)
    expect(resolveCaptureCount('creative', 10, 4)).toBe(10)
    expect(resolveCaptureCount('creative', 'unlimited', 4)).toBe(24)
  })

  it('leaves creative templates empty and quick-fills quick mode', () => {
    const assets = ['shot-0', 'shot-1', 'shot-2']
    expect(
      createStudioDraft({ key: 'quick', assetIds: assets, slotCount: 2, mode: 'quick' })
        .assignments,
    ).toEqual(['shot-0', 'shot-1'])
    expect(
      createStudioDraft({ key: 'creative', assetIds: assets, slotCount: 2, mode: 'creative' })
        .assignments,
    ).toEqual([null, null])
  })

  it('prioritizes favorites and newer assets when auto-filling', () => {
    const draft = createStudioDraft({
      key: 'studio',
      assetIds: ['shot-0', 'shot-1', 'shot-2'],
      slotCount: 3,
      mode: 'creative',
    })
    expect(autoFillStudio({ ...draft, favorites: ['shot-0'] }).assignments).toEqual([
      'shot-0',
      'shot-2',
      'shot-1',
    ])
  })

  it('assigns, swaps, duplicates by source, and shuffles deterministically', () => {
    let draft = createStudioDraft({
      key: 'studio',
      assetIds: ['shot-0', 'shot-1', 'shot-2'],
      slotCount: 2,
      mode: 'creative',
    })
    draft = assignStudioAsset(draft, 0, 'shot-0::copy:1')
    draft = assignStudioAsset(draft, 1, 'shot-1')
    expect(originalAssetId(draft.assignments[0] ?? '')).toBe('shot-0')
    expect(swapStudioSlots(draft, 0, 1).assignments).toEqual([
      'shot-1',
      'shot-0::copy:1',
    ])
    expect(shuffleStudio(draft, 42)).toEqual(shuffleStudio(draft, 42))
  })
})
