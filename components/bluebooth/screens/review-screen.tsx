'use client'

import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { CreativeStudioAsset } from '@/components/bluebooth/creative/creative-studio'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useLocalMedia } from '@/components/bluebooth/state/local-media'
import { resolveCapturedSlotImages } from '@/lib/bluebooth/capture-events'
import { getSlotIds } from '@/lib/bluebooth/geometry'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'
import type { SynchronizedCaptureController } from '@/hooks/use-synchronized-capture'

const CreativeStudio = dynamic(
  () => import('@/components/bluebooth/creative/creative-studio').then(
    (module) => module.CreativeStudio,
  ),
  {
    loading: () => (
      <div className="bb-studio-loading" role="status">
        Preparing your creative studio...
      </div>
    ),
  },
)

export function ReviewScreen({
  stream,
  synchronizedCapture,
}: {
  stream: MediaStream | null
  synchronizedCapture: SynchronizedCaptureController
}) {
  return synchronizedCapture.enabled && synchronizedCapture.configuration ? (
    <SynchronizedCreativeStudio
      stream={stream}
      synchronizedCapture={synchronizedCapture}
    />
  ) : (
    <LocalCreativeStudio stream={stream} />
  )
}

function SynchronizedCreativeStudio({
  stream,
  synchronizedCapture,
}: {
  stream: MediaStream | null
  synchronizedCapture: SynchronizedCaptureController
}) {
  const { dispatch } = useBluebooth()
  const configuration = synchronizedCapture.configuration
  const session = synchronizedCapture.snapshot?.session
  const total = session?.shot_count ?? 0
  const slotCount = configuration
    ? getSlotIds(getGridPreset(configuration.selectedGrid)).length
    : 0
  const capturedSources = useMemo(
    () =>
      configuration
        ? resolveCapturedSlotImages(
            configuration,
            total,
            synchronizedCapture.sharedCaptureUrls,
          )
        : [],
    [configuration, synchronizedCapture.sharedCaptureUrls, total],
  )
  const assets = useMemo<CreativeStudioAsset[]>(
    () =>
      capturedSources.flatMap((source, shotIndex) =>
        source ? [{ id: `shot-${shotIndex}`, shotIndex, source }] : [],
      ),
    [capturedSources],
  )

  if (!configuration || !session) return null

  return (
    <main className="bb-review bb-studio-screen bb-screen">
      <header className="bb-centered-heading">
        <span className="bb-eyebrow">Creative Studio</span>
        <h1>Turn the roll into something yours.</h1>
        <p>Choose, move, replace, and refine every memory before export.</p>
      </header>

      {synchronizedCapture.pendingRetakeIndex !== undefined &&
        synchronizedCapture.isHost && (
          <div className="bb-capture-readiness">
            <strong>Partner requested a retake</strong>
            <span>
              {synchronizedCapture.pendingRetakeIndex === null
                ? 'Restart the synchronized roll'
                : `Retake memory ${synchronizedCapture.pendingRetakeIndex + 1}`}
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

      <CreativeStudio
        studioKey={session.id}
        assets={assets}
        slotCount={slotCount}
        stream={stream}
        configuration={configuration}
        initialMode={configuration.creativeMode}
        customFrameResource={
          configuration.customFrame && synchronizedCapture.customFrameUrl
            ? {
                frame: configuration.customFrame,
                source: synchronizedCapture.customFrameUrl,
              }
            : null
        }
        editable={synchronizedCapture.isHost}
        onRetake={(shotIndex) => {
          void synchronizedCapture.requestRetake(shotIndex)
        }}
        onContinue={() => dispatch({ type: 'navigate', screen: 'final' })}
      />
    </main>
  )
}

function LocalCreativeStudio({ stream }: { stream: MediaStream | null }) {
  const { state, dispatch } = useBluebooth()
  const media = useLocalMedia()
  const slotCount = getSlotIds(getGridPreset(state.selectedGrid)).length
  const assets = useMemo<CreativeStudioAsset[]>(
    () =>
      media.captures.flatMap((capture, shotIndex) =>
        capture
          ? [{ id: `shot-${shotIndex}`, shotIndex, source: capture.url }]
          : [],
      ),
    [media.captures],
  )
  const studioKey = `local:${state.roomCode}:${state.selectedGrid}:${assets.length}`

  return (
    <main className="bb-review bb-studio-screen bb-screen">
      <header className="bb-centered-heading">
        <span className="bb-eyebrow">Creative Studio</span>
        <h1>Turn the roll into something yours.</h1>
        <p>Your captures are ingredients. The final arrangement is up to you.</p>
      </header>
      <CreativeStudio
        studioKey={studioKey}
        assets={assets}
        slotCount={slotCount}
        stream={stream}
        editable
        onRetake={(shotIndex) => {
          dispatch({ type: 'set-retake', index: shotIndex })
          dispatch({ type: 'navigate', screen: 'session' })
        }}
        onContinue={() => dispatch({ type: 'navigate', screen: 'final' })}
      />
    </main>
  )
}
