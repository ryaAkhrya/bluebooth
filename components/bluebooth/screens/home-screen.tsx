'use client'

import { ArrowRight, Image as ImageIcon } from 'lucide-react'
import { useState } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { Modal } from '@/components/bluebooth/ui/modal'
import { useLocalResult } from '@/hooks/use-local-result'

export function HomeScreen() {
  const { dispatch } = useBluebooth()
  const [open, setOpen] = useState(false)
  const { result, load } = useLocalResult()
  const openPrevious = async () => {
    await load()
    setOpen(true)
  }
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
        <button className="bb-previous-button" onClick={() => void openPrevious()}><ImageIcon /> Open previous result</button>
      </section>
      <div className="bb-home-preview" aria-hidden="true">
        <div className="bb-mini-strip"><i /><i /><i /><i /><span>Room · Bluebooth</span></div>
      </div>
      <Modal open={open} title="Previous result" onClose={() => setOpen(false)}>
        {result ? (
          <div className="bb-previous-result">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.image} alt={`Bluebooth result from ${new Date(result.createdAt).toLocaleDateString()}`} />
            <strong>{result.roomName}</strong>
            <small>{result.gridName} · {result.dimensions.join('×')}</small>
            <a className="bb-primary-button" href={result.image} download={`bluebooth-${result.code}.png`}>Download</a>
          </div>
        ) : <p className="bb-empty-state">No saved result yet.</p>}
      </Modal>
    </main>
  )
}
