'use client'

import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { FRAME_PRESETS } from '@/lib/bluebooth/presets/frames'
import { useToast } from '@/components/bluebooth/ui/toast-provider'

export function FrameSelector() {
  const { state, dispatch } = useBluebooth()
  const toast = useToast()
  const chooseFile = (file?: File) => {
    if (!file) return
    if (!['image/png', 'image/webp'].includes(file.type)) {
      toast('Choose a PNG or WebP frame.', 'error')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') return
      const image = new Image()
      image.onload = () => {
        dispatch({
          type: 'set-custom-frame',
          frame: { name: file.name, url: reader.result as string, opacity: 100, scale: 100, x: 0, y: 0, fit: 'contain', front: true },
        })
        toast('Custom frame added.', 'success')
      }
      image.onerror = () => toast('That image could not be read.', 'error')
      image.src = reader.result
    }
    reader.onerror = () => toast('That image could not be read.', 'error')
    reader.readAsDataURL(file)
  }

  return (
    <>
      <div className="bb-frame-grid">
        {FRAME_PRESETS.map((frame) => (
          <button
            key={frame.id}
            className={`bb-frame-card ${state.selectedFrame === frame.id ? 'is-selected' : ''}`}
            aria-pressed={state.selectedFrame === frame.id}
            onClick={() => dispatch({ type: 'select-frame', id: frame.id })}
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
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
      </label>
      {state.customFrame && (
        <div className="bb-control-card">
          <div className="bb-file-row">
            <span><strong>{state.customFrame.name}</strong><small>Custom frame</small></span>
            <button
              className="bb-text-button"
              onClick={() => {
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
