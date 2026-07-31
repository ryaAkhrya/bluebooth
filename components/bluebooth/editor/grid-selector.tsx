'use client'

import { useState } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useLocalMedia } from '@/components/bluebooth/state/local-media'
import { useRoom } from '@/components/bluebooth/state/room-state'
import { getCompositionGeometry, getSlotIds } from '@/lib/bluebooth/geometry'
import { getFramePreset } from '@/lib/bluebooth/presets/frames'
import { GRID_PRESETS } from '@/lib/bluebooth/presets/grids'
import type { GridCategory } from '@/types/bluebooth'

const categories: Array<{ id: GridCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'print', label: 'Print' },
]

const thumbnailFrame = getFramePreset('clean-white')
const thumbnailGeometry = new Map(
  GRID_PRESETS.map((preset) => [
    preset.id,
    getCompositionGeometry({
      preset,
      frame: thumbnailFrame,
      layout: { gap: 4, padding: 0, radius: 4, background: '#ffffff' },
    }),
  ]),
)

export function GridSelector() {
  const { state } = useBluebooth()
  const media = useLocalMedia()
  const room = useRoom()
  const [category, setCategory] = useState<GridCategory | 'all'>('all')
  const presets = category === 'all'
    ? GRID_PRESETS
    : GRID_PRESETS.filter((preset) => preset.category === category)
  return (
    <>
      <div className="bb-chips" role="group" aria-label="Grid categories">
        {categories.map((item) => (
          <button
            key={item.id}
            aria-pressed={category === item.id}
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
            disabled={!room.canControlBooth}
            aria-pressed={state.selectedGrid === preset.id}
            onClick={() => {
              media.clearCaptures()
              media.clearFinalResult()
              room.updateSharedSettings({ selectedGrid: preset.id })
            }}
          >
            <GridThumbnail preset={preset} />
            <strong>{preset.name}</strong>
            <small>{getSlotIds(preset).length} · {preset.ratio}</small>
          </button>
        ))}
      </div>
    </>
  )
}

function GridThumbnail({ preset }: { preset: (typeof GRID_PRESETS)[number] }) {
  const geometry = thumbnailGeometry.get(preset.id)
  if (!geometry) return null
  return (
    <span
      className="bb-grid-thumb"
      style={{ aspectRatio: `${preset.output[0]} / ${preset.output[1]}` }}
    >
      {geometry.slots.map((slot) => (
        <span
          key={slot.id}
          style={{
            left: `${(slot.x / geometry.width) * 100}%`,
            top: `${(slot.y / geometry.height) * 100}%`,
            width: `${(slot.width / geometry.width) * 100}%`,
            height: `${(slot.height / geometry.height) * 100}%`,
          }}
        />
      ))}
    </span>
  )
}
