'use client'

import { ArrowRight } from 'lucide-react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'

export function HomeScreen() {
  const { dispatch } = useBluebooth()
  return (
    <main className="bb-home bb-screen">
      <section className="bb-home-copy">
        <span className="bb-eyebrow">Bluebooth</span>
        <h1>A photobooth for two, wherever you are.</h1>
        <p>Choose a layout, set the frame, and capture your moment together.</p>
        <div className="bb-home-actions">
          <button className="bb-primary-button" onClick={() => dispatch({ type: 'navigate', screen: 'create' })}>Create a room <ArrowRight /></button>
          <button className="bb-secondary-button" onClick={() => dispatch({ type: 'navigate', screen: 'join' })}>Join with a code</button>
        </div>
      </section>
      <div className="bb-home-preview" aria-hidden="true">
        <div className="bb-mini-strip"><i /><i /><i /><i /><span>Room · Bluebooth</span></div>
      </div>
    </main>
  )
}
