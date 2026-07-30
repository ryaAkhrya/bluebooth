'use client'

import { useState } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { getGridTemplateAreas, getSlotIds } from '@/lib/bluebooth/geometry'
import { GRID_PRESETS } from '@/lib/bluebooth/presets/grids'
import type { GridCategory } from '@/types/bluebooth'

const categories: Array<{ id: GridCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'print', label: 'Print' },
]

export function GridSelector() {
  const { state, dispatch } = useBluebooth()
  const [category, setCategory] = useState<GridCategory | 'all'>('all')
  const presets = category === 'all'
    ? GRID_PRESETS
    : GRID_PRESETS.filter((preset) => preset.category === category)
  return (
    <>
      <div className="bb-chips" aria-label="Grid categories">
        {categories.map((item) => (
          <button
            key={item.id}
            className={category === item.id ? 'is-active' : ''}
            onClick={() => setCategory(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="bb-preset-grid">
        {presets.map((preset) => (
          <button
            key={preset.id}
            className={`bb-grid-card ${state.selectedGrid === preset.id ? 'is-selected' : ''}`}
            aria-pressed={state.selectedGrid === preset.id}
            onClick={() => dispatch({ type: 'select-grid', id: preset.id })}
          >
            <span
              className="bb-grid-thumb"
              style={{
                aspectRatio: `${preset.output[0]} / ${preset.output[1]}`,
                gridTemplateAreas: getGridTemplateAreas(preset),
                gridTemplateColumns: `repeat(${preset.columns}, 1fr)`,
                gridTemplateRows: `repeat(${preset.rows}, 1fr)`,
              }}
            >
              {getSlotIds(preset).map((slot) => <span key={slot} style={{ gridArea: slot }} />)}
            </span>
            <strong>{preset.name}</strong>
            <small>{getSlotIds(preset).length} · {preset.ratio}</small>
          </button>
        ))}
      </div>
    </>
  )
}
