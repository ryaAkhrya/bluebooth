import { GAP_STEPS, PADDING_STEPS, RADIUS_STEPS } from '@/lib/bluebooth/constants'
import { FRAME_PRESETS } from '@/lib/bluebooth/presets/frames'
import { GRID_PRESETS } from '@/lib/bluebooth/presets/grids'
import type { BlueboothState, LayoutSettings } from '@/types/bluebooth'
import type { Json } from '@/types/database'

export interface SharedSetupSettings {
  selectedGrid: string
  selectedFrame: string
  timer: 3 | 5 | 10
  layout: LayoutSettings
}

export type SharedSetupPatch =
  | { selectedGrid: string }
  | { selectedFrame: string }
  | { timer: 3 | 5 | 10 }
  | { layout: LayoutSettings }

export const DEFAULT_SHARED_SETUP: SharedSetupSettings = {
  selectedGrid: 'ig-square-4',
  selectedFrame: 'clean-white',
  timer: 5,
  layout: { gap: 8, padding: 16, radius: 8, background: '#ffffff' },
}

const gridIds = new Set(GRID_PRESETS.map((preset) => preset.id))
const frameIds = new Set(FRAME_PRESETS.map((preset) => preset.id))
const timers = new Set<number>([3, 5, 10])
const backgroundPattern = /^#[0-9a-f]{6}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function includesNumber(values: readonly number[], value: unknown): value is number {
  return typeof value === 'number' && values.includes(value)
}

export function isLayoutSettings(value: unknown): value is LayoutSettings {
  if (!isRecord(value)) return false
  return (
    includesNumber(GAP_STEPS, value.gap) &&
    includesNumber(PADDING_STEPS, value.padding) &&
    includesNumber(RADIUS_STEPS, value.radius) &&
    typeof value.background === 'string' &&
    backgroundPattern.test(value.background)
  )
}

export function parseSharedSetup(value: Json): SharedSetupSettings {
  if (!isRecord(value)) return DEFAULT_SHARED_SETUP
  const layout = value.layout
  return {
    selectedGrid:
      typeof value.selectedGrid === 'string' && gridIds.has(value.selectedGrid)
        ? value.selectedGrid
        : DEFAULT_SHARED_SETUP.selectedGrid,
    selectedFrame:
      typeof value.selectedFrame === 'string' && frameIds.has(value.selectedFrame)
        ? value.selectedFrame
        : DEFAULT_SHARED_SETUP.selectedFrame,
    timer:
      typeof value.timer === 'number' && timers.has(value.timer)
        ? (value.timer as SharedSetupSettings['timer'])
        : DEFAULT_SHARED_SETUP.timer,
    layout: isLayoutSettings(layout)
      ? {
          gap: layout.gap,
          padding: layout.padding,
          radius: layout.radius,
          background: layout.background,
        }
      : { ...DEFAULT_SHARED_SETUP.layout },
  }
}

export function isSharedSetupPatch(value: unknown): value is SharedSetupPatch {
  if (!isRecord(value) || Object.keys(value).length !== 1) return false
  if ('selectedGrid' in value) {
    return typeof value.selectedGrid === 'string' && gridIds.has(value.selectedGrid)
  }
  if ('selectedFrame' in value) {
    return typeof value.selectedFrame === 'string' && frameIds.has(value.selectedFrame)
  }
  if ('timer' in value) {
    return typeof value.timer === 'number' && timers.has(value.timer)
  }
  if ('layout' in value) return isLayoutSettings(value.layout)
  return false
}

export function applySharedSetupPatch(
  settings: SharedSetupSettings,
  patch: SharedSetupPatch,
): SharedSetupSettings {
  if ('selectedGrid' in patch) return { ...settings, selectedGrid: patch.selectedGrid }
  if ('selectedFrame' in patch) return { ...settings, selectedFrame: patch.selectedFrame }
  if ('timer' in patch) return { ...settings, timer: patch.timer }
  return { ...settings, layout: { ...patch.layout } }
}

export function selectSharedSetup(state: BlueboothState): SharedSetupSettings {
  return {
    selectedGrid: state.selectedGrid,
    selectedFrame: state.selectedFrame,
    timer: state.timer,
    layout: { ...state.layout },
  }
}

export function sharedSetupPatchToJson(patch: SharedSetupPatch): Json {
  return patch as Json
}

export function sharedSetupToJson(settings: SharedSetupSettings): Json {
  return {
    selectedGrid: settings.selectedGrid,
    selectedFrame: settings.selectedFrame,
    timer: settings.timer,
    layout: {
      gap: settings.layout.gap,
      padding: settings.layout.padding,
      radius: settings.layout.radius,
      background: settings.layout.background,
    },
  }
}
