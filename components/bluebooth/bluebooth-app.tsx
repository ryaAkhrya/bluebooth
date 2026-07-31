'use client'

import { useEffect } from 'react'
import { AppHeader } from '@/components/bluebooth/app-header'
import { BlueboothProvider, useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { LocalMediaProvider, useLocalMedia } from '@/components/bluebooth/state/local-media'
import { RoomProvider, useRoom } from '@/components/bluebooth/state/room-state'
import {
  SupabaseAuthNotice,
  SupabaseAuthProvider,
} from '@/components/bluebooth/state/supabase-auth'
import { ToastProvider, useToast } from '@/components/bluebooth/ui/toast-provider'
import { CreateRoomScreen } from '@/components/bluebooth/screens/create-room-screen'
import { FinalScreen } from '@/components/bluebooth/screens/final-screen'
import { HomeScreen } from '@/components/bluebooth/screens/home-screen'
import { JoinRoomScreen } from '@/components/bluebooth/screens/join-room-screen'
import { ReviewScreen } from '@/components/bluebooth/screens/review-screen'
import { SessionScreen } from '@/components/bluebooth/screens/session-screen'
import { SetupScreen } from '@/components/bluebooth/screens/setup-screen'
import { WaitingRoomScreen } from '@/components/bluebooth/screens/waiting-room-screen'
import { useCamera } from '@/hooks/use-camera'
import { useWebRtcPeer } from '@/hooks/use-webrtc-peer'
import { useSynchronizedCapture } from '@/hooks/use-synchronized-capture'
import './bluebooth.css'

export function BlueboothApp({ initialJoinCode }: { initialJoinCode?: string }) {
  return (
    <SupabaseAuthProvider>
      <BlueboothProvider initialJoinCode={initialJoinCode}>
        <RoomProvider initialJoinCode={initialJoinCode}>
          <LocalMediaProvider>
            <ToastProvider>
              <BlueboothAppContent />
            </ToastProvider>
          </LocalMediaProvider>
        </RoomProvider>
      </BlueboothProvider>
    </SupabaseAuthProvider>
  )
}

function BlueboothAppContent() {
  const { state, dispatch } = useBluebooth()
  const camera = useCamera()
  const media = useLocalMedia()
  const room = useRoom()
  const toast = useToast()
  const currentMember = room.onlineRoom?.membership ?? null
  const peerMember =
    room.onlineRoom?.members.find(
      (member) => member.user_id !== currentMember?.user_id,
    ) ?? null
  const peer = useWebRtcPeer({
    enabled: room.mode === 'online',
    localStream: camera.stream,
    roomId: room.onlineRoom?.room.id ?? null,
    currentUserId: currentMember?.user_id ?? null,
    peerUserId: peerMember?.user_id ?? null,
    role: currentMember?.role ?? null,
    roomConnection: room.connection,
    sendSignal: room.sendWebRtcSignal,
    subscribeSignals: room.subscribeWebRtcSignals,
  })
  const synchronizedCapture = useSynchronizedCapture({
    cameraStatus: camera.status,
    localStream: camera.stream,
  })

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const heading = document.querySelector<HTMLElement>('.bb-screen h1')
      if (!heading) return
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [state.screen])
  const leave = async () => {
    peer.close()
    camera.stop()
    media.clearAll()
    await room.leaveRoom()
    window.history.replaceState(null, '', '/')
    toast('You left the room.')
  }

  return (
    <div className="bluebooth-root">
      <AppHeader
        onLeave={() => void leave()}
        onCamera={() => {
          if (
            synchronizedCapture.enabled &&
            synchronizedCapture.snapshot &&
            !['review', 'completed', 'cancelled'].includes(
              synchronizedCapture.snapshot.session.status,
            )
          ) {
            toast('Finish or cancel the synchronized capture before changing cameras.')
            return
          }
          dispatch({ type: 'set-setup-step', step: 'camera' })
          dispatch({ type: 'navigate', screen: 'setup' })
        }}
      />
      <SupabaseAuthNotice />
      {state.screen === 'home' && <HomeScreen />}
      {state.screen === 'create' && <CreateRoomScreen onStartCamera={() => camera.request()} />}
      {state.screen === 'join' && <JoinRoomScreen onStartCamera={() => camera.request()} />}
      {state.screen === 'waiting' && <WaitingRoomScreen stream={camera.stream} cameraStatus={camera.status} remoteStream={peer.remoteStream} peerConnectionState={peer.connectionState} onRetryPeer={peer.retry} onStartCamera={() => camera.request()} />}
      {state.screen === 'setup' && <SetupScreen stream={camera.stream} cameraStatus={camera.status} devices={camera.devices} deviceId={camera.deviceId} remoteStream={peer.remoteStream} peerConnectionState={peer.connectionState} onRetryPeer={peer.retry} onRequestCamera={camera.request} synchronizedCapture={synchronizedCapture} />}
      {state.screen === 'session' && <SessionScreen stream={camera.stream} synchronizedCapture={synchronizedCapture} />}
      {state.screen === 'review' && <ReviewScreen stream={camera.stream} synchronizedCapture={synchronizedCapture} />}
      {state.screen === 'final' && <FinalScreen synchronizedCapture={synchronizedCapture} />}
    </div>
  )
}
