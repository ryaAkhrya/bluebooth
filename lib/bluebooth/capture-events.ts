import type {
  CaptureEvent,
  CaptureEventType,
  FrozenCaptureConfiguration,
  ResolvedSlotImage,
  SharedCaptureUrls,
  SlotCaptureSource,
} from '@/types/capture'
import type { BlueboothState, CustomFrame } from '@/types/bluebooth'
import type { Json } from '@/types/database'
import { parseSharedSetup } from '@/lib/bluebooth/shared-settings'

export const CAPTURE_EVENT_TYPES: readonly CaptureEventType[] = [
  'capture:prepare',
  'capture:ready-ack',
  'capture:start',
  'capture:tick',
  'capture:complete',
  'capture:cancel',
  'capture:retake',
  'capture:result-ready',
]

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value)
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function isShotIndex(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 63
}

export function isCaptureEvent(value: unknown): value is CaptureEvent {
  if (
    !isRecord(value) ||
    !isUuid(value.eventId) ||
    !isUuid(value.roomId) ||
    !isUuid(value.sessionId) ||
    !isUuid(value.senderUserId) ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 0 ||
    !isTimestamp(value.sentAt) ||
    typeof value.type !== 'string' ||
    !CAPTURE_EVENT_TYPES.includes(value.type as CaptureEventType)
  ) {
    return false
  }
  if (value.type === 'capture:cancel' || value.type === 'capture:result-ready') {
    return !('payload' in value)
  }
  if (!isRecord(value.payload)) return false
  if (value.type === 'capture:prepare') {
    return (
      Number.isInteger(value.payload.shotCount) &&
      Number(value.payload.shotCount) >= 1 &&
      Number(value.payload.shotCount) <= 64 &&
      isShotIndex(value.payload.shotIndex)
    )
  }
  if (value.type === 'capture:ready-ack') {
    return typeof value.payload.cameraReady === 'boolean'
  }
  if (value.type === 'capture:start' || value.type === 'capture:tick') {
    return isShotIndex(value.payload.shotIndex) && isTimestamp(value.payload.captureAt)
  }
  if (value.type === 'capture:complete') {
    return isShotIndex(value.payload.shotIndex) && isUuid(value.payload.userId)
  }
  return (
    value.type === 'capture:retake' &&
    (value.payload.shotIndex === null || isShotIndex(value.payload.shotIndex)) &&
    typeof value.payload.request === 'boolean'
  )
}

export function countdownSeconds(captureAt: string | null, now: number): number | null {
  if (!captureAt) return null
  const target = Date.parse(captureAt)
  if (!Number.isFinite(target)) return null
  return Math.max(0, Math.ceil((target - now) / 1000))
}

export function captureIsDue(captureAt: string | null, now: number): boolean {
  if (!captureAt) return false
  const target = Date.parse(captureAt)
  return Number.isFinite(target) && now >= target
}

export function selectFrozenCaptureConfiguration(
  state: BlueboothState,
): FrozenCaptureConfiguration {
  return {
    selectedGrid: state.selectedGrid,
    selectedFrame: state.selectedFrame,
    layout: { ...state.layout },
    frameOptions: { ...state.frameOptions },
    cameraMode: state.cameraMode,
    cameraSettings: { ...state.cameraSettings },
    swap: state.swap,
    timer: state.timer,
    shotDelay: state.shotDelay,
    customFrame: state.customFrame ? { ...state.customFrame } : null,
    customFrameStoragePath: null,
  }
}

