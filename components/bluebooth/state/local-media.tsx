'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

export interface LocalImageResource {
  blob: Blob
  url: string
  width: number
  height: number
}

interface LocalMediaContextValue {
  captures: Array<LocalImageResource | null>
  customFrame: LocalImageResource | null
  finalResult: LocalImageResource | null
  setCapture: (index: number, blob: Blob, width: number, height: number) => void
  clearCaptures: () => void
  setCustomFrame: (blob: Blob, width: number, height: number) => void
  clearCustomFrame: () => void
  setFinalResult: (blob: Blob, width: number, height: number) => void
  clearFinalResult: () => void
  clearAll: () => void
}

const LocalMediaContext = createContext<LocalMediaContextValue | null>(null)

function createResource(blob: Blob, width: number, height: number): LocalImageResource {
  return { blob, url: URL.createObjectURL(blob), width, height }
}

function revoke(resource: LocalImageResource | null | undefined) {
  if (resource) URL.revokeObjectURL(resource.url)
}

export function LocalMediaProvider({ children }: { children: ReactNode }) {
  const [captures, setCaptures] = useState<Array<LocalImageResource | null>>([])
  const [customFrame, setCustomFrameState] = useState<LocalImageResource | null>(null)
  const [finalResult, setFinalResultState] = useState<LocalImageResource | null>(null)
  const capturesRef = useRef(captures)
  const customFrameRef = useRef(customFrame)
  const finalResultRef = useRef(finalResult)

  useEffect(() => {
    capturesRef.current = captures
    customFrameRef.current = customFrame
    finalResultRef.current = finalResult
  }, [captures, customFrame, finalResult])

  const setCapture = useCallback((index: number, blob: Blob, width: number, height: number) => {
    setCaptures((current) => {
      const next = [...current]
      revoke(next[index])
      next[index] = createResource(blob, width, height)
      return next
    })
  }, [])
  const clearCaptures = useCallback(() => {
    setCaptures((current) => {
      current.forEach(revoke)
      return []
    })
  }, [])
  const setCustomFrame = useCallback((blob: Blob, width: number, height: number) => {
    setCustomFrameState((current) => {
      revoke(current)
      return createResource(blob, width, height)
    })
  }, [])
  const clearCustomFrame = useCallback(() => {
    setCustomFrameState((current) => {
      revoke(current)
      return null
    })
  }, [])
  const setFinalResult = useCallback((blob: Blob, width: number, height: number) => {
    setFinalResultState((current) => {
      revoke(current)
      return createResource(blob, width, height)
    })
  }, [])
  const clearFinalResult = useCallback(() => {
    setFinalResultState((current) => {
      revoke(current)
      return null
    })
  }, [])
  const clearAll = useCallback(() => {
    clearCaptures()
    clearCustomFrame()
    clearFinalResult()
  }, [clearCaptures, clearCustomFrame, clearFinalResult])

  useEffect(() => () => {
    capturesRef.current.forEach(revoke)
    revoke(customFrameRef.current)
    revoke(finalResultRef.current)
  }, [])

  const value = useMemo(
    () => ({
      captures,
      customFrame,
      finalResult,
      setCapture,
      clearCaptures,
      setCustomFrame,
      clearCustomFrame,
      setFinalResult,
      clearFinalResult,
      clearAll,
    }),
    [
      captures,
      clearAll,
      clearCaptures,
      clearCustomFrame,
      clearFinalResult,
      customFrame,
      finalResult,
      setCapture,
      setCustomFrame,
      setFinalResult,
    ],
  )
  return <LocalMediaContext.Provider value={value}>{children}</LocalMediaContext.Provider>
}

export function useLocalMedia() {
  const value = useContext(LocalMediaContext)
  if (!value) throw new Error('useLocalMedia must be used inside LocalMediaProvider')
  return value
}
