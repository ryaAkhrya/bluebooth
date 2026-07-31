'use client'

import { useMemo } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useCreativePlan } from '@/components/bluebooth/creative/creative-workflow'
import { useRoom } from '@/components/bluebooth/state/room-state'
import { getSlotIds } from '@/lib/bluebooth/geometry'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'
import type { CreativeCaptureTarget } from '@/lib/bluebooth/creative-studio'

const targets: CreativeCaptureTarget[] = [4, 6, 8, 10, 12, 'unlimited']

export function CaptureModeControls() {
  const { state } = useBluebooth()
  const room = useRoom()
  const creative = useCreativePlan()
  const templateSlots = useMemo(
    () => getSlotIds(getGridPreset(state.selectedGrid)).length,
    [state.selectedGrid],
  )
  const selectedCount = creative.resolveShotCount(templateSlots)

  return (
    <section className="bb-capture-plan" aria-labelledby="capture-mode-title">
      <div className="bb-capture-plan-heading">
        <div>
          <span className="bb-editor-label">Capture mode</span>
          <h3 id="capture-mode-title">Choose how this roll unfolds</h3>
        </div>
        <output>{selectedCount} photos</output>
      </div>
      <div className="bb-mode-cards" role="radiogroup" aria-label="Capture mode">
        <button
          type="button"
          role="radio"
          aria-checked={creative.mode === 'quick'}
          className={creative.mode === 'quick' ? 'is-selected' : ''}
          disabled={!room.canControlBooth}
          onClick={() => creative.setMode('quick')}
        >
          <span>Quick mode</span>
          <strong>{templateSlots} recommended</strong>
          <small>Fill the template automatically, then refine it.</small>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={creative.mode === 'creative'}
          className={creative.mode === 'creative' ? 'is-selected' : ''}
          disabled={!room.canControlBooth}
          onClick={() => creative.setMode('creative')}
        >
          <span>Creative mode</span>
          <strong>Build a larger gallery</strong>
          <small>Keep the template empty until the studio.</small>
        </button>
      </div>
      {creative.mode === 'creative' && (
        <div className="bb-capture-targets" role="radiogroup" aria-label="Photo count">
          {targets.map((target) => (
            <button
              type="button"
              role="radio"
              key={target}
              aria-checked={creative.target === target}
              className={creative.target === target ? 'is-active' : ''}
              disabled={!room.canControlBooth}
              onClick={() => creative.setTarget(target)}
            >
              {target === 'unlimited' ? 'Open roll' : target}
            </button>
          ))}
          <p>
            Open roll prepares a generous 24-photo synchronized gallery for
            uninterrupted arranging.
          </p>
        </div>
      )}
    </section>
  )
}
