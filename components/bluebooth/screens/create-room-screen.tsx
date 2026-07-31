'use client'

import { ArrowLeft, ArrowRight, Copy } from 'lucide-react'
import { useState } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useRoom } from '@/components/bluebooth/state/room-state'
import { useToast } from '@/components/bluebooth/ui/toast-provider'
import { buildRoomShareUrl } from '@/lib/supabase/env'
import { RoomServiceError } from '@/lib/supabase/errors'

export function CreateRoomScreen({ onStartCamera }: { onStartCamera: () => Promise<void> }) {
  const { dispatch } = useBluebooth()
  const room = useRoom()
  const toast = useToast()
  const [roomName, setRoomName] = useState('')
  const [userName, setUserName] = useState('')
  const [startCamera, setStartCamera] = useState(true)
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [onlineFailed, setOnlineFailed] = useState(false)
  const [validationError, setValidationError] = useState('')
  const create = async (forceLocal = false) => {
    if (submitting) return
    if (!userName.trim()) {
      setValidationError('Enter your name.')
      return
    }
    setValidationError('')
    setSubmitting(true)
    setOnlineFailed(false)
    try {
      const result = await room.createRoom(
        { displayName: userName, roomName },
        forceLocal,
      )
      setCode(result.code)
      window.history.replaceState(null, '', `/r/${result.code}`)
      if (startCamera) void onStartCamera()
    } catch (error) {
      setOnlineFailed(
        room.onlineAvailable &&
          error instanceof RoomServiceError &&
          (error.kind === 'unavailable' || error.kind === 'authentication'),
      )
      toast(error instanceof Error ? error.message : 'The room could not be created.', 'error')
    } finally {
      setSubmitting(false)
    }
  }
  const shareUrl =
    typeof window === 'undefined' || !code
      ? ''
      : buildRoomShareUrl(code, window.location.origin)
  return (
    <main className="bb-form-screen bb-screen">
      <button className="bb-back-button" onClick={() => dispatch({ type: 'navigate', screen: 'home' })}><ArrowLeft /> Back</button>
      <section className="bb-form-card">
        {!code ? (
          <form
            className="bb-form-contents"
            aria-labelledby="create-room-heading"
            onSubmit={(event) => {
              event.preventDefault()
              void create()
            }}
          >
            <span className="bb-eyebrow">Create a room</span>
            <h1 id="create-room-heading">Start your photobooth</h1>
            <p>Your partner can join with the room code.</p>
            <label className="bb-field">Room name<input value={roomName} maxLength={24} placeholder="Sunday shoot" onChange={(event) => setRoomName(event.target.value)} /></label>
            <label className="bb-field">Your name<input value={userName} maxLength={20} placeholder="You" aria-invalid={Boolean(validationError)} aria-describedby={validationError ? 'create-name-error' : undefined} onChange={(event) => { setUserName(event.target.value); if (validationError) setValidationError('') }} /></label>
            {validationError && <p className="bb-field-error" id="create-name-error">{validationError}</p>}
            <label className="bb-switch-row"><span>Turn on camera right away</span><input type="checkbox" checked={startCamera} onChange={(event) => setStartCamera(event.target.checked)} /></label>
            <button type="submit" className="bb-primary-button bb-full-button" disabled={submitting}>
              {submitting ? 'Creating room…' : 'Create room'} <ArrowRight />
            </button>
            {onlineFailed && (
              <button type="button" className="bb-secondary-button bb-full-button" disabled={submitting} onClick={() => void create(true)}>
                Continue with local room
              </button>
            )}
          </form>
        ) : (
          <>
            <span className="bb-eyebrow">Room created</span>
            <h1>Invite your partner</h1>
            <p>Share this code or copy the room link.</p>
            <div className="bb-code-display"><strong>{code}</strong><button className="bb-icon-button" aria-label="Copy room code" onClick={() => void navigator.clipboard.writeText(code).then(() => toast('Room code copied.', 'success'))}><Copy /></button></div>
            <label className="bb-field">Share link<input readOnly value={shareUrl} /></label>
            <button className="bb-secondary-button bb-full-button" onClick={() => void navigator.clipboard.writeText(shareUrl).then(() => toast('Room link copied.', 'success'))}>Copy room link</button>
            <button className="bb-primary-button bb-full-button" onClick={() => dispatch({ type: 'navigate', screen: 'waiting' })}>Enter waiting room <ArrowRight /></button>
          </>
        )}
      </section>
    </main>
  )
}
