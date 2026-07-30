'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useToast } from '@/components/bluebooth/ui/toast-provider'

export function JoinRoomScreen({ onStartCamera }: { onStartCamera: () => Promise<void> }) {
  const { state, dispatch } = useBluebooth()
  const toast = useToast()
  const [code, setCode] = useState(state.roomCode)
  const [name, setName] = useState('')
  const join = () => {
    const normalized = code.trim().toUpperCase()
    if (!/^[A-Z0-9]{6}$/.test(normalized)) return toast('Enter a valid 6-character room code.', 'error')
    dispatch({
      type: 'set-room',
      code: normalized,
      roomName: 'Bluebooth',
      userName: name.trim() || 'You',
      participants: [
        { id: 'partner', name: 'Partner', connected: true, isSelf: false },
        { id: 'self', name: name.trim() || 'You', connected: true, isSelf: true },
      ],
    })
    dispatch({ type: 'set-demo-partner', enabled: true })
    dispatch({ type: 'navigate', screen: 'waiting' })
    void onStartCamera()
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
        <button className="bb-primary-button bb-full-button" onClick={join}>Join room <ArrowRight /></button>
      </section>
    </main>
  )
}
