'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RESULT_STORAGE_KEY } from '@/lib/bluebooth/constants'
import {
  loadLocalResult,
  saveLocalResult,
  type SavedResultMetadata,
} from '@/lib/bluebooth/local-result-store'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'
import type { SavedResult } from '@/types/bluebooth'

interface LegacySavedResult {
  image?: string
  code?: string
  roomName?: string
  gridName?: string
  dimensions?: readonly [number, number]
  createdAt?: string
  grid?: string
  savedAt?: number
}

function legacyMetadata(record: LegacySavedResult): SavedResultMetadata {
  const legacyGrid = record.grid ? getGridPreset(record.grid) : null
  return {
    code: record.code ?? '',
    roomName: record.roomName ?? 'Bluebooth',
    gridName: record.gridName ?? legacyGrid?.name ?? record.grid ?? 'Previous result',
    dimensions: record.dimensions ?? legacyGrid?.output ?? [0, 0],
    createdAt: record.createdAt ?? new Date(record.savedAt ?? Date.now()).toISOString(),
  }
}

export function useLocalResult() {
  const [result, setResult] = useState<SavedResult | null>(null)
  const resultUrlRef = useRef<string | null>(null)

  const replaceResult = useCallback((blob: Blob, metadata: SavedResultMetadata) => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
    const image = URL.createObjectURL(blob)
    resultUrlRef.current = image
    setResult({ image, ...metadata })
  }, [])

  const load = useCallback(async () => {
    try {
      const stored = await loadLocalResult()
      if (stored) {
        replaceResult(stored.blob, stored.metadata)
        return
      }
    } catch {
      // Fall through to the Phase 01 localStorage format.
    }
    try {
      const raw = window.localStorage.getItem(RESULT_STORAGE_KEY)
      const legacy = raw ? (JSON.parse(raw) as LegacySavedResult) : null
      if (!legacy?.image) {
        setResult(null)
        return
      }
      const response = await fetch(legacy.image)
      const blob = await response.blob()
      const metadata = legacyMetadata(legacy)
      replaceResult(blob, metadata)
      try {
        await saveLocalResult(blob, metadata)
        window.localStorage.setItem(
          RESULT_STORAGE_KEY,
          JSON.stringify({ version: 2, ...metadata }),
        )
      } catch {
        // Keep the legacy value intact if migration is unavailable.
      }
    } catch {
      setResult(null)
    }
  }, [replaceResult])

  const save = useCallback(async (blob: Blob, metadata: SavedResultMetadata) => {
    await saveLocalResult(blob, metadata)
    try {
      window.localStorage.setItem(
        RESULT_STORAGE_KEY,
        JSON.stringify({ version: 2, ...metadata }),
      )
    } catch {
      // IndexedDB remains the source of truth if metadata storage is unavailable.
    }
  }, [])

  useEffect(() => () => {
    if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current)
  }, [])

  return { result, load, save }
}
