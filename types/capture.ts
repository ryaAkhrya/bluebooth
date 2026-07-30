import type {
  CameraMode,
  CameraSettings,
  CustomFrame,
  FrameOptions,
  LayoutSettings,
} from '@/types/bluebooth'

export type CaptureSessionStatus =
  | 'preparing'
  | 'waiting-for-ready'
  | 'countdown'
  | 'capturing'
  | 'waiting-for-uploads'
  | 'review'
  | 'retake-countdown'
  | 'completed'
  | 'cancelled'

export interface FrozenCaptureConfiguration {
  selectedGrid: string
  selectedFrame: string
  layout: LayoutSettings
  frameOptions: FrameOptions
  cameraMode: CameraMode
  cameraSettings: CameraSettings
  swap: boolean
  timer: 3 | 5 | 10
  shotDelay: number
  customFrame: CustomFrame | null
  customFrameStoragePath: string | null
}

interface CaptureEventEnvelope {
  eventId: string
  roomId: string
  sessionId: string
  senderUserId: string
  revision: number
  sentAt: string
}

export interface CapturePrepareEvent extends CaptureEventEnvelope {
  type: 'capture:prepare'
  payload: {
    shotCount: number
    shotIndex: number
  }
}

export interface CaptureReadyAckEvent extends CaptureEventEnvelope {
  type: 'capture:ready-ack'
  payload: { cameraReady: boolean }
}

export interface CaptureStartEvent extends CaptureEventEnvelope {
  type: 'capture:start'
  payload: {
    shotIndex: number
    captureAt: string
  }
}

export interface CaptureTickEvent extends CaptureEventEnvelope {
  type: 'capture:tick'
  payload: {
    shotIndex: number
    captureAt: string
  }
}

export interface CaptureCompleteEvent extends CaptureEventEnvelope {
  type: 'capture:complete'
  payload: {
    shotIndex: number
    userId: string
  }
}

export interface CaptureCancelEvent extends CaptureEventEnvelope {
  type: 'capture:cancel'
}

export interface CaptureRetakeEvent extends CaptureEventEnvelope {
  type: 'capture:retake'
  payload: {
    shotIndex: number | null
    request: boolean
  }
}

export interface CaptureResultEvent extends CaptureEventEnvelope {
  type: 'capture:result-ready'
}

export type CaptureEvent =
  | CapturePrepareEvent
  | CaptureReadyAckEvent
  | CaptureStartEvent
  | CaptureTickEvent
  | CaptureCompleteEvent
  | CaptureCancelEvent
  | CaptureRetakeEvent
  | CaptureResultEvent

export type CaptureEventType = CaptureEvent['type']

export type SlotCaptureSource =
  | { kind: 'single'; role: 'host' | 'partner' }
  | { kind: 'split'; left: 'host' | 'partner'; right: 'host' | 'partner' }

export type ResolvedSlotImage =
  | string
  | { left: string; right: string }
  | null

export type SharedCaptureUrls = Record<
  number,
  Partial<Record<'host' | 'partner', string>>
>

export type CaptureOperationStatus =
  | 'idle'
  | 'preparing'
  | 'ready'
  | 'capturing'
  | 'uploading'
  | 'waiting'
  | 'error'
