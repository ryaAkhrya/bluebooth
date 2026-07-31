import { GRID_PRESETS } from '@/lib/bluebooth/presets/grids'
import type { Json } from '@/types/database'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.max(1, Math.round(Math.abs(left)))
  let b = Math.max(1, Math.round(Math.abs(right)))
  while (b !== 0) {
    const remainder = a % b
    a = b
    b = remainder
  }
  return a
}

export function getResultHistoryDisplay(
  metadata: Json,
  width: number,
  height: number,
): { gridName: string; ratio: string } {
  const configuration =
    isRecord(metadata) && isRecord(metadata.configuration)
      ? metadata.configuration
      : null
  const gridId =
    configuration && typeof configuration.selectedGrid === 'string'
      ? configuration.selectedGrid
      : null
  const preset = gridId
    ? GRID_PRESETS.find((candidate) => candidate.id === gridId)
    : null
  if (preset) return { gridName: preset.name, ratio: preset.ratio }

  const divisor = greatestCommonDivisor(width, height)
  return {
    gridName: 'Photobooth result',
    ratio: `${Math.round(width / divisor)}:${Math.round(height / divisor)}`,
  }
}

export function signedUrlNeedsRefresh(
  expiresAt: number,
  now = Date.now(),
  refreshWindowMs = 30_000,
): boolean {
  return expiresAt - now <= Math.max(0, refreshWindowMs)
}
