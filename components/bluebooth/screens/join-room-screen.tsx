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
  const [validationError, setValidationError] = useState('')
  const join = async (forceLocal = false) => {
    if (submitting) return
    const normalized = normalizeRoomCode(code)
    if (!isValidRoomCode(normalized)) {
      setValidationError('Enter a valid 6-character room code.')
      return
    }
    setValidationError('')
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
      <form
        className="bb-form-card"
        aria-labelledby="join-room-heading"
        onSubmit={(event) => {
          event.preventDefault()
          void join()
        }}
      >
        <span className="bb-eyebrow">Join a room</span>
        <h1 id="join-room-heading">Enter your room code</h1>
        <p>Ask your partner for the six-character code.</p>
        <label className="bb-field">Room code<input className="bb-code-input" value={code} maxLength={6} autoComplete="off" placeholder="BLU482" aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'join-code-error' : undefined} onChange={(event) => { setCode(event.target.value.toUpperCase()); if (validationError) setValidationError('') }} /></label>
        {validationError && <p className="bb-field-error" id="join-code-error">{validationError}</p>}
        <label className="bb-field">Your name<input value={name} maxLength={20} placeholder="You" onChange={(event) => setName(event.target.value)} /></label>
        <button type="submit" className="bb-primary-button bb-full-button" disabled={submitting}>
          {submitting ? 'Joining room…' : 'Join room'} <ArrowRight />
        </button>
        {onlineFailed && (
          <button type="button" className="bb-secondary-button bb-full-button" disabled={submitting} onClick={() => void join(true)}>
            Continue with local room
          </button>
        )}
      </form>
    </main>
  )
}
