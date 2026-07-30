'use client'

import { useCallback, useState } from 'react'
import { RESULT_STORAGE_KEY } from '@/lib/bluebooth/constants'
import type { SavedResult } from '@/types/bluebooth'

export function useLocalResult() {
  const [result, setResult] = useState<SavedResult | null>(null)
  const load = useCallback(() => {
    try {
      const stored = window.localStorage.getItem(RESULT_STORAGE_KEY)
      setResult(stored ? (JSON.parse(stored) as SavedResult) : null)
    } catch {
      setResult(null)
    }
  }, [])
  const save = useCallback((next: SavedResult) => {
    window.localStorage.setItem(RESULT_STORAGE_KEY, JSON.stringify(next))
    setResult(next)
  }, [])
  return { result, load, save }
}
