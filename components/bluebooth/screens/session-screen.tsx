'use client'

import { Pause, Play, X } from 'lucide-react'
import { useEffect, useReducer, useRef, useState } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useLocalMedia } from '@/components/bluebooth/state/local-media'
import { useToast } from '@/components/bluebooth/ui/toast-provider'
import { captureVideoFrame, cameraFilterCss, cameraTransform } from '@/lib/bluebooth/media'
import { getSlotIds } from '@/lib/bluebooth/geometry'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'
import {
  initialLocalSessionState,
  localSessionReducer,
} from '@/lib/bluebooth/session-machine'

export function SessionScreen({ stream }: { stream: MediaStream | null }) {
  const { state, dispatch } = useBluebooth()
  const { captures, setCapture } = useLocalMedia()
  const toast = useToast()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [session, dispatchSession] = useReducer(localSessionReducer, initialLocalSessionState)
  const [flash, setFlash] = useState(false)
  const grid = getGridPreset(state.selectedGrid)
  const total = getSlotIds(grid).length

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  useEffect(() => {
    dispatchSession({
      type: 'start',
      total,
      countdown: state.timer,
      retakeIndex: state.retakeIndex,
    })
  }, [state.retakeIndex, state.timer, total])

  useEffect(() => {
    if (session.phase !== 'countdown') return
    if (session.countdown === 0) {
      dispatchSession({ type: 'capture' })
      return
    }
    const timerId = window.setTimeout(() => dispatchSession({ type: 'tick' }), 1000)
    return () => window.clearTimeout(timerId)
  }, [session.countdown, session.phase])

  useEffect(() => {
    if (session.phase !== 'capturing') return
    let active = true
    void captureVideoFrame(videoRef.current, state.cameraSettings)
      .then((capture) => {
        if (!active) return
        setCapture(session.shotIndex, capture.blob, capture.width, capture.height)
        if (state.flash) {
          setFlash(true)
        }
        dispatchSession({ type: 'captured' })
      })
      .catch(() => {
        if (!active) return
        toast('Photo could not be captured. Try again.', 'error')
        dispatchSession({ type: 'cancel' })
      })
    return () => {
      active = false
    }
  }, [
    session.phase,
    session.shotIndex,
    setCapture,
    state.cameraSettings,
    state.flash,
    toast,
  ])

  useEffect(() => {
    if (!flash) return
    const timerId = window.setTimeout(() => setFlash(false), 180)
    return () => window.clearTimeout(timerId)
  }, [flash])

  useEffect(() => {
    if (session.phase !== 'betweenShots') return
    const timerId = window.setTimeout(
      () => dispatchSession({ type: 'advance' }),
      state.shotDelay * 1000,
    )
    return () => window.clearTimeout(timerId)
  }, [session.phase, state.shotDelay])

  useEffect(() => {
    if (session.phase === 'completed') {
      dispatch({ type: 'set-retake', index: null })
      dispatch({ type: 'navigate', screen: 'review' })
    }
    if (session.phase === 'cancelled') {
      dispatch({ type: 'set-retake', index: null })
      dispatch({ type: 'navigate', screen: 'setup' })
    }
  }, [dispatch, session.phase])

  const paused = session.phase === 'paused'
  const captured = session.phase === 'betweenShots'
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
          {captured ? (
            <strong>Captured</strong>
          ) : (
            <strong>{paused ? 'Paused' : session.countdown || ''}</strong>
          )}
          <span>Photo {session.shotIndex + 1} of {total}</span>
        </div>
        {flash && <div className="bb-flash" />}
      </div>
      <div className="bb-session-thumbs">
        {Array.from({ length: total }, (_, index) => (
          <div key={index} className={index === session.shotIndex ? 'is-current' : ''}>
            {captures[index] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={captures[index]?.url} alt={`Photo ${index + 1}`} />
            ) : <span>{index + 1}</span>}
          </div>
        ))}
      </div>
      <div className="bb-session-actions">
        <button
          className="bb-secondary-button"
          disabled={!['countdown', 'betweenShots', 'paused'].includes(session.phase)}
          onClick={() => dispatchSession({ type: paused ? 'resume' : 'pause' })}
        >
          {paused ? <Play /> : <Pause />}{paused ? 'Resume' : 'Pause'}
        </button>
        <button className="bb-text-button" onClick={() => dispatchSession({ type: 'cancel' })}>
          <X /> Cancel session
        </button>
      </div>
    </main>
  )
}
