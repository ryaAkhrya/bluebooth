'use client'

import { ArrowRight, Camera, Grid2X2, Image, RotateCcw, Timer } from 'lucide-react'
import { CameraControls } from '@/components/bluebooth/editor/camera-controls'
import { CompositionPreview } from '@/components/bluebooth/editor/composition-preview'
import { FrameSelector } from '@/components/bluebooth/editor/frame-selector'
import { GridSelector } from '@/components/bluebooth/editor/grid-selector'
import { LayoutControls } from '@/components/bluebooth/editor/layout-controls'
import { TimerControls } from '@/components/bluebooth/editor/timer-controls'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useLocalMedia } from '@/components/bluebooth/state/local-media'
import type { CameraStatus, SetupStep } from '@/types/bluebooth'

const steps: Array<{ id: SetupStep; label: string; icon: typeof Grid2X2 }> = [
  { id: 'layout', label: 'Layout', icon: Grid2X2 },
  { id: 'frame', label: 'Frame', icon: Image },
  { id: 'camera', label: 'Camera', icon: Camera },
  { id: 'timer', label: 'Timer', icon: Timer },
]

export function SetupScreen({
  stream,
  cameraStatus,
  devices,
  deviceId,
  onRequestCamera,
}: {
  stream: MediaStream | null
  cameraStatus: CameraStatus
  devices: MediaDeviceInfo[]
  deviceId: string
  onRequestCamera: (deviceId?: string) => Promise<void>
}) {
  const { state, dispatch } = useBluebooth()
  const media = useLocalMedia()
  return (
    <main className="bb-setup bb-screen">
      <div className="bb-setup-heading"><div><span className="bb-eyebrow">Booth setup</span><h1>Make it yours</h1></div><span className="bb-room-pill">{state.roomCode}</span></div>
      <div className="bb-steps" role="tablist" aria-label="Setup steps">
        {steps.map(({ id, label, icon: Icon }, index) => (
          <button key={id} role="tab" aria-selected={state.setupStep === id} className={state.setupStep === id ? 'is-active' : ''} onClick={() => dispatch({ type: 'set-setup-step', step: id })}><Icon /><span>{index + 1}. {label}</span></button>
        ))}
      </div>
      <div className="bb-setup-layout">
        <aside className="bb-preview-panel">
          <div className="bb-preview-toolbar">
            <strong>Live preview</strong>
            <div className="bb-segmented" aria-label="Camera source mode">
              {(['user', 'partner', 'split', 'alternate'] as const).map((mode) => <button key={mode} className={state.cameraMode === mode ? 'is-active' : ''} onClick={() => dispatch({ type: 'set-camera-mode', mode })}>{mode === 'user' ? 'You' : mode[0].toUpperCase() + mode.slice(1)}</button>)}
            </div>
            <button className="bb-icon-button" aria-label="Swap camera positions" onClick={() => dispatch({ type: 'toggle-swap' })}><RotateCcw /></button>
          </div>
          <CompositionPreview stream={stream} />
        </aside>
        <section className="bb-editor-panel">
          {state.setupStep === 'layout' && <><header><h2>Choose a grid</h2><p>Pick a format, then adjust its spacing.</p></header><GridSelector /><div className="bb-control-card"><LayoutControls /></div></>}
          {state.setupStep === 'frame' && <><header><h2>Choose a frame</h2><p>Use a built-in style or upload your own.</p></header><FrameSelector /></>}
          {state.setupStep === 'camera' && <><header><h2>Camera settings</h2><p>Adjust your local camera preview.</p></header><CameraControls status={cameraStatus} devices={devices} deviceId={deviceId} onRequest={onRequestCamera} /></>}
          {state.setupStep === 'timer' && <><header><h2>Session timing</h2><p>Choose a countdown and pace.</p></header><TimerControls /></>}
        </section>
      </div>
      <div className="bb-bottom-bar"><span>{state.participants.length}/2 connected</span><button className="bb-primary-button" onClick={() => { media.clearCaptures(); media.clearFinalResult(); dispatch({ type: 'reset-session' }); dispatch({ type: 'navigate', screen: 'session' }) }}>Start session <ArrowRight /></button></div>
    </main>
  )
}
