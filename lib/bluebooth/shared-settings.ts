import { GAP_STEPS, PADDING_STEPS, RADIUS_STEPS } from '@/lib/bluebooth/constants'
import { FRAME_PRESETS } from '@/lib/bluebooth/presets/frames'
import { CAMERA_FILTERS } from '@/lib/bluebooth/presets/filters'
import { GRID_PRESETS } from '@/lib/bluebooth/presets/grids'
import type {
  BlueboothState,
  CameraMode,
  CameraSettings,
  FrameOptions,
  LayoutSettings,
} from '@/types/bluebooth'
import type { Json } from '@/types/database'

export interface SharedSetupSettings {
  selectedGrid: string
  selectedFrame: string
  timer: 3 | 5 | 10
  layout: LayoutSettings
  frameOptions: FrameOptions
  cameraMode: CameraMode
  swap: boolean
  cameraSettings: CameraSettings
  shotDelay: number
  timerSound: boolean
  flash: boolean
}

export type SharedSetupPatch =
  | { selectedGrid: string }
  | { selectedFrame: string }
  | { timer: 3 | 5 | 10 }
  | { layout: LayoutSettings }
  | { frameOptions: FrameOptions }
  | { cameraMode: CameraMode }
  | { swap: boolean }
  | { cameraSettings: CameraSettings }
  | { shotDelay: number }
  | { timerSound: boolean }
  | { flash: boolean }

export const DEFAULT_SHARED_SETUP: SharedSetupSettings = {
  selectedGrid: 'ig-square-4',
  selectedFrame: 'clean-white',
  timer: 5,
  layout: { gap: 8, padding: 16, radius: 8, background: '#ffffff' },
  frameOptions: {
    caption: '',
    borderColor: '#1f5fad',
    borderWidth: 0,
    showDate: false,
    showRoom: false,
  },
  cameraMode: 'user',
  swap: false,
  cameraSettings: {
    mirror: true,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    warmth: 0,
    zoom: 1,
    fit: 'cover',
    filter: 'original',
  },
  shotDelay: 2,
  timerSound: true,
  flash: true,
}

const gridIds = new Set(GRID_PRESETS.map((preset) => preset.id))
const frameIds = new Set(FRAME_PRESETS.map((preset) => preset.id))
const timers = new Set<number>([3, 5, 10])
const cameraModes = new Set<CameraMode>(['user', 'partner', 'split', 'alternate'])
const cameraFits = new Set<CameraSettings['fit']>(['cover', 'contain', 'fill'])
const cameraFilters = new Set(CAMERA_FILTERS.map((filter) => filter.id))
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

function isBoundedNumber(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  )
}

export function isFrameOptions(value: unknown): value is FrameOptions {
  if (!isRecord(value) || Object.keys(value).length !== 5) return false
  return (
    typeof value.caption === 'string' &&
    value.caption.length <= 30 &&
    typeof value.borderColor === 'string' &&
    backgroundPattern.test(value.borderColor) &&
    isBoundedNumber(value.borderWidth, 0, 24) &&
    typeof value.showDate === 'boolean' &&
    typeof value.showRoom === 'boolean'
  )
}

export function isCameraSettings(value: unknown): value is CameraSettings {
  if (!isRecord(value) || Object.keys(value).length !== 8) return false
  return (
    typeof value.mirror === 'boolean' &&
    isBoundedNumber(value.brightness, 0.5, 1.5) &&
    isBoundedNumber(value.contrast, 0.5, 1.5) &&
    isBoundedNumber(value.saturation, 0, 2) &&
    isBoundedNumber(value.warmth, -50, 50) &&
    isBoundedNumber(value.zoom, 1, 1.8) &&
    cameraFits.has(value.fit as CameraSettings['fit']) &&
    typeof value.filter === 'string' &&
    cameraFilters.has(value.filter)
  )
}

