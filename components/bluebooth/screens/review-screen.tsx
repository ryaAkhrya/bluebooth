'use client'

import { ArrowRight, RotateCcw } from 'lucide-react'
import { CompositionPreview } from '@/components/bluebooth/editor/composition-preview'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useLocalMedia } from '@/components/bluebooth/state/local-media'
import { getSlotIds } from '@/lib/bluebooth/geometry'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'

export function ReviewScreen({ stream }: { stream: MediaStream | null }) {
  const { state, dispatch } = useBluebooth()
  const media = useLocalMedia()
  const total = getSlotIds(getGridPreset(state.selectedGrid)).length
  return (
    <main className="bb-review bb-screen">
      <header className="bb-centered-heading"><span className="bb-eyebrow">Review</span><h1>How does it look?</h1><p>Retake an individual photo or continue to your final result.</p></header>
      <div className="bb-review-layout">
        <div className="bb-review-preview"><CompositionPreview stream={stream} captured /></div>
        <aside className="bb-review-list">
          {Array.from({ length: total }, (_, index) => (
            <article key={index}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={media.captures[index]?.url} alt={`Photo ${index + 1}`} />
              <span><strong>Photo {index + 1}</strong><small>Captured</small></span>
              <button className="bb-secondary-button" onClick={() => { dispatch({ type: 'set-retake', index }); dispatch({ type: 'navigate', screen: 'session' }) }}><RotateCcw /> Retake</button>
            </article>
          ))}
        </aside>
      </div>
      <div className="bb-review-actions">
        <button className="bb-secondary-button" onClick={() => { media.clearCaptures(); media.clearFinalResult(); dispatch({ type: 'reset-session' }); dispatch({ type: 'navigate', screen: 'session' }) }}><RotateCcw /> Restart all</button>
        <button className="bb-primary-button" onClick={() => dispatch({ type: 'navigate', screen: 'final' })}>Build final photo <ArrowRight /></button>
      </div>
    </main>
  )
}
