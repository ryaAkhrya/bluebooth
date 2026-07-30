import type { GridPreset } from '@/types/bluebooth'

export interface SlotRect {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export function getSlotIds(preset: GridPreset): string[] {
  return [...new Set(preset.areas.flat())]
}

export function getGridTemplateAreas(preset: GridPreset): string {
  return preset.areas.map((row) => `"${row.join(' ')}"`).join(' ')
}

export function getSlotRects(
  preset: GridPreset,
  width: number,
  height: number,
  gap: number,
  padding: number,
  topBand = 0,
  bottomBand = 0,
): SlotRect[] {
  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2 - topBand - bottomBand
  const cellWidth = (innerWidth - gap * (preset.columns - 1)) / preset.columns
  const cellHeight = (innerHeight - gap * (preset.rows - 1)) / preset.rows

  return getSlotIds(preset).map((id) => {
    const cells: Array<[number, number]> = []
    preset.areas.forEach((row, rowIndex) => {
      row.forEach((area, columnIndex) => {
        if (area === id) cells.push([columnIndex, rowIndex])
      })
    })
    const columns = cells.map(([column]) => column)
    const rows = cells.map(([, row]) => row)
    const minColumn = Math.min(...columns)
    const maxColumn = Math.max(...columns)
    const minRow = Math.min(...rows)
    const maxRow = Math.max(...rows)

    return {
      id,
      x: padding + minColumn * (cellWidth + gap),
      y: padding + topBand + minRow * (cellHeight + gap),
      width: (maxColumn - minColumn + 1) * cellWidth + (maxColumn - minColumn) * gap,
      height: (maxRow - minRow + 1) * cellHeight + (maxRow - minRow) * gap,
    }
  })
}
