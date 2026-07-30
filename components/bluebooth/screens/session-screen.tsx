'use client'

import { Pause, Play, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { captureVideoFrame, cameraFilterCss, cameraTransform } from '@/lib/bluebooth/media'
import { getSlotIds } from '@/lib/bluebooth/geometry'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'

export function SessionScreen({ stream }: { stream: MediaStream | null }) {
  const { state, dispatch } = useBluebooth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const capturedCycle = useRef(false)
  const countRef = useRef<number>(state.timer)
  const betweenTimeoutRef = useRef<number | null>(null)
  const flashTimeoutRef = useRef<number | null>(null)
  const [shotIndex, setShotIndex] = useState(state.retakeIndex ?? 0)
  const [count, setCount] = useState<number>(state.timer)
  const [paused, setPaused] = useState(false)
  const [phase, setPhase] = useState<'countdown' | 'between'>('countdown')
  const [flash, setFlash] = useState(false)
  const grid = getGridPreset(state.selectedGrid)
  const total = getSlotIds(grid).length

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream
  }, [stream])

  useEffect(() => () => {
    if (betweenTimeoutRef.current) window.clearTimeout(betweenTimeoutRef.current)
    if (flashTimeoutRef.current) window.clearTimeout(flashTimeoutRef.current)
  }, [])

  const captureCurrent = useCallback(() => {
    if (capturedCycle.current) return
    capturedCycle.current = true
    const photo = captureVideoFrame(videoRef.current, state.cameraSettings)
    const photos = [...state.capturedPhotos]
    photos[shotIndex] = photo
    dispatch({ type: 'set-captures', photos })
    if (state.flash) {
      setFlash(true)
      flashTimeoutRef.current = window.setTimeout(() => setFlash(false), 180)
    }
    setPhase('between')
    betweenTimeoutRef.current = window.setTimeout(() => {
      if (state.retakeIndex !== null || shotIndex + 1 >= total) {
        dispatch({ type: 'set-retake', index: null })
        dispatch({ type: 'navigate', screen: 'review' })
      } else {
        setShotIndex((index) => index + 1)
        capturedCycle.current = false
        countRef.current = state.timer
        setCount(state.timer)
        setPhase('countdown')
      }
    }, state.shotDelay * 1000)
  }, [dispatch, shotIndex, state.cameraSettings, state.capturedPhotos, state.flash, state.retakeIndex, state.shotDelay, state.timer, total])

  useEffect(() => {
    if (paused || phase !== 'countdown') return
    const timerId = window.setInterval(() => {
      countRef.current = Math.max(0, countRef.current - 1)
      setCount(countRef.current)
      if (countRef.current === 0) {
        window.clearInterval(timerId)
        captureCurrent()
      }
    }, 1000)
    return () => window.clearInterval(timerId)
  }, [captureCurrent, paused, phase])

  const progressIndex = state.retakeIndex ?? shotIndex
  return (
    <main className="bb-session bb-screen">
      <div className="bb-session-stage">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            filter: cameraFilterCss(state.cameraSettings),
            transform: cameraTransform(state.cameraSettings),
            objectFit: state.cameraSettings.fit,
          }}
        />
        {!stream && <div className="bb-session-fallback">Camera unavailable · using Bluebooth fallback</div>}
        <div className="bb-countdown" aria-live="assertive">
          {phase === 'countdown' ? <strong>{paused ? 'Paused' : count || ''}</strong> : <strong>Captured</strong>}
          <span>Photo {progressIndex + 1} of {total}</span>
        </div>
        {flash && <div className="bb-flash" />}
      </div>
      <div className="bb-session-thumbs">
        {Array.from({ length: total }, (_, index) => (
          <div key={index} className={index === progressIndex ? 'is-current' : ''}>
            {state.capturedPhotos[index] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={state.capturedPhotos[index]} alt={`Photo ${index + 1}`} />
            ) : <span>{index + 1}</span>}
          </div>
        ))}
      </div>
      <div className="bb-session-actions">
        <button className="bb-secondary-button" onClick={() => setPaused((value) => !value)}>{paused ? <Play /> : <Pause />}{paused ? 'Resume' : 'Pause'}</button>
        <button className="bb-text-button" onClick={() => { dispatch({ type: 'set-retake', index: null }); dispatch({ type: 'navigate', screen: 'setup' }) }}><X /> Cancel session</button>
      </div>
    </main>
  )
}
