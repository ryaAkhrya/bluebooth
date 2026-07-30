'use client'

import { CameraVideo } from '@/components/bluebooth/camera/camera-video'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useLocalMedia } from '@/components/bluebooth/state/local-media'
import { getCompositionGeometry } from '@/lib/bluebooth/geometry'
import { cameraFilterCss, cameraTransform } from '@/lib/bluebooth/media'
import { getFramePreset } from '@/lib/bluebooth/presets/frames'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'

function DemoFeed({ label = 'Partner' }: { label?: string }) {
  return <div className="bb-demo-feed"><span>{label}</span></div>
}

export function CompositionPreview({
  stream,
  remoteStream = null,
  captured = false,
}: {
  stream: MediaStream | null
  remoteStream?: MediaStream | null
  captured?: boolean
}) {
  const { state } = useBluebooth()
  const media = useLocalMedia()
  const grid = getGridPreset(state.selectedGrid)
  const frame = getFramePreset(state.selectedFrame)
  const geometry = getCompositionGeometry({
    preset: grid,
    frame,
    layout: state.layout,
    showDate: state.frameOptions.showDate,
    showRoom: state.frameOptions.showRoom,
  })
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
    ) : remoteStream ? (
      <CameraVideo stream={remoteStream} className="bb-remote-video" />
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
      }}
      role="img"
      aria-label="Photobooth composition preview"
    >
      {frame.topLabel && <div className="bb-frame-top-label">{label || state.roomName}</div>}
      {state.customFrame && media.customFrame && !state.customFrame.front && (
        <CustomFrameLayer source={media.customFrame.url} behind />
      )}
      <div
        className="bb-composition-inner-bg"
        style={{
          inset: `${(geometry.framePadding / Math.min(geometry.width, geometry.height)) * 400}px`,
          background: state.layout.background,
        }}
      />
      <div className="bb-composition-grid">
        {geometry.slots.map((rect, index) => {
          const source = sourceFor(index)
          return (
            <div
              className="bb-composition-slot"
              key={rect.id}
              style={{
                left: `${(rect.x / geometry.width) * 100}%`,
                top: `${(rect.y / geometry.height) * 100}%`,
                width: `${(rect.width / geometry.width) * 100}%`,
                height: `${(rect.height / geometry.height) * 100}%`,
                borderRadius: `${(rect.radius / Math.min(geometry.width, geometry.height)) * 400}px`,
                borderColor: state.frameOptions.borderColor,
                borderWidth: state.frameOptions.borderWidth,
              }}
            >
              {captured && media.captures[index] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.captures[index]?.url} alt={`Captured photo ${index + 1}`} />
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
      {state.customFrame?.front && media.customFrame && (
        <CustomFrameLayer source={media.customFrame.url} />
      )}
    </div>
  )
}

function CustomFrameLayer({ source, behind = false }: { source: string; behind?: boolean }) {
  const { state } = useBluebooth()
  const frame = state.customFrame
  if (!frame) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`bb-custom-frame-layer ${behind ? 'is-behind' : ''}`}
      src={source}
      alt=""
      style={{
        opacity: frame.opacity / 100,
        objectFit: frame.fit,
        transform: `translate(${frame.x}%, ${frame.y}%) scale(${frame.scale / 100})`,
      }}
    />
  )
}
