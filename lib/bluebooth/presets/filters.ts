import type { CameraFilter } from '@/types/bluebooth'

export const CAMERA_FILTERS: readonly CameraFilter[] = [
  { id: 'original', name: 'Original', css: '' },
  { id: 'soft', name: 'Soft', css: 'brightness(1.05) contrast(0.95) saturate(0.95)' },
  { id: 'cool', name: 'Cool', css: 'saturate(1.05) hue-rotate(-6deg) brightness(1.02)' },
  { id: 'warm', name: 'Warm', css: 'sepia(0.12) saturate(1.1) brightness(1.03)' },
  { id: 'clean', name: 'Clean', css: 'contrast(1.08) brightness(1.03)' },
  { id: 'faded', name: 'Faded', css: 'contrast(0.9) brightness(1.08) saturate(0.85)' },
  { id: 'mono', name: 'Mono', css: 'grayscale(1) contrast(1.05)' },
  { id: 'film', name: 'Film', css: 'sepia(0.18) contrast(1.05) saturate(1.05) brightness(0.98)' },
] as const

export function getCameraFilter(id: string): CameraFilter {
  return CAMERA_FILTERS.find((preset) => preset.id === id) ?? CAMERA_FILTERS[0]
}
