'use client'

import { Camera, LogOut } from 'lucide-react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'

export function AppHeader({ onLeave, onCamera }: { onLeave: () => void; onCamera: () => void }) {
  const { state } = useBluebooth()
  const inRoom = ['waiting', 'setup', 'session', 'review', 'final'].includes(state.screen)
  return (
    <header className="bb-header">
      <button className="bb-logo" onClick={() => !inRoom && undefined} aria-label="Bluebooth home">
        <span className="bb-logo-mark" aria-hidden="true"><span /></span>
        <strong>Bluebooth</strong>
      </button>
      {inRoom && (
        <div className="bb-header-actions">
          <span className="bb-room-pill">{state.roomCode}</span>
          <button className="bb-icon-button" aria-label="Camera" onClick={onCamera}><Camera /></button>
          <button className="bb-icon-button" aria-label="Leave room" onClick={onLeave}><LogOut /></button>
        </div>
      )}
    </header>
  )
}
