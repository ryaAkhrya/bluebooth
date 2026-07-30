'use client'

import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { FRAME_PRESETS } from '@/lib/bluebooth/presets/frames'
import { useToast } from '@/components/bluebooth/ui/toast-provider'
import { useLocalMedia } from '@/components/bluebooth/state/local-media'
import { useRoom } from '@/components/bluebooth/state/room-state'
import {
  validateCustomFrameDimensions,
  validateCustomFrameFile,
} from '@/lib/bluebooth/validation'

export function FrameSelector() {
  const { state, dispatch } = useBluebooth()
  const media = useLocalMedia()
  const room = useRoom()
  const toast = useToast()
  const chooseFile = async (file?: File) => {
    if (!file) return
    const basicValidation = validateCustomFrameFile(file)
    if (!basicValidation.valid) {
      toast(basicValidation.message, 'error')
      return
    }
    const temporaryUrl = URL.createObjectURL(file)
    try {
      const image = new Image()
      const dimensions = await new Promise<readonly [number, number]>((resolve, reject) => {
        image.onload = () => resolve([image.naturalWidth, image.naturalHeight])
        image.onerror = () => reject(new Error('decode'))
        image.src = temporaryUrl
      })
      const dimensionValidation = validateCustomFrameDimensions(...dimensions)
      if (!dimensionValidation.valid) {
        toast(dimensionValidation.message, 'error')
        return
      }
      media.setCustomFrame(file, ...dimensions)
      dispatch({
        type: 'set-custom-frame',
        frame: {
          id: crypto.randomUUID(),
          name: file.name,
          width: dimensions[0],
          height: dimensions[1],
          opacity: 100,
          scale: 100,
          x: 0,
          y: 0,
          fit: 'contain',
          front: true,
        },
      })
      toast('Custom frame added.', 'success')
    } catch {
      toast('That image could not be read.', 'error')
    } finally {
      URL.revokeObjectURL(temporaryUrl)
    }
  }

  return (
    <>
      <div className="bb-frame-grid">
        {FRAME_PRESETS.map((frame) => (
          <button
            key={frame.id}
            className={`bb-frame-card ${state.selectedFrame === frame.id ? 'is-selected' : ''}`}
            aria-pressed={state.selectedFrame === frame.id}
            onClick={() => room.updateSharedSettings({ selectedFrame: frame.id })}
          >
            <span style={{ background: frame.background, borderColor: frame.borderColor, borderWidth: Math.min(frame.border, 4) }}>
              <i />
            </span>
            <strong>{frame.name}</strong>
          </button>
        ))}
      </div>
      <label className="bb-dropzone">
        <strong>Upload transparent frame</strong>
        <span>PNG or WebP</span>
        <input
          type="file"
          accept="image/png,image/webp"
          onChange={(event) => {
            void chooseFile(event.target.files?.[0])
            event.currentTarget.value = ''
          }}
        />
      </label>
      {state.customFrame && (
        <div className="bb-control-card">
          <div className="bb-file-row">
            <span><strong>{state.customFrame.name}</strong><small>Custom frame</small></span>
            <button
              className="bb-text-button"
              onClick={() => {
                media.clearCustomFrame()
                dispatch({ type: 'set-custom-frame', frame: null })
              }}
            >
              Remove
            </button>
          </div>
          <Range label="Opacity" value={state.customFrame.opacity} min={0} max={100} onChange={(opacity) => dispatch({ type: 'patch-custom-frame', patch: { opacity } })} />
          <Range label="Scale" value={state.customFrame.scale} min={50} max={150} onChange={(scale) => dispatch({ type: 'patch-custom-frame', patch: { scale } })} />
          <Range label="Position X" value={state.customFrame.x} min={-50} max={50} onChange={(x) => dispatch({ type: 'patch-custom-frame', patch: { x } })} />
          <Range label="Position Y" value={state.customFrame.y} min={-50} max={50} onChange={(y) => dispatch({ type: 'patch-custom-frame', patch: { y } })} />
          <label className="bb-field">Fit
            <select value={state.customFrame.fit} onChange={(event) => dispatch({ type: 'patch-custom-frame', patch: { fit: event.target.value as 'cover' | 'contain' | 'fill' } })}>
              <option value="contain">Contain</option>
              <option value="cover">Cover</option>
              <option value="fill">Stretch</option>
            </select>
          </label>
          <label className="bb-switch-row">
            <span>Frame in front of photos</span>
            <input type="checkbox" checked={state.customFrame.front} onChange={(event) => dispatch({ type: 'patch-custom-frame', patch: { front: event.target.checked } })} />
          </label>
        </div>
      )}
      <div className="bb-control-card">
        <label className="bb-field">Caption
          <input maxLength={30} value={state.frameOptions.caption} placeholder={`Room ${state.roomCode}`} onChange={(event) => dispatch({ type: 'patch-frame-options', patch: { caption: event.target.value } })} />
        </label>
        <label className="bb-field">Border color
          <input type="color" value={state.frameOptions.borderColor} onChange={(event) => dispatch({ type: 'patch-frame-options', patch: { borderColor: event.target.value } })} />
        </label>
        <Range label="Border" value={state.frameOptions.borderWidth} min={0} max={24} onChange={(borderWidth) => dispatch({ type: 'patch-frame-options', patch: { borderWidth } })} />
        <label className="bb-switch-row"><span>Show date</span><input type="checkbox" checked={state.frameOptions.showDate} onChange={(event) => dispatch({ type: 'patch-frame-options', patch: { showDate: event.target.checked } })} /></label>
        <label className="bb-switch-row"><span>Show room name</span><input type="checkbox" checked={state.frameOptions.showRoom} onChange={(event) => dispatch({ type: 'patch-frame-options', patch: { showRoom: event.target.checked } })} /></label>
      </div>
    </>
  )
}

function Range({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return <label className="bb-range"><span>{label}<output>{value}</output></span><input type="range" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} /></label>
}
