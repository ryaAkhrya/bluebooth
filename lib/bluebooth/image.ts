import type { CameraFit } from '@/types/bluebooth'

export interface ImageDrawPlan {
  sourceX: number
  sourceY: number
  sourceWidth: number
  sourceHeight: number
  destinationX: number
  destinationY: number
  destinationWidth: number
  destinationHeight: number
}

export function getImageDrawPlan(
  sourceWidth: number,
  sourceHeight: number,
  destinationWidth: number,
  destinationHeight: number,
  fit: CameraFit,
  zoom = 1,
): ImageDrawPlan {
  if ([sourceWidth, sourceHeight, destinationWidth, destinationHeight].some((value) => value <= 0)) {
    throw new Error('Image dimensions must be positive')
  }
  const safeZoom = Math.max(1, zoom)
  const sourceRatio = sourceWidth / sourceHeight
  const destinationRatio = destinationWidth / destinationHeight

  if (fit === 'fill') {
    return {
      sourceX: 0,
      sourceY: 0,
      sourceWidth,
      sourceHeight,
      destinationX: -(destinationWidth * (safeZoom - 1)) / 2,
      destinationY: -(destinationHeight * (safeZoom - 1)) / 2,
      destinationWidth: destinationWidth * safeZoom,
      destinationHeight: destinationHeight * safeZoom,
    }
  }

  if (fit === 'contain') {
    const factor =
      sourceRatio > destinationRatio
        ? destinationWidth / sourceWidth
        : destinationHeight / sourceHeight
    const drawWidth = sourceWidth * factor * safeZoom
    const drawHeight = sourceHeight * factor * safeZoom
    return {
      sourceX: 0,
      sourceY: 0,
      sourceWidth,
      sourceHeight,
      destinationX: (destinationWidth - drawWidth) / 2,
      destinationY: (destinationHeight - drawHeight) / 2,
      destinationWidth: drawWidth,
      destinationHeight: drawHeight,
    }
  }

  let cropWidth = sourceWidth
  let cropHeight = sourceHeight
  if (sourceRatio > destinationRatio) cropWidth = sourceHeight * destinationRatio
  else cropHeight = sourceWidth / destinationRatio
  cropWidth /= safeZoom
  cropHeight /= safeZoom
  return {
    sourceX: (sourceWidth - cropWidth) / 2,
    sourceY: (sourceHeight - cropHeight) / 2,
    sourceWidth: cropWidth,
    sourceHeight: cropHeight,
    destinationX: 0,
    destinationY: 0,
    destinationWidth,
    destinationHeight,
  }
}

export function getCaptureDimensions(
  sourceWidth: number,
  sourceHeight: number,
  maximumDimension: number,
): readonly [number, number] {
  if (sourceWidth <= 0 || sourceHeight <= 0 || maximumDimension <= 0) {
    throw new Error('Capture dimensions must be positive')
  }
  const longEdge = Math.min(maximumDimension, Math.max(sourceWidth, sourceHeight))
  return sourceWidth >= sourceHeight
    ? [longEdge, Math.round(longEdge * 0.75)]
    : [Math.round(longEdge * 0.75), longEdge]
}

export function buildResultFilename(roomCode: string, date: Date): string {
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
  const safeCode = roomCode.trim().replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'room'
  return `bluebooth-${safeCode}-${day}.png`
}
