'use client'

import { ArrowRight, Check, Copy, UserRound } from 'lucide-react'
import { CameraVideo } from '@/components/bluebooth/camera/camera-video'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useToast } from '@/components/bluebooth/ui/toast-provider'
import type { CameraStatus } from '@/types/bluebooth'

export function WaitingRoomScreen({
  stream,
  cameraStatus,
  onStartCamera,
}: {
  stream: MediaStream | null
  cameraStatus: CameraStatus
  onStartCamera: () => Promise<void>
}) {
  const { state, dispatch } = useBluebooth()
  const toast = useToast()
  const partner = state.participants.find((participant) => !participant.isSelf)
  const simulate = () => {
    dispatch({
      type: 'set-participants',
      participants: [
        ...state.participants.filter((participant) => participant.isSelf),
        { id: 'partner', name: 'Partner', connected: true, isSelf: false },
      ],
    })
    dispatch({ type: 'set-demo-partner', enabled: true })
    toast('Partner joined.', 'success')
  }
  return (
    <main className="bb-waiting bb-screen">
      <div className="bb-room-heading">
        <span className="bb-eyebrow">Waiting room</span>
        <h1>{state.roomName}</h1>
        <div className="bb-room-code-line">
          <span>Room code</span><strong>{state.roomCode}</strong>
          <button className="bb-icon-button" aria-label="Copy room code" onClick={() => void navigator.clipboard.writeText(state.roomCode).then(() => toast('Room code copied.', 'success'))}><Copy /></button>
        </div>
      </div>
      <div className="bb-participant-grid">
        <article className="bb-participant-card">
          <div className="bb-participant-camera">
            {stream ? <CameraVideo stream={stream} /> : <div className="bb-camera-placeholder"><UserRound /><span>Camera preview</span></div>}
          </div>
          <div><strong>{state.userName} <small>You</small></strong><span className={cameraStatus === 'ready' ? 'is-online' : ''}>{cameraStatus === 'ready' ? 'Camera ready' : 'Camera off'}</span></div>
          {cameraStatus !== 'ready' && <button className="bb-secondary-button" onClick={() => void onStartCamera()}>Start camera</button>}
        </article>
        <article className="bb-participant-card">
          <div className="bb-participant-camera">
            {partner ? <div className="bb-demo-feed"><span>Partner preview</span></div> : <div className="bb-camera-placeholder"><UserRound /><span>Waiting for partner</span></div>}
          </div>
          <div><strong>{partner?.name ?? 'Partner'}</strong><span className={partner ? 'is-online' : ''}>{partner ? 'Connected' : 'Not joined'}</span></div>
        </article>
      </div>
      {!partner ? (
        <button className="bb-secondary-button" onClick={simulate}>Simulate partner joining</button>
      ) : (
        <div className="bb-ready-note"><Check /> Both participants are here</div>
      )}
      <button className="bb-primary-button" disabled={!partner} onClick={() => dispatch({ type: 'navigate', screen: 'setup' })}>Set up booth <ArrowRight /></button>
    </main>
  )
}