export function parseSharedSetup(value: Json): SharedSetupSettings {
  if (!isRecord(value)) return DEFAULT_SHARED_SETUP
  const layout = value.layout
  const frameOptions = value.frameOptions
  const cameraSettings = value.cameraSettings
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
    frameOptions: isFrameOptions(frameOptions)
      ? {
          caption: frameOptions.caption,
          borderColor: frameOptions.borderColor,
          borderWidth: frameOptions.borderWidth,
          showDate: frameOptions.showDate,
          showRoom: frameOptions.showRoom,
        }
      : { ...DEFAULT_SHARED_SETUP.frameOptions },
    cameraMode:
      typeof value.cameraMode === 'string' &&
      cameraModes.has(value.cameraMode as CameraMode)
        ? (value.cameraMode as CameraMode)
        : DEFAULT_SHARED_SETUP.cameraMode,
    swap: typeof value.swap === 'boolean' ? value.swap : DEFAULT_SHARED_SETUP.swap,
    cameraSettings: isCameraSettings(cameraSettings)
      ? {
          mirror: cameraSettings.mirror,
          brightness: cameraSettings.brightness,
          contrast: cameraSettings.contrast,
          saturation: cameraSettings.saturation,
          warmth: cameraSettings.warmth,
          zoom: cameraSettings.zoom,
          fit: cameraSettings.fit,
          filter: cameraSettings.filter,
        }
      : { ...DEFAULT_SHARED_SETUP.cameraSettings },
    shotDelay: isBoundedNumber(value.shotDelay, 1, 5)
      ? value.shotDelay
      : DEFAULT_SHARED_SETUP.shotDelay,
    timerSound:
      typeof value.timerSound === 'boolean'
        ? value.timerSound
        : DEFAULT_SHARED_SETUP.timerSound,
    flash:
      typeof value.flash === 'boolean' ? value.flash : DEFAULT_SHARED_SETUP.flash,
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
  if ('frameOptions' in value) return isFrameOptions(value.frameOptions)
  if ('cameraMode' in value) {
    return (
      typeof value.cameraMode === 'string' &&
      cameraModes.has(value.cameraMode as CameraMode)
    )
  }
  if ('swap' in value) return typeof value.swap === 'boolean'
  if ('cameraSettings' in value) return isCameraSettings(value.cameraSettings)
  if ('shotDelay' in value) {
    return isBoundedNumber(value.shotDelay, 1, 5)
  }
  if ('timerSound' in value) return typeof value.timerSound === 'boolean'
  if ('flash' in value) return typeof value.flash === 'boolean'
  return false
}

export function isSharedSetupSettings(
  value: unknown,
): value is SharedSetupSettings {
  if (!isRecord(value) || Object.keys(value).length !== 11) return false
  return (
    isSharedSetupPatch({ selectedGrid: value.selectedGrid }) &&
    isSharedSetupPatch({ selectedFrame: value.selectedFrame }) &&
    isSharedSetupPatch({ timer: value.timer }) &&
    isSharedSetupPatch({ layout: value.layout }) &&
    isSharedSetupPatch({ frameOptions: value.frameOptions }) &&
    isSharedSetupPatch({ cameraMode: value.cameraMode }) &&
    isSharedSetupPatch({ swap: value.swap }) &&
    isSharedSetupPatch({ cameraSettings: value.cameraSettings }) &&
    isSharedSetupPatch({ shotDelay: value.shotDelay }) &&
    isSharedSetupPatch({ timerSound: value.timerSound }) &&
    isSharedSetupPatch({ flash: value.flash })
  )
}

export function applySharedSetupPatch(
  settings: SharedSetupSettings,
  patch: SharedSetupPatch,
): SharedSetupSettings {
  if ('selectedGrid' in patch) return { ...settings, selectedGrid: patch.selectedGrid }
  if ('selectedFrame' in patch) return { ...settings, selectedFrame: patch.selectedFrame }
  if ('timer' in patch) return { ...settings, timer: patch.timer }
  if ('layout' in patch) return { ...settings, layout: { ...patch.layout } }
  if ('frameOptions' in patch) {
    return { ...settings, frameOptions: { ...patch.frameOptions } }
  }
  if ('cameraMode' in patch) return { ...settings, cameraMode: patch.cameraMode }
  if ('swap' in patch) return { ...settings, swap: patch.swap }
  if ('cameraSettings' in patch) {
    return { ...settings, cameraSettings: { ...patch.cameraSettings } }
  }
  if ('shotDelay' in patch) return { ...settings, shotDelay: patch.shotDelay }
  if ('timerSound' in patch) return { ...settings, timerSound: patch.timerSound }
  return { ...settings, flash: patch.flash }
}

export function selectSharedSetup(state: BlueboothState): SharedSetupSettings {
  return {
    selectedGrid: state.selectedGrid,
    selectedFrame: state.selectedFrame,
    timer: state.timer,
    layout: { ...state.layout },
    frameOptions: { ...state.frameOptions },
    cameraMode: state.cameraMode,
    swap: state.swap,
    cameraSettings: { ...state.cameraSettings },
    shotDelay: state.shotDelay,
    timerSound: state.timerSound,
    flash: state.flash,
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
    frameOptions: { ...settings.frameOptions },
    cameraMode: settings.cameraMode,
    swap: settings.swap,
    cameraSettings: { ...settings.cameraSettings },
    shotDelay: settings.shotDelay,
    timerSound: settings.timerSound,
    flash: settings.flash,
  }
}
