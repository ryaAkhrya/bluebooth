'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useRoom } from '@/components/bluebooth/state/room-state'
import { useToast } from '@/components/bluebooth/ui/toast-provider'
import { RoomServiceError } from '@/lib/supabase/errors'
import { isValidRoomCode, normalizeRoomCode } from '@/lib/supabase/rooms'

export function JoinRoomScreen({ onStartCamera }: { onStartCamera: () => Promise<void> }) {
  const { state, dispatch } = useBluebooth()
  const room = useRoom()
  const toast = useToast()
  const [code, setCode] = useState(state.roomCode)
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [onlineFailed, setOnlineFailed] = useState(false)
  const join = async (forceLocal = false) => {
    const normalized = normalizeRoomCode(code)
    if (!isValidRoomCode(normalized)) {
      return toast('Enter a valid 6-character room code.', 'error')
    }
    setSubmitting(true)
    setOnlineFailed(false)
    try {
      const result = await room.joinRoom(
        { code: normalized, displayName: name },
        forceLocal,
      )
      window.history.replaceState(null, '', `/r/${result.code}`)
      dispatch({ type: 'navigate', screen: 'waiting' })
      void onStartCamera()
    } catch (error) {
      setOnlineFailed(
        room.onlineAvailable &&
          error instanceof RoomServiceError &&
          (error.kind === 'unavailable' || error.kind === 'authentication'),
      )
      toast(error instanceof Error ? error.message : 'The room could not be joined.', 'error')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <main className="bb-form-screen bb-screen">
      <button className="bb-back-button" onClick={() => dispatch({ type: 'navigate', screen: 'home' })}><ArrowLeft /> Back</button>
      <section className="bb-form-card">
        <span className="bb-eyebrow">Join a room</span>
        <h1>Enter your room code</h1>
        <p>Ask your partner for the six-character code.</p>
        <label className="bb-field">Room code<input className="bb-code-input" value={code} maxLength={6} autoComplete="off" placeholder="BLU482" onChange={(event) => setCode(event.target.value.toUpperCase())} /></label>
        <label className="bb-field">Your name<input value={name} maxLength={20} placeholder="You" onChange={(event) => setName(event.target.value)} /></label>
        <button className="bb-primary-button bb-full-button" disabled={submitting} onClick={() => void join()}>
          {submitting ? 'Joining room…' : 'Join room'} <ArrowRight />
        </button>
        {onlineFailed && (
          <button className="bb-secondary-button bb-full-button" disabled={submitting} onClick={() => void join(true)}>
            Continue with local room
          </button>
        )}
      </section>
    </main>
  )
}
