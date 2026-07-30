import type { FramePreset } from '@/types/bluebooth'

export const FRAME_PRESETS: readonly FramePreset[] = [
  { id: 'clean-white', name: 'Plain White', background: '#ffffff', border: 0, borderColor: '#ffffff', padding: 0 },
  { id: 'powder-blue', name: 'Powder Blue', background: '#EAF5FF', border: 0, borderColor: '#EAF5FF', padding: 24 },
  { id: 'thin-navy', name: 'Thin Navy', background: '#ffffff', border: 6, borderColor: '#1F5FAD', padding: 20 },
  { id: 'double-line', name: 'Double Line', background: '#ffffff', border: 3, borderColor: '#4D9FFF', padding: 22, inner: true },
  { id: 'soft-paper', name: 'Soft Paper', background: '#F7F3EC', border: 0, borderColor: '#F7F3EC', padding: 28 },
  { id: 'film-edge', name: 'Film Edge', background: '#17243A', border: 0, borderColor: '#17243A', padding: 26, film: true },
  { id: 'minimal-caption', name: 'Minimal Caption', background: '#ffffff', border: 0, borderColor: '#ffffff', padding: 20, captionArea: true },
  { id: 'bottom-date', name: 'Bottom Date', background: '#ffffff', border: 0, borderColor: '#ffffff', padding: 20, dateArea: true },
  { id: 'top-label', name: 'Top Label', background: '#ffffff', border: 0, borderColor: '#ffffff', padding: 20, topLabel: true },
  { id: 'rounded-print', name: 'Rounded Print', background: '#EAF5FF', border: 0, borderColor: '#EAF5FF', padding: 26, roundExtra: true },
  { id: 'pale-check', name: 'Pale Blue Check', background: '#DCEEFF', border: 0, borderColor: '#DCEEFF', padding: 26, check: true },
  { id: 'editorial-num', name: 'Editorial Numbers', background: '#ffffff', border: 0, borderColor: '#ffffff', padding: 22, numbering: true },
] as const

export function getFramePreset(id: string): FramePreset {
  return FRAME_PRESETS.find((preset) => preset.id === id) ?? FRAME_PRESETS[0]
}
