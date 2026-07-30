'use client'

import { AppHeader } from '@/components/bluebooth/app-header'
import { BlueboothProvider, useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { LocalMediaProvider, useLocalMedia } from '@/components/bluebooth/state/local-media'
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
import './bluebooth.css'

export function BlueboothApp({ initialJoinCode }: { initialJoinCode?: string }) {
  return (
    <SupabaseAuthProvider>
      <BlueboothProvider initialJoinCode={initialJoinCode}>
        <LocalMediaProvider>
          <ToastProvider>
            <BlueboothAppContent />
          </ToastProvider>
        </LocalMediaProvider>
      </BlueboothProvider>
    </SupabaseAuthProvider>
  )
}

function BlueboothAppContent() {
  const { state, dispatch } = useBluebooth()
  const camera = useCamera()
  const media = useLocalMedia()
  const toast = useToast()
  const leave = () => {
    camera.stop()
    media.clearAll()
    dispatch({ type: 'reset-room' })
    toast('You left the room.')
  }

  return (
    <div className="bluebooth-root">
      <AppHeader
        onLeave={leave}
        onCamera={() => {
          dispatch({ type: 'set-setup-step', step: 'camera' })
          dispatch({ type: 'navigate', screen: 'setup' })
        }}
      />
      <SupabaseAuthNotice />
      {state.screen === 'home' && <HomeScreen />}
      {state.screen === 'create' && <CreateRoomScreen onStartCamera={() => camera.request()} />}
      {state.screen === 'join' && <JoinRoomScreen onStartCamera={() => camera.request()} />}
      {state.screen === 'waiting' && <WaitingRoomScreen stream={camera.stream} cameraStatus={camera.status} onStartCamera={() => camera.request()} />}
      {state.screen === 'setup' && <SetupScreen stream={camera.stream} cameraStatus={camera.status} devices={camera.devices} deviceId={camera.deviceId} onRequestCamera={camera.request} />}
      {state.screen === 'session' && <SessionScreen stream={camera.stream} />}
      {state.screen === 'review' && <ReviewScreen stream={camera.stream} />}
      {state.screen === 'final' && <FinalScreen />}
    </div>
  )
}
