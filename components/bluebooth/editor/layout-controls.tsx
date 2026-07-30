'use client'

import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useRoom } from '@/components/bluebooth/state/room-state'
import { GAP_STEPS, PADDING_STEPS, RADIUS_STEPS } from '@/lib/bluebooth/constants'

export function LayoutControls() {
  const { state } = useBluebooth()
  const room = useRoom()
  return (
    <>
      <StepRange disabled={!room.canControlBooth} label="Gap" steps={GAP_STEPS} value={state.layout.gap} onChange={(gap) => room.updateSharedSettings({ layout: { ...state.layout, gap } })} />
      <StepRange disabled={!room.canControlBooth} label="Outer padding" steps={PADDING_STEPS} value={state.layout.padding} onChange={(padding) => room.updateSharedSettings({ layout: { ...state.layout, padding } })} />
      <StepRange disabled={!room.canControlBooth} label="Corner radius" steps={RADIUS_STEPS} value={state.layout.radius} onChange={(radius) => room.updateSharedSettings({ layout: { ...state.layout, radius } })} />
      <label className="bb-field">Canvas background
        <input disabled={!room.canControlBooth} type="color" value={state.layout.background} onChange={(event) => room.updateSharedSettings({ layout: { ...state.layout, background: event.target.value } })} />
      </label>
    </>
  )
}

function StepRange({ label, steps, value, disabled = false, onChange }: { label: string; steps: readonly number[]; value: number; disabled?: boolean; onChange: (value: number) => void }) {
  const current = Math.max(0, steps.indexOf(value))
  return (
    <label className="bb-range">
      <span>{label}<output>{value}px</output></span>
      <input disabled={disabled} type="range" min={0} max={steps.length - 1} value={current} onChange={(event) => onChange(steps[Number(event.target.value)])} />
    </label>
  )
}
