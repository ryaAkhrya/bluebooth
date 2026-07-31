import type { CaptureMode, CreativeCaptureTarget } from '@/types/capture'

export type { CaptureMode, CreativeCaptureTarget } from '@/types/capture'

export interface StudioDraft {
  key: string
  galleryIds: string[]
  assignments: Array<string | null>
  favorites: string[]
  hidden: string[]
  activeSlot: number
}

export function resolveCaptureCount(
  mode: CaptureMode,
  target: CreativeCaptureTarget,
  templateSlots: number,
): number {
  if (mode === 'quick') return Math.max(1, templateSlots)
  return target === 'unlimited' ? 24 : target
}

export function originalAssetId(assetId: string): string {
  return assetId.split('::copy:')[0]
}

export function assetShotIndex(assetId: string): number | null {
  const match = /^shot-(\d+)$/.exec(originalAssetId(assetId))
  return match ? Number(match[1]) : null
}

export function createStudioDraft(input: {
  key: string
  assetIds: readonly string[]
  slotCount: number
  mode: CaptureMode
}): StudioDraft {
  const assignments = Array<string | null>(input.slotCount).fill(null)
  if (input.mode === 'quick') {
    for (let index = 0; index < assignments.length; index += 1) {
      assignments[index] = input.assetIds[index] ?? null
    }
  }
  return {
    key: input.key,
    galleryIds: [...input.assetIds],
    assignments,
    favorites: [],
    hidden: [],
    activeSlot: Math.max(0, assignments.findIndex((value) => value === null)),
  }
}

export function autoFillStudio(draft: StudioDraft): StudioDraft {
  const favorites = new Set(draft.favorites.map(originalAssetId))
  const visible = draft.galleryIds.filter(
    (id) => !draft.hidden.includes(originalAssetId(id)),
  )
  const prioritized = [...visible].sort((left, right) => {
    const favoriteDifference =
      Number(favorites.has(originalAssetId(right))) -
      Number(favorites.has(originalAssetId(left)))
    if (favoriteDifference !== 0) return favoriteDifference
    return (assetShotIndex(right) ?? -1) - (assetShotIndex(left) ?? -1)
  })
  const alreadyUsed = new Set(draft.assignments.filter(Boolean))
  const available = prioritized.filter((id) => !alreadyUsed.has(id))
  let cursor = 0
  return {
    ...draft,
    assignments: draft.assignments.map(
      (current) => current ?? available[cursor++] ?? null,
    ),
  }
}

export function shuffleStudio(draft: StudioDraft, seed = Date.now()): StudioDraft {
  const visible = draft.galleryIds.filter(
    (id) => !draft.hidden.includes(originalAssetId(id)),
  )
  let value = Math.max(1, Math.round(seed))
  const shuffled = [...visible]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    value = (value * 16807) % 2147483647
    const swapIndex = value % (index + 1)
    ;[shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ]
  }
  return {
    ...draft,
    assignments: draft.assignments.map((_, index) => shuffled[index] ?? null),
  }
}

export function assignStudioAsset(
  draft: StudioDraft,
  slotIndex: number,
  assetId: string,
): StudioDraft {
  if (slotIndex < 0 || slotIndex >= draft.assignments.length) return draft
  const assignments = [...draft.assignments]
  assignments[slotIndex] = assetId
  const nextEmpty = assignments.findIndex((value) => value === null)
  return {
    ...draft,
    assignments,
    activeSlot: nextEmpty >= 0 ? nextEmpty : slotIndex,
  }
}

export function swapStudioSlots(
  draft: StudioDraft,
  sourceIndex: number,
  targetIndex: number,
): StudioDraft {
  if (
    sourceIndex < 0 ||
    targetIndex < 0 ||
    sourceIndex >= draft.assignments.length ||
    targetIndex >= draft.assignments.length
  ) {
    return draft
  }
  const assignments = [...draft.assignments]
  ;[assignments[sourceIndex], assignments[targetIndex]] = [
    assignments[targetIndex],
    assignments[sourceIndex],
  ]
  return { ...draft, assignments, activeSlot: targetIndex }
}
