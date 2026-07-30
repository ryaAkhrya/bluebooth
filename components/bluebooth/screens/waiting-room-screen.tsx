'use client'

import { ArrowRight, Check, Copy, UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CameraVideo } from '@/components/bluebooth/camera/camera-video'
import { ConnectionStatus } from '@/components/bluebooth/camera/connection-status'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useRoom } from '@/components/bluebooth/state/room-state'
import { useToast } from '@/components/bluebooth/ui/toast-provider'
import type { CameraStatus } from '@/types/bluebooth'
import type { WebRtcConnectionState } from '@/types/webrtc'

export function WaitingRoomScreen({
  stream,
  cameraStatus,
  remoteStream,
  peerConnectionState,
  onRetryPeer,
  onStartCamera,
}: {
  stream: MediaStream | null
  cameraStatus: CameraStatus
  remoteStream: MediaStream | null
  peerConnectionState: WebRtcConnectionState
  onRetryPeer: () => void
  onStartCamera: () => Promise<void>
}) {
  const { state, dispatch } = useBluebooth()
  const room = useRoom()
  const setPresence = room.setPresence
  const toast = useToast()
  const [entering, setEntering] = useState(false)
  const localPartner = state.participants.find((participant) => !participant.isSelf)
  const onlinePartner = room.onlineRoom?.members.find(
    (member) => member.user_id !== room.onlineRoom?.membership.user_id,
  )
  const partner = room.mode === 'online' ? onlinePartner : localPartner
  const partnerOnline =
    room.mode === 'online'
      ? Boolean(
          onlinePartner &&
            room.presence.some((entry) => entry.userId === onlinePartner.user_id),
        )
      : Boolean(localPartner)
  const selfName =
    room.mode === 'online'
      ? room.onlineRoom?.membership.display_name ?? state.userName
      : state.userName
  const partnerName =
    room.mode === 'online' ? onlinePartner?.display_name : localPartner?.name

  useEffect(() => {
    setPresence({
      stage: 'waiting',
      cameraReady: cameraStatus === 'ready',
    })
  }, [cameraStatus, setPresence])

  const simulate = () => {
    dispatch({
      type: 'set-participants',
      participants: [
        ...state.participants.filter((participant) => participant.isSelf),
        { id: 'partner', name: 'Partner', connected: true, isSelf: false },
      ],
    })
    toast('Partner joined.', 'success')
  }
  const enterSetup = async () => {
    setEntering(true)
    try {
      await room.enterSetup()
      dispatch({ type: 'navigate', screen: 'setup' })
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Setup could not be opened.', 'error')
    } finally {
      setEntering(false)
    }
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
          <div><strong>{selfName} <small>You</small></strong><span className={cameraStatus === 'ready' ? 'is-online' : ''}>{cameraStatus === 'ready' ? 'Camera ready' : 'Camera off'}</span></div>
          {cameraStatus !== 'ready' && <button className="bb-secondary-button" onClick={() => void onStartCamera()}>Start camera</button>}
        </article>
        <article className="bb-participant-card">
          <div className="bb-participant-camera">
            {remoteStream ? (
              <CameraVideo stream={remoteStream} className="bb-remote-video" />
            ) : partnerOnline ? (
              <div className="bb-camera-placeholder"><UserRound /><span>Connecting partner camera</span></div>
            ) : (
              <div className="bb-camera-placeholder"><UserRound /><span>Waiting for partner</span></div>
            )}
          </div>
          <div><strong>{partnerName ?? 'Partner'}</strong><span className={partnerOnline ? 'is-online' : ''}>{partnerOnline ? 'Connected' : partner ? 'Offline' : 'Not joined'}</span></div>
        </article>
      </div>
      {room.mode === 'online' && (
        <ConnectionStatus state={peerConnectionState} onRetry={onRetryPeer} />
      )}
      {room.mode === 'local' && !partner ? (
        <button className="bb-secondary-button" onClick={simulate}>Simulate partner joining</button>
      ) : partnerOnline ? (
        <div className="bb-ready-note"><Check /> Both participants are here</div>
      ) : (
        <div className="bb-ready-note">
          {room.mode === 'online' && room.connection === 'reconnecting'
            ? 'Reconnecting to room…'
            : 'Waiting for your partner'}
        </div>
      )}
      <button className="bb-primary-button" disabled={!partnerOnline || entering || !room.canControlBooth} onClick={() => void enterSetup()}>
        {!room.canControlBooth
          ? 'Waiting for host'
          : entering
            ? 'Opening setup…'
            : 'Set up booth'}{' '}
        <ArrowRight />
      </button>
    </main>
  )
}
