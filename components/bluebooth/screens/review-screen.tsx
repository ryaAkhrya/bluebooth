'use client'

import { ArrowRight, RotateCcw } from 'lucide-react'
import { CompositionPreview } from '@/components/bluebooth/editor/composition-preview'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useLocalMedia } from '@/components/bluebooth/state/local-media'
import { getSlotIds } from '@/lib/bluebooth/geometry'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'
import {
  resolveCapturedSlotImages,
} from '@/lib/bluebooth/capture-events'
import type { SynchronizedCaptureController } from '@/hooks/use-synchronized-capture'

export function ReviewScreen({
  stream,
  synchronizedCapture,
}: {
  stream: MediaStream | null
  synchronizedCapture: SynchronizedCaptureController
}) {
  if (synchronizedCapture.enabled && synchronizedCapture.configuration) {
    return (
      <SynchronizedReviewScreen
        stream={stream}
        synchronizedCapture={synchronizedCapture}
      />
    )
  }
  return <LocalReviewScreen stream={stream} />
}

function SynchronizedReviewScreen({
  stream,
  synchronizedCapture,
}: {
  stream: MediaStream | null
  synchronizedCapture: SynchronizedCaptureController
}) {
  const { dispatch } = useBluebooth()
  const configuration = synchronizedCapture.configuration
  const total = synchronizedCapture.snapshot?.session.shot_count ?? 0
  if (!configuration) return null
  const capturedSources = resolveCapturedSlotImages(
    configuration,
    total,
    synchronizedCapture.sharedCaptureUrls,
  )
  return (
    <main className="bb-review bb-screen">
      <header className="bb-centered-heading">
        <span className="bb-eyebrow">Shared review</span>
        <h1>How does it look?</h1>
        <p>Both local-quality cameras are arranged in the same composition.</p>
      </header>
      {synchronizedCapture.pendingRetakeIndex !== undefined &&
        synchronizedCapture.isHost && (
          <div className="bb-capture-readiness">
            <strong>Partner requested a retake</strong>
            <span>
              {synchronizedCapture.pendingRetakeIndex === null
                ? 'Restart all photos'
                : `Retake photo ${synchronizedCapture.pendingRetakeIndex + 1}`}
            </span>
            <div>
              <button
                className="bb-primary-button"
                onClick={() => void synchronizedCapture.acceptPendingRetake()}
              >
                Accept
              </button>
              <button
                className="bb-text-button"
                onClick={synchronizedCapture.dismissPendingRetake}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      <div className="bb-review-layout">
        <div className="bb-review-preview">
          <CompositionPreview
            stream={stream}
            captured
            capturedSources={capturedSources}
            compositionConfiguration={configuration}
            customFrameResource={
              configuration.customFrame && synchronizedCapture.customFrameUrl
                ? {
                    frame: configuration.customFrame,
                    source: synchronizedCapture.customFrameUrl,
                  }
                : null
            }
            suppressLocalCustomFrame
          />
        </div>
        <aside className="bb-review-list">
          {Array.from({ length: total }, (_, index) => {
            const source = capturedSources[index]
            const thumbnail =
              typeof source === 'string' ? source : source?.left
            return (
              <article key={index}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnail} alt={`Photo ${index + 1}`} />
                <span>
                  <strong>Photo {index + 1}</strong>
                  <small>{source ? 'Both captures ready' : 'Loading captures'}</small>
                </span>
                <button
                  className="bb-secondary-button"
                  disabled={!source || !synchronizedCapture.isHost}
                  onClick={() => void synchronizedCapture.requestRetake(index)}
                >
                  <RotateCcw />{' '}
                  {synchronizedCapture.isHost ? 'Retake' : 'Host controls retakes'}
                </button>
              </article>
            )
          })}
        </aside>
      </div>
      <div className="bb-review-actions">
        <button
          className="bb-secondary-button"
          disabled={!synchronizedCapture.isHost}
          onClick={() => void synchronizedCapture.requestRetake(null)}
        >
          <RotateCcw />{' '}
          {synchronizedCapture.isHost ? 'Restart all' : 'Waiting for host'}
        </button>
        {synchronizedCapture.isHost ? (
          <button
            className="bb-primary-button"
            disabled={capturedSources.some((source) => !source)}
            onClick={() => dispatch({ type: 'navigate', screen: 'final' })}
          >
            Build final photo <ArrowRight />
          </button>
        ) : (
          <button className="bb-primary-button" disabled>
            Waiting for host
          </button>
        )}
      </div>
    </main>
  )
}

function LocalReviewScreen({ stream }: { stream: MediaStream | null }) {
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
