'use client'

import { ArrowLeft, ArrowRight, Copy } from 'lucide-react'
import { useState } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useToast } from '@/components/bluebooth/ui/toast-provider'

function randomCode() {
  const digits = Math.floor(100 + Math.random() * 900)
  return `BLU${digits}`
}

export function CreateRoomScreen({ onStartCamera }: { onStartCamera: () => Promise<void> }) {
  const { dispatch } = useBluebooth()
  const toast = useToast()
  const [roomName, setRoomName] = useState('')
  const [userName, setUserName] = useState('')
  const [startCamera, setStartCamera] = useState(true)
  const [code, setCode] = useState('')
  const create = () => {
    if (!userName.trim()) return toast('Enter your name.', 'error')
    const nextCode = randomCode()
    dispatch({
      type: 'set-room',
      code: nextCode,
      roomName: roomName.trim() || 'Bluebooth',
      userName: userName.trim(),
      participants: [{ id: 'self', name: userName.trim(), connected: true, isSelf: true }],
    })
    setCode(nextCode)
    if (startCamera) void onStartCamera()
  }
  const shareUrl = typeof window === 'undefined' || !code ? '' : `${window.location.origin}/r/${code}`
  return (
    <main className="bb-form-screen bb-screen">
      <button className="bb-back-button" onClick={() => dispatch({ type: 'navigate', screen: 'home' })}><ArrowLeft /> Back</button>
      <section className="bb-form-card">
        {!code ? (
          <>
            <span className="bb-eyebrow">Create a room</span>
            <h1>Start your photobooth</h1>
            <p>Your partner can join with the room code.</p>
            <label className="bb-field">Room name<input value={roomName} maxLength={24} placeholder="Sunday shoot" onChange={(event) => setRoomName(event.target.value)} /></label>
            <label className="bb-field">Your name<input value={userName} maxLength={20} placeholder="You" onChange={(event) => setUserName(event.target.value)} /></label>
            <label className="bb-switch-row"><span>Turn on camera right away</span><input type="checkbox" checked={startCamera} onChange={(event) => setStartCamera(event.target.checked)} /></label>
            <button className="bb-primary-button bb-full-button" onClick={create}>Create room <ArrowRight /></button>
          </>
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