export function parseFrozenCaptureConfiguration(
  value: Json,
  fallback: FrozenCaptureConfiguration,
): FrozenCaptureConfiguration {
  if (!isRecord(value)) return fallback
  const shared = parseSharedSetup(value)
  const frameOptions = isRecord(value.frameOptions) ? value.frameOptions : {}
  const cameraMode =
    value.cameraMode === 'user' ||
    value.cameraMode === 'partner' ||
    value.cameraMode === 'split' ||
    value.cameraMode === 'alternate'
      ? value.cameraMode
      : fallback.cameraMode
  const customFrameValue = isRecord(value.customFrame) ? value.customFrame : null
  const customFrame: CustomFrame | null =
    customFrameValue &&
    typeof customFrameValue.id === 'string' &&
    typeof customFrameValue.name === 'string' &&
    typeof customFrameValue.width === 'number' &&
    typeof customFrameValue.height === 'number' &&
    typeof customFrameValue.opacity === 'number' &&
    typeof customFrameValue.scale === 'number' &&
    typeof customFrameValue.x === 'number' &&
    typeof customFrameValue.y === 'number' &&
    (customFrameValue.fit === 'cover' ||
      customFrameValue.fit === 'contain' ||
      customFrameValue.fit === 'fill') &&
    typeof customFrameValue.front === 'boolean'
      ? {
          id: customFrameValue.id,
          name: customFrameValue.name.slice(0, 120),
          width: customFrameValue.width,
          height: customFrameValue.height,
          opacity: customFrameValue.opacity,
          scale: customFrameValue.scale,
          x: customFrameValue.x,
          y: customFrameValue.y,
          fit: customFrameValue.fit as CustomFrame['fit'],
          front: customFrameValue.front,
        }
      : null
  return {
    selectedGrid: shared.selectedGrid,
    selectedFrame: shared.selectedFrame,
    timer: shared.timer,
    layout: shared.layout,
    cameraMode,
    cameraSettings: { ...shared.cameraSettings },
    swap: typeof value.swap === 'boolean' ? value.swap : fallback.swap,
    shotDelay:
      typeof value.shotDelay === 'number' &&
      Number.isFinite(value.shotDelay) &&
      value.shotDelay >= 0 &&
      value.shotDelay <= 10
        ? value.shotDelay
        : fallback.shotDelay,
    customFrame,
    customFrameStoragePath:
      typeof value.customFrameStoragePath === 'string'
        ? value.customFrameStoragePath
        : null,
    creativeMode:
      value.creativeMode === 'creative' || value.creativeMode === 'quick'
        ? value.creativeMode
        : fallback.creativeMode ?? 'quick',
    creativeTarget:
      value.creativeTarget === 'unlimited' ||
      value.creativeTarget === 4 ||
      value.creativeTarget === 6 ||
      value.creativeTarget === 8 ||
      value.creativeTarget === 10 ||
      value.creativeTarget === 12
        ? value.creativeTarget
        : fallback.creativeTarget ?? 8,
    frameOptions: {
      caption:
        typeof frameOptions.caption === 'string'
          ? frameOptions.caption.slice(0, 120)
          : fallback.frameOptions.caption,
      borderColor:
        typeof frameOptions.borderColor === 'string' &&
        /^#[0-9a-f]{6}$/i.test(frameOptions.borderColor)
          ? frameOptions.borderColor
          : fallback.frameOptions.borderColor,
      borderWidth:
        typeof frameOptions.borderWidth === 'number' &&
        Number.isFinite(frameOptions.borderWidth) &&
        frameOptions.borderWidth >= 0 &&
        frameOptions.borderWidth <= 20
          ? frameOptions.borderWidth
          : fallback.frameOptions.borderWidth,
      showDate:
        typeof frameOptions.showDate === 'boolean'
          ? frameOptions.showDate
          : fallback.frameOptions.showDate,
      showRoom:
        typeof frameOptions.showRoom === 'boolean'
          ? frameOptions.showRoom
          : fallback.frameOptions.showRoom,
    },
  }
}

function swappedRole(
  role: 'host' | 'partner',
  swap: boolean,
): 'host' | 'partner' {
  if (!swap) return role
  return role === 'host' ? 'partner' : 'host'
}

export function resolveSlotCaptureSources(
  configuration: Pick<FrozenCaptureConfiguration, 'cameraMode' | 'swap'>,
  slotCount: number,
): SlotCaptureSource[] {
  return Array.from({ length: Math.max(0, slotCount) }, (_, index) => {
    if (configuration.cameraMode === 'split') {
      return {
        kind: 'split',
        left: swappedRole('host', configuration.swap),
        right: swappedRole('partner', configuration.swap),
      }
    }
    const role =
      configuration.cameraMode === 'partner'
        ? 'partner'
        : configuration.cameraMode === 'alternate' && index % 2 === 1
          ? 'partner'
          : 'host'
    return { kind: 'single', role: swappedRole(role, configuration.swap) }
  })
}

export function resolveCapturedSlotImages(
  configuration: Pick<FrozenCaptureConfiguration, 'cameraMode' | 'swap'>,
  slotCount: number,
  captures: SharedCaptureUrls,
): ResolvedSlotImage[] {
  return resolveSlotCaptureSources(configuration, slotCount).map((source, index) => {
    const shot = captures[index]
    if (source.kind === 'single') return shot?.[source.role] ?? null
    const left = shot?.[source.left]
    const right = shot?.[source.right]
    return left && right ? { left, right } : null
  })
}
