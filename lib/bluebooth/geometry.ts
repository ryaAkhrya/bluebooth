import type { FramePreset, GridPreset, LayoutSettings } from '@/types/bluebooth'

export interface SlotRect {
  id: string
  x: number
  y: number
  width: number
  height: number
  radius: number
}

export interface CompositionGeometry {
  width: number
  height: number
  scale: number
  framePadding: number
  layoutPadding: number
  padding: number
  gap: number
  radius: number
  topBand: number
  bottomBand: number
  slots: SlotRect[]
}

export interface CompositionGeometryInput {
  preset: GridPreset
  frame: FramePreset
  layout: LayoutSettings
  width?: number
  height?: number
  showDate?: boolean
  showRoom?: boolean
}

export function getSlotIds(preset: GridPreset): string[] {
  return [...new Set(preset.areas.flat())]
}

export function getSlotRects(
  preset: GridPreset,
  width: number,
  height: number,
  gap: number,
  padding: number,
  topBand = 0,
  bottomBand = 0,
  radius = 0,
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

    const slotWidth =
      (maxColumn - minColumn + 1) * cellWidth + (maxColumn - minColumn) * gap
    const slotHeight = (maxRow - minRow + 1) * cellHeight + (maxRow - minRow) * gap
    return {
      id,
      x: padding + minColumn * (cellWidth + gap),
      y: padding + topBand + minRow * (cellHeight + gap),
      width: slotWidth,
      height: slotHeight,
      radius: Math.max(0, Math.min(radius, slotWidth / 2, slotHeight / 2)),
    }
  })
}

export function getCompositionGeometry({
  preset,
  frame,
  layout,
  width = preset.output[0],
  height = preset.output[1],
  showDate = false,
  showRoom = false,
}: CompositionGeometryInput): CompositionGeometry {
  if (width <= 0 || height <= 0) throw new Error('Composition dimensions must be positive')
  const scale = Math.min(width, height) / 400
  const framePadding = frame.padding * scale
  const layoutPadding = layout.padding * scale
  const padding = framePadding + layoutPadding
  const gap = layout.gap * scale
  const radius = (layout.radius + (frame.roundExtra ? 8 : 0)) * scale
  const topBand = frame.topLabel ? 34 * scale : 0
  const bottomBand =
    frame.captionArea || frame.dateArea || showDate || showRoom ? 40 * scale : 0
  const slots = getSlotRects(
    preset,
    width,
    height,
    gap,
    padding,
    topBand,
    bottomBand,
    radius,
  )
  if (slots.some((slot) => slot.width <= 0 || slot.height <= 0)) {
    throw new Error('Composition spacing leaves no room for photo slots')
  }
  return {
    width,
    height,
    scale,
    framePadding,
    layoutPadding,
    padding,
    gap,
    radius,
    topBand,
    bottomBand,
    slots,
  }
}

export function getSplitRects(rect: SlotRect, swapped = false): [SlotRect, SlotRect] {
  const left = { ...rect, id: `${rect.id}-left`, width: rect.width / 2 }
  const right = {
    ...rect,
    id: `${rect.id}-right`,
    x: rect.x + rect.width / 2,
    width: rect.width / 2,
  }
  return swapped ? [right, left] : [left, right]
}
