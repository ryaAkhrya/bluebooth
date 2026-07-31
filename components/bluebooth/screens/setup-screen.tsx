'use client'

import { ArrowRight, Camera, Grid2X2, Image, RotateCcw, Timer } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent } from 'react'
import { CameraControls } from '@/components/bluebooth/editor/camera-controls'
import { CaptureModeControls } from '@/components/bluebooth/editor/capture-mode-controls'
import { ConnectionStatus } from '@/components/bluebooth/camera/connection-status'
import { CompositionPreview } from '@/components/bluebooth/editor/composition-preview'
import { FrameSelector } from '@/components/bluebooth/editor/frame-selector'
import { GridSelector } from '@/components/bluebooth/editor/grid-selector'
import { LayoutControls } from '@/components/bluebooth/editor/layout-controls'
import { TimerControls } from '@/components/bluebooth/editor/timer-controls'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useLocalMedia } from '@/components/bluebooth/state/local-media'
import { useRoom } from '@/components/bluebooth/state/room-state'
import type { CameraStatus, SetupStep } from '@/types/bluebooth'
import type { WebRtcConnectionState } from '@/types/webrtc'
import type { SynchronizedCaptureController } from '@/hooks/use-synchronized-capture'

const steps: Array<{ id: SetupStep; label: string; icon: typeof Grid2X2 }> = [
  { id: 'layout', label: 'Layout', icon: Grid2X2 },
  { id: 'frame', label: 'Frame', icon: Image },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'timer', label: 'Capture', icon: Timer },
]

export function SetupScreen({
  stream,
  cameraStatus,
  devices,
  deviceId,
  remoteStream,
  peerConnectionState,
  onRetryPeer,
  synchronizedCapture,
  onRequestCamera,
}: {
  stream: MediaStream | null
  cameraStatus: CameraStatus
  devices: MediaDeviceInfo[]
  deviceId: string
  remoteStream: MediaStream | null
  peerConnectionState: WebRtcConnectionState
  onRetryPeer: () => void
  synchronizedCapture: SynchronizedCaptureController
  onRequestCamera: (deviceId?: string) => Promise<void>
}) {
  const { state, dispatch } = useBluebooth()
  const media = useLocalMedia()
  const room = useRoom()
  const tabListRef = useRef<HTMLDivElement>(null)
  const setPresence = room.setPresence
  const connectedCount =
    room.mode === 'online' ? room.presence.length : state.participants.length

  useEffect(() => {
    setPresence({
      stage: 'setup',
      cameraReady: cameraStatus === 'ready',
    })
  }, [cameraStatus, setPresence])

  const moveSetupTab = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % steps.length
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + steps.length) % steps.length
    } else if (event.key === 'Home') {
      nextIndex = 0
    } else if (event.key === 'End') {
      nextIndex = steps.length - 1
    }
    if (nextIndex === null) return
    event.preventDefault()
    dispatch({ type: 'set-setup-step', step: steps[nextIndex].id })
    tabListRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [nextIndex]?.focus()
  }

  return (
    <main className="bb-setup bb-screen">
      <div className="bb-setup-heading"><div><span className="bb-eyebrow">Booth setup</span><h1>Make it yours</h1></div><span className="bb-room-pill">{state.roomCode}</span></div>
      <div ref={tabListRef} className="bb-steps" role="tablist" aria-label="Setup steps">
        {steps.map(({ id, label, icon: Icon }, index) => (
          <button
            key={id}
            id={`setup-tab-${id}`}
            role="tab"
            aria-controls="setup-panel"
            aria-selected={state.setupStep === id}
            tabIndex={state.setupStep === id ? 0 : -1}
            className={state.setupStep === id ? 'is-active' : ''}
            onKeyDown={(event) => moveSetupTab(event, index)}
            onClick={() => dispatch({ type: 'set-setup-step', step: id })}
          >
            <Icon />
            <span>{index + 1}. {label}</span>
          </button>
        ))}
      </div>
      <div className="bb-setup-layout">
        <aside className="bb-preview-panel">
          <div className="bb-preview-toolbar">
            <strong>Live preview</strong>
            {room.mode === 'online' && (
              <ConnectionStatus
                state={peerConnectionState}
                onRetry={onRetryPeer}
                compact
              />
            )}
            <div className="bb-segmented" role="group" aria-label="Camera source mode">
              {(['user', 'partner', 'split', 'alternate'] as const).map((mode) => <button disabled={!room.canControlBooth} key={mode} aria-pressed={state.cameraMode === mode} className={state.cameraMode === mode ? 'is-active' : ''} onClick={() => room.updateSharedSettings({ cameraMode: mode })}>{mode === 'user' ? 'You' : mode[0].toUpperCase() + mode.slice(1)}</button>)}
            </div>
            <button disabled={!room.canControlBooth} className="bb-icon-button" aria-label="Swap camera positions" aria-pressed={state.swap} onClick={() => room.updateSharedSettings({ swap: !state.swap })}><RotateCcw /></button>
          </div>
          <CompositionPreview stream={stream} remoteStream={remoteStream} />
        </aside>
        <section
          id="setup-panel"
          className="bb-editor-panel"
          role="tabpanel"
          aria-labelledby={`setup-tab-${state.setupStep}`}
        >
          {!room.canControlBooth && (
            <div className="bb-ready-note">The host controls the booth setup.</div>
          )}
          {state.setupStep === 'layout' && <><header><h2>Choose a template</h2><p>Start with a format. You will fill its slots in the studio.</p></header><GridSelector /><div className="bb-control-card"><LayoutControls /></div></>}
          {state.setupStep === 'frame' && <><header><h2>Style the frame</h2><p>Choose the finish that holds your memories together.</p></header><FrameSelector /></>}
          {state.setupStep === 'camera' && <><header><h2>Camera settings</h2><p>Adjust your local camera preview.</p></header><CameraControls status={cameraStatus} devices={devices} deviceId={deviceId} onRequest={onRequestCamera} /></>}
          {state.setupStep === 'timer' && <><header><h2>Plan the roll</h2><p>Choose your creative freedom, countdown, and pace.</p></header><CaptureModeControls /><TimerControls /></>}
        </section>
      </div>
      <div className="bb-bottom-bar">
        <span>
          {connectedCount}/2 connected
          {room.mode === 'online' && !room.canControlBooth && ' · Following host setup'}
          {room.mode === 'online' && room.settingsStatus === 'saving' && ' · Saving setup…'}
          {room.mode === 'online' && room.settingsStatus === 'saved' && ' · Setup saved'}
          {room.mode === 'online' && room.settingsStatus === 'error' && (
            <> · Setup not saved <button className="bb-text-button" onClick={room.retrySettings}>Retry</button></>
          )}
        </span>
        <button
          className="bb-primary-button"
          disabled={
            synchronizedCapture.enabled &&
            (!synchronizedCapture.isHost ||
              synchronizedCapture.state.operation === 'preparing')
          }
          onClick={() => {
            if (synchronizedCapture.enabled) {
              if (synchronizedCapture.isHost) {
                void synchronizedCapture.startSession()
              }
              return
            }
            media.clearCaptures()
            media.clearFinalResult()
            dispatch({ type: 'reset-session' })
            dispatch({ type: 'navigate', screen: 'session' })
          }}
        >
          {synchronizedCapture.enabled && !synchronizedCapture.isHost
            ? 'Waiting for host'
            : synchronizedCapture.enabled &&
                synchronizedCapture.state.operation === 'preparing'
              ? 'Preparing session…'
              : 'Start session'}{' '}
          <ArrowRight />
        </button>
      </div>
    </main>
  )
}
