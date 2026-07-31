'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  assignStudioAsset,
  autoFillStudio,
  createStudioDraft,
  originalAssetId,
  resolveCaptureCount,
  shuffleStudio,
  swapStudioSlots,
  type CaptureMode,
  type CreativeCaptureTarget,
  type StudioDraft,
} from '@/lib/bluebooth/creative-studio'

interface CreativePlanValue {
  mode: CaptureMode
  target: CreativeCaptureTarget
  setMode: (mode: CaptureMode) => void
  setTarget: (target: CreativeCaptureTarget) => void
  resolveShotCount: (templateSlots: number) => number
}

interface CreativeStudioValue {
  draft: StudioDraft | null
  initializeStudio: (key: string, assetIds: readonly string[], slotCount: number, mode?: CaptureMode) => void
  selectSlot: (slotIndex: number) => void
  assignAsset: (assetId: string, slotIndex?: number) => void
  clearSlot: (slotIndex: number) => void
  swapSlots: (sourceIndex: number, targetIndex: number) => void
  toggleFavorite: (assetId: string) => void
  hideAsset: (assetId: string) => void
  duplicateAsset: (assetId: string) => void
  autoFill: () => void
  shuffle: () => void
}

const CreativePlanContext = createContext<CreativePlanValue | null>(null)
const CreativeStudioContext = createContext<CreativeStudioValue | null>(null)

export function CreativeWorkflowProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<CaptureMode>('quick')
  const [target, setTarget] = useState<CreativeCaptureTarget>(8)
  const [draft, setDraft] = useState<StudioDraft | null>(null)

  const resolveShotCount = useCallback(
    (templateSlots: number) => resolveCaptureCount(mode, target, templateSlots),
    [mode, target],
  )
  const initializeStudio = useCallback(
    (key: string, assetIds: readonly string[], slotCount: number, initialMode = mode) => {
      setDraft((current) =>
        current?.key === key
          ? current
          : createStudioDraft({ key, assetIds, slotCount, mode: initialMode }),
      )
    },
    [mode],
  )
  const selectSlot = useCallback(
    (activeSlot: number) => setDraft((current) => current ? { ...current, activeSlot } : current),
    [],
  )
  const assignAsset = useCallback((assetId: string, slotIndex?: number) => {
    setDraft((current) =>
      current
        ? assignStudioAsset(current, slotIndex ?? current.activeSlot, assetId)
        : current,
    )
  }, [])
  const clearSlot = useCallback((slotIndex: number) => {
    setDraft((current) => {
      if (!current || slotIndex < 0 || slotIndex >= current.assignments.length) return current
      const assignments = [...current.assignments]
      assignments[slotIndex] = null
      return { ...current, assignments, activeSlot: slotIndex }
    })
  }, [])
  const swapSlots = useCallback(
    (sourceIndex: number, targetIndex: number) =>
      setDraft((current) => current ? swapStudioSlots(current, sourceIndex, targetIndex) : current),
    [],
  )
  const toggleFavorite = useCallback((assetId: string) => {
    const original = originalAssetId(assetId)
    setDraft((current) => {
      if (!current) return current
      const favorites = current.favorites.includes(original)
        ? current.favorites.filter((id) => id !== original)
        : [...current.favorites, original]
      return { ...current, favorites }
    })
  }, [])
  const hideAsset = useCallback((assetId: string) => {
    const original = originalAssetId(assetId)
    setDraft((current) => current ? {
      ...current,
      hidden: current.hidden.includes(original) ? current.hidden : [...current.hidden, original],
      assignments: current.assignments.map((id) =>
        id && originalAssetId(id) === original ? null : id,
      ),
    } : current)
  }, [])
  const duplicateAsset = useCallback((assetId: string) => {
    const original = originalAssetId(assetId)
    setDraft((current) => {
      if (!current) return current
      const copyCount = current.galleryIds.filter(
        (id) => originalAssetId(id) === original,
      ).length
      return {
        ...current,
        galleryIds: [...current.galleryIds, `${original}::copy:${copyCount}`],
      }
    })
  }, [])
  const autoFill = useCallback(
    () => setDraft((current) => current ? autoFillStudio(current) : current),
    [],
  )
  const shuffle = useCallback(
    () => setDraft((current) => current ? shuffleStudio(current) : current),
    [],
  )

  const planValue = useMemo<CreativePlanValue>(() => ({
    mode,
    target,
    setMode,
    setTarget,
    resolveShotCount,
  }), [mode, resolveShotCount, target])

  const studioValue = useMemo<CreativeStudioValue>(() => ({
    draft,
    initializeStudio,
    selectSlot,
    assignAsset,
    clearSlot,
    swapSlots,
    toggleFavorite,
    hideAsset,
    duplicateAsset,
    autoFill,
    shuffle,
  }), [
    assignAsset,
    autoFill,
    clearSlot,
    draft,
    duplicateAsset,
    hideAsset,
    initializeStudio,
    selectSlot,
    shuffle,
    swapSlots,
    toggleFavorite,
  ])

  return (
    <CreativePlanContext.Provider value={planValue}>
      <CreativeStudioContext.Provider value={studioValue}>
        {children}
      </CreativeStudioContext.Provider>
    </CreativePlanContext.Provider>
  )
}

export function useCreativePlan() {
  const value = useContext(CreativePlanContext)
  if (!value) throw new Error('useCreativePlan must be used inside CreativeWorkflowProvider')
  return value
}

export function useCreativeStudio() {
  const value = useContext(CreativeStudioContext)
  if (!value) throw new Error('useCreativeStudio must be used inside CreativeWorkflowProvider')
  return value
}
