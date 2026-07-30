'use client'

import { CameraVideo } from '@/components/bluebooth/camera/camera-video'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { getGridTemplateAreas, getSlotIds } from '@/lib/bluebooth/geometry'
import { cameraFilterCss, cameraTransform } from '@/lib/bluebooth/media'
import { getFramePreset } from '@/lib/bluebooth/presets/frames'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'

function DemoFeed({ label = 'Partner' }: { label?: string }) {
  return <div className="bb-demo-feed"><span>{label}</span></div>
}

export function CompositionPreview({
  stream,
  captured = false,
}: {
  stream: MediaStream | null
  captured?: boolean
}) {
  const { state } = useBluebooth()
  const grid = getGridPreset(state.selectedGrid)
  const frame = getFramePreset(state.selectedFrame)
  const slotIds = getSlotIds(grid)
  const filter = cameraFilterCss(state.cameraSettings)
  const transform = cameraTransform(state.cameraSettings)
  const sourceFor = (index: number) => {
    if (state.cameraMode === 'alternate') return index % 2 === 0 ? 'user' : 'partner'
    return state.cameraMode
  }
  const orderedSource = (source: 'user' | 'partner') =>
    state.swap ? (source === 'user' ? 'partner' : 'user') : source
  const renderSource = (source: 'user' | 'partner') =>
    orderedSource(source) === 'user' ? (
      stream ? (
        <CameraVideo
          stream={stream}
          style={{ filter, transform, objectFit: state.cameraSettings.fit }}
        />
      ) : (
        <DemoFeed label="Your camera" />
      )
    ) : (
      <DemoFeed />
    )

  const label = state.frameOptions.caption ||
    (state.frameOptions.showRoom ? `Room ${state.roomCode}` : '')
  return (
    <div
      className={`bb-composition ${frame.film ? 'is-film' : ''} ${frame.check ? 'is-check' : ''}`}
      style={{
        aspectRatio: `${grid.output[0]} / ${grid.output[1]}`,
        background: frame.background,
        borderColor: frame.borderColor,
        borderWidth: frame.border,
        padding: frame.padding,
      }}
      role="img"
      aria-label="Photobooth composition preview"
    >
      {frame.topLabel && <div className="bb-frame-top-label">{label || state.roomName}</div>}
      {state.customFrame && !state.customFrame.front && (
        <CustomFrameLayer />
      )}
      <div
        className="bb-composition-grid"
        style={{
          gridTemplateAreas: getGridTemplateAreas(grid),
          gridTemplateColumns: `repeat(${grid.columns}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
          gap: state.layout.gap,
          padding: state.layout.padding,
          background: state.layout.background,
        }}
      >
        {slotIds.map((id, index) => {
          const source = sourceFor(index)
          return (
            <div
              className="bb-composition-slot"
              key={id}
              style={{
                gridArea: id,
                borderRadius: state.layout.radius + (frame.roundExtra ? 8 : 0),
                borderColor: state.frameOptions.borderColor,
                borderWidth: state.frameOptions.borderWidth,
              }}
            >
              {captured && state.capturedPhotos[index] ? (
                // Captures are local browser data URLs produced by the current session.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={state.capturedPhotos[index]} alt={`Captured photo ${index + 1}`} />
              ) : source === 'split' ? (
                <div className="bb-split-feed">
                  {renderSource('user')}
                  {renderSource('partner')}
                </div>
              ) : (
                renderSource(source)
              )}
              {frame.numbering && <span className="bb-slot-number">{String(index + 1).padStart(2, '0')}</span>}
            </div>
          )
        })}
      </div>
      {(frame.captionArea || frame.dateArea || state.frameOptions.showDate || state.frameOptions.showRoom) && (
        <div className="bb-frame-caption">
          {[label, state.frameOptions.showDate || frame.dateArea ? new Date().toLocaleDateString() : '']
            .filter(Boolean)
            .join(' · ')}
        </div>
      )}
      {state.customFrame?.front && <CustomFrameLayer />}
    </div>
  )
}

function CustomFrameLayer() {
  const { state } = useBluebooth()
  const frame = state.customFrame
  if (!frame) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="bb-custom-frame-layer"
      src={frame.url}
      alt=""
      style={{
        opacity: frame.opacity / 100,
        objectFit: frame.fit,
        transform: `translate(${frame.x}%, ${frame.y}%) scale(${frame.scale / 100})`,
      }}
    />
  )
}
