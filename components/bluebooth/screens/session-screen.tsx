'use client'

import { Pause, Play, RefreshCw, X } from 'lucide-react'
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
import type { SynchronizedCaptureController } from '@/hooks/use-synchronized-capture'
import { useRoom } from '@/components/bluebooth/state/room-state'

export function SessionScreen({
  stream,
  synchronizedCapture,
}: {
  stream: MediaStream | null
  synchronizedCapture: SynchronizedCaptureController
}) {
  return synchronizedCapture.enabled ? (
    <SynchronizedSessionScreen
      stream={stream}
      synchronizedCapture={synchronizedCapture}
    />
  ) : (
    <LocalSessionScreen stream={stream} />
  )
}

function SynchronizedSessionScreen({
  stream,
  synchronizedCapture,
}: {
  stream: MediaStream | null
  synchronizedCapture: SynchronizedCaptureController
}) {
  const { state } = useBluebooth()
  const videoRef = useRef<HTMLVideoElement>(null)
  const room = useRoom()
  const session = synchronizedCapture.snapshot?.session ?? null
  const captureAt = session?.capture_at ?? null
  const cameraSettings =
    synchronizedCapture.configuration?.cameraSettings ?? state.cameraSettings

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  useEffect(() => {
    if (
      !session ||
      !captureAt ||
      synchronizedCapture.countdown !== 0 ||
      !['countdown', 'retake-countdown'].includes(session.status)
    ) {
      return
    }
    void synchronizedCapture.captureLocalFrame(videoRef.current)
  }, [
    captureAt,
    session,
    synchronizedCapture,
    synchronizedCapture.countdown,
  ])

  const total = session?.shot_count ?? 0
  const shotIndex = session?.current_shot_index ?? 0
  const waitingForReady = session?.status === 'waiting-for-ready'
  const currentRole = room.onlineRoom?.membership.role ?? 'host'
  const readinessLabel = room.onlineRoom?.members
    .filter((member) => member.left_at === null)
    .map(
      (member) =>
        `${member.display_name}: ${
          synchronizedCapture.readiness[member.user_id] ? 'ready' : 'not ready'
        }`,
    )
    .join(' · ')

  return (
    <main className="bb-session bb-screen">
      <div className="bb-session-stage">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            filter: cameraFilterCss(cameraSettings),
            transform: cameraTransform(cameraSettings),
            objectFit: cameraSettings.fit,
          }}
        />
        {!stream && (
          <div className="bb-session-fallback">
            Your local camera is unavailable
          </div>
        )}
        <div className="bb-countdown" aria-hidden="true">
          <strong>
            {waitingForReady
              ? synchronizedCapture.bothReady
                ? 'Ready'
                : 'Waiting'
              : synchronizedCapture.countdown && synchronizedCapture.countdown > 0
                ? synchronizedCapture.countdown
                : synchronizedCapture.state.operation === 'uploading'
                  ? 'Uploading'
                  : synchronizedCapture.state.operation === 'waiting'
                    ? 'Captured'
                    : ''}
          </strong>
          <span>
            Photo {shotIndex + 1} of {total}
          </span>
        </div>
        <p className="bb-sr-only" aria-live="polite" aria-atomic="true">
          {waitingForReady
            ? synchronizedCapture.bothReady
              ? 'Both cameras ready.'
              : 'Waiting for both cameras.'
            : synchronizedCapture.countdown &&
                synchronizedCapture.countdown > 0
              ? `Photo ${shotIndex + 1} in ${synchronizedCapture.countdown} seconds.`
              : synchronizedCapture.state.operation === 'uploading'
                ? `Uploading photo ${shotIndex + 1}.`
                : ''}
        </p>
      </div>

      <div className="bb-capture-readiness" role="status">
        <strong>
          {synchronizedCapture.canStartCapture
            ? 'Both cameras are ready'
            : synchronizedCapture.bothReady
              ? 'Waiting for participant connection'
            : 'Waiting for both cameras'}
        </strong>
        <span>{readinessLabel || 'Checking participant readiness…'}</span>
        {synchronizedCapture.state.error && (
          <span className="is-error">{synchronizedCapture.state.error}</span>
        )}
      </div>

      <div className="bb-session-thumbs">
        {Array.from({ length: total }, (_, index) => {
          const sources = synchronizedCapture.sharedCaptureUrls[index]
          const thumbnail =
            sources?.[currentRole] ?? sources?.host ?? sources?.partner
          return (
            <div
              key={index}
              className={index === shotIndex ? 'is-current' : ''}
              aria-current={index === shotIndex ? 'step' : undefined}
            >
              {thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={thumbnail} alt={`Photo ${index + 1}`} />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="bb-session-actions">
        {waitingForReady && synchronizedCapture.isHost && (
          <button
            className="bb-primary-button"
            disabled={!synchronizedCapture.canStartCapture}
            onClick={() => void synchronizedCapture.startCountdown()}
          >
            {synchronizedCapture.canStartCapture
              ? 'Start synchronized capture'
              : synchronizedCapture.bothReady
                ? 'Partner reconnecting'
                : 'Partner not ready'}
          </button>
        )}
        {waitingForReady && (
          <button
            className="bb-secondary-button"
            onClick={synchronizedCapture.acknowledgeReady}
          >
            <RefreshCw /> Retry readiness
          </button>
        )}
        {synchronizedCapture.state.operation === 'error' &&
          !waitingForReady && (
            <button
              className="bb-secondary-button"
              onClick={() =>
                void synchronizedCapture.captureLocalFrame(videoRef.current)
              }
            >
              <RefreshCw /> Retry capture
            </button>
          )}
        {synchronizedCapture.isHost && (
          <button
            className="bb-text-button"
            onClick={() => void synchronizedCapture.cancel()}
          >
            <X /> Cancel session
          </button>
        )}
      </div>
    </main>
  )
}

function LocalSessionScreen({ stream }: { stream: MediaStream | null }) {
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
        <div className="bb-countdown" aria-hidden="true">
          {captured ? (
            <strong>Captured</strong>
          ) : (
            <strong>{paused ? 'Paused' : session.countdown || ''}</strong>
          )}
          <span>Photo {session.shotIndex + 1} of {total}</span>
        </div>
        <p className="bb-sr-only" aria-live="polite" aria-atomic="true">
          {captured
            ? `Photo ${session.shotIndex + 1} captured.`
            : paused
              ? `Capture paused on photo ${session.shotIndex + 1}.`
              : session.countdown > 0
                ? `Photo ${session.shotIndex + 1} in ${session.countdown} seconds.`
                : ''}
        </p>
        {flash && <div className="bb-flash" />}
      </div>
      <div className="bb-session-thumbs">
        {Array.from({ length: total }, (_, index) => (
          <div
            key={index}
            className={index === session.shotIndex ? 'is-current' : ''}
            aria-current={index === session.shotIndex ? 'step' : undefined}
          >
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
