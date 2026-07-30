'use client'

import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { CAMERA_FILTERS } from '@/lib/bluebooth/presets/filters'
import type { CameraStatus } from '@/types/bluebooth'

export function CameraControls({
  status,
  devices,
  deviceId,
  onRequest,
}: {
  status: CameraStatus
  devices: MediaDeviceInfo[]
  deviceId: string
  onRequest: (deviceId?: string) => Promise<void>
}) {
  const { state, dispatch } = useBluebooth()
  const patch = (key: keyof typeof state.cameraSettings, value: string | number | boolean) =>
    dispatch({ type: 'patch-camera', patch: { [key]: value } })
  return (
    <>
      <div className="bb-control-card">
        <div className="bb-control-heading">
          <span><strong>Camera</strong><small>{status === 'ready' ? 'Ready' : status}</small></span>
          <button className="bb-secondary-button" onClick={() => void onRequest(deviceId || undefined)}>
            {status === 'ready' ? 'Restart camera' : 'Start camera'}
          </button>
        </div>
        {devices.length > 0 && (
          <label className="bb-field">Device
            <select value={deviceId} onChange={(event) => void onRequest(event.target.value)}>
              {devices.map((device, index) => <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>)}
            </select>
          </label>
        )}
        <label className="bb-switch-row"><span>Mirror camera</span><input type="checkbox" checked={state.cameraSettings.mirror} onChange={(event) => patch('mirror', event.target.checked)} /></label>
        <label className="bb-field">Fit
          <select value={state.cameraSettings.fit} onChange={(event) => patch('fit', event.target.value)}>
            <option value="cover">Cover</option>
            <option value="contain">Contain</option>
            <option value="fill">Stretch</option>
          </select>
        </label>
      </div>
      <div className="bb-filter-list">
        {CAMERA_FILTERS.map((filter) => (
          <button key={filter.id} className={state.cameraSettings.filter === filter.id ? 'is-selected' : ''} aria-pressed={state.cameraSettings.filter === filter.id} onClick={() => patch('filter', filter.id)}>
            <span style={{ filter: filter.css }} />
            {filter.name}
          </button>
        ))}
      </div>
      <div className="bb-control-card">
        <Range label="Brightness" value={state.cameraSettings.brightness * 100} min={50} max={150} onChange={(value) => patch('brightness', value / 100)} suffix="%" />
        <Range label="Contrast" value={state.cameraSettings.contrast * 100} min={50} max={150} onChange={(value) => patch('contrast', value / 100)} suffix="%" />
        <Range label="Saturation" value={state.cameraSettings.saturation * 100} min={0} max={200} onChange={(value) => patch('saturation', value / 100)} suffix="%" />
        <Range label="Warmth" value={state.cameraSettings.warmth} min={-50} max={50} onChange={(value) => patch('warmth', value)} />
        <Range label="Zoom" value={state.cameraSettings.zoom * 100} min={100} max={180} onChange={(value) => patch('zoom', value / 100)} suffix="%" />
        <button className="bb-text-button" onClick={() => dispatch({ type: 'patch-camera', patch: { brightness: 1, contrast: 1, saturation: 1, warmth: 0, zoom: 1 } })}>Reset adjustments</button>
      </div>
    </>
  )
}

function Range({ label, value, min, max, suffix = '', onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (value: number) => void }) {
  return <label className="bb-range"><span>{label}<output>{Math.round(value)}{suffix}</output></span><input type="range" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} /></label>
}
