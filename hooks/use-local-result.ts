'use client'

import { useCallback } from 'react'
import { RESULT_STORAGE_KEY } from '@/lib/bluebooth/constants'
import {
  saveLocalResult,
  type SavedResultMetadata,
} from '@/lib/bluebooth/local-result-store'

export function useLocalResult() {
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

  return { save }
}
