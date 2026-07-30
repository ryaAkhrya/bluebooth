'use client'

import { CameraVideo } from '@/components/bluebooth/camera/camera-video'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useLocalMedia } from '@/components/bluebooth/state/local-media'
import { useRoom } from '@/components/bluebooth/state/room-state'
import { resolveSlotCaptureSources } from '@/lib/bluebooth/capture-events'
import { getCompositionGeometry } from '@/lib/bluebooth/geometry'
import { cameraFilterCss, cameraTransform } from '@/lib/bluebooth/media'
import { getFramePreset } from '@/lib/bluebooth/presets/frames'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'
import {
  resolvePreviewFeed,
  type BoothParticipantRole,
} from '@/lib/bluebooth/preview-sources'
import type {
  FrozenCaptureConfiguration,
  ResolvedSlotImage,
} from '@/types/capture'
import type { CustomFrame } from '@/types/bluebooth'

function DemoFeed({ label = 'Partner' }: { label?: string }) {
  return <div className="bb-demo-feed"><span>{label}</span></div>
}

export function CompositionPreview({
  stream,
  remoteStream = null,
  captured = false,
  capturedSources,
  compositionConfiguration,
  customFrameResource,
  suppressLocalCustomFrame = false,
}: {
  stream: MediaStream | null
  remoteStream?: MediaStream | null
  captured?: boolean
  capturedSources?: readonly ResolvedSlotImage[]
  compositionConfiguration?: FrozenCaptureConfiguration
  customFrameResource?: { frame: CustomFrame; source: string } | null
  suppressLocalCustomFrame?: boolean
}) {
  const { state } = useBluebooth()
  const media = useLocalMedia()
  const room = useRoom()
  const grid = getGridPreset(
    compositionConfiguration?.selectedGrid ?? state.selectedGrid,
  )
  const frame = getFramePreset(
    compositionConfiguration?.selectedFrame ?? state.selectedFrame,
  )
  const layout = compositionConfiguration?.layout ?? state.layout
  const frameOptions =
    compositionConfiguration?.frameOptions ?? state.frameOptions
  const cameraMode =
    compositionConfiguration?.cameraMode ?? state.cameraMode
  const cameraSettings =
    compositionConfiguration?.cameraSettings ?? state.cameraSettings
  const swap = compositionConfiguration?.swap ?? state.swap
  const activeCustomFrame =
    customFrameResource?.frame ??
    (suppressLocalCustomFrame ? null : state.customFrame)
  const activeCustomFrameSource =
    customFrameResource?.source ??
    (suppressLocalCustomFrame ? null : media.customFrame?.url ?? null)
  const geometry = getCompositionGeometry({
    preset: grid,
    frame,
    layout,
    showDate: frameOptions.showDate,
    showRoom: frameOptions.showRoom,
  })
  const filter = cameraFilterCss(cameraSettings)
  const transform = cameraTransform(cameraSettings)
  const localRole = room.onlineRoom?.membership.role ?? 'host'
  const previewSources = resolveSlotCaptureSources(
    { cameraMode, swap },
    geometry.slots.length,
  )
  const renderSource = (sourceRole: BoothParticipantRole) => {
    const feed = resolvePreviewFeed(sourceRole, localRole)
    const sourceStream = feed === 'local' ? stream : remoteStream
    return sourceStream ? (
      <CameraVideo
        stream={sourceStream}
        className={feed === 'remote' ? 'bb-remote-video' : undefined}
        style={{ filter, transform, objectFit: cameraSettings.fit }}
      />
    ) : (
      <DemoFeed
        label={
          feed === 'local'
            ? 'Your camera'
            : sourceRole === 'host'
              ? 'Host'
              : 'Partner'
        }
      />
    )
  }

  const label = frameOptions.caption ||
    (frameOptions.showRoom ? `Room ${state.roomCode}` : '')
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
      {activeCustomFrame && activeCustomFrameSource && !activeCustomFrame.front && (
        <CustomFrameLayer
          frame={activeCustomFrame}
          source={activeCustomFrameSource}
          behind
        />
      )}
      <div
        className="bb-composition-inner-bg"
        style={{
          inset: `${(geometry.framePadding / Math.min(geometry.width, geometry.height)) * 400}px`,
          background: layout.background,
        }}
      />
      <div className="bb-composition-grid">
        {geometry.slots.map((rect, index) => {
          const source = previewSources[index]
          const capturedSource = capturedSources?.[index]
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
                borderColor: frameOptions.borderColor,
                borderWidth: frameOptions.borderWidth,
              }}
            >
              {capturedSource ? (
                typeof capturedSource === 'string' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={capturedSource} alt={`Captured photo ${index + 1}`} />
                ) : (
                  <div className="bb-split-feed">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={capturedSource.left} alt="" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={capturedSource.right} alt="" />
                  </div>
                )
              ) : captured && media.captures[index] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.captures[index]?.url} alt={`Captured photo ${index + 1}`} />
              ) : source.kind === 'split' ? (
                <div className="bb-split-feed">
                  {renderSource(source.left)}
                  {renderSource(source.right)}
                </div>
              ) : (
                renderSource(source.role)
              )}
              {frame.numbering && <span className="bb-slot-number">{String(index + 1).padStart(2, '0')}</span>}
            </div>
          )
        })}
      </div>
      {(frame.captionArea || frame.dateArea || frameOptions.showDate || frameOptions.showRoom) && (
        <div className="bb-frame-caption">
          {[label, frameOptions.showDate || frame.dateArea ? new Date().toLocaleDateString() : '']
            .filter(Boolean)
            .join(' · ')}
        </div>
      )}
      {activeCustomFrame?.front && activeCustomFrameSource && (
        <CustomFrameLayer
          frame={activeCustomFrame}
          source={activeCustomFrameSource}
        />
      )}
    </div>
  )
}

function CustomFrameLayer({
  frame,
  source,
  behind = false,
}: {
  frame: CustomFrame
  source: string
  behind?: boolean
}) {
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
