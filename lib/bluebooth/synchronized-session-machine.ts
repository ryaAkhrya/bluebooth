import type {
  CaptureEvent,
  CaptureOperationStatus,
  CaptureSessionStatus,
} from '@/types/capture'

const maximumRememberedEvents = 128

export interface SynchronizedSessionState {
  sessionId: string | null
  revision: number
  phase: CaptureSessionStatus | 'idle'
  shotIndex: number
  shotCount: number
  captureAt: string | null
  readiness: Record<string, boolean>
  completedUsers: string[]
  processedEventIds: string[]
  operation: CaptureOperationStatus
  error: string | null
  needsRefresh: boolean
}

export const initialSynchronizedSessionState: SynchronizedSessionState = {
  sessionId: null,
  revision: 0,
  phase: 'idle',
  shotIndex: 0,
  shotCount: 0,
  captureAt: null,
  readiness: {},
  completedUsers: [],
  processedEventIds: [],
  operation: 'idle',
  error: null,
  needsRefresh: false,
}

export type SynchronizedSessionAction =
  | {
      type: 'hydrate'
      sessionId: string
      revision: number
      phase: CaptureSessionStatus
      shotIndex: number
      shotCount: number
      captureAt: string | null
    }
  | { type: 'event'; event: CaptureEvent }
  | { type: 'operation'; operation: CaptureOperationStatus; error?: string | null }
  | { type: 'reset' }

function rememberEvent(state: SynchronizedSessionState, eventId: string): string[] {
  return [...state.processedEventIds, eventId].slice(-maximumRememberedEvents)
}

export function synchronizedSessionReducer(
  state: SynchronizedSessionState,
  action: SynchronizedSessionAction,
): SynchronizedSessionState {
  if (action.type === 'reset') return initialSynchronizedSessionState
  if (action.type === 'operation') {
    return {
      ...state,
      operation: action.operation,
      error: action.error ?? null,
    }
  }
  if (action.type === 'hydrate') {
    return {
      ...state,
      sessionId: action.sessionId,
      revision: action.revision,
      phase: action.phase,
      shotIndex: action.shotIndex,
      shotCount: action.shotCount,
      captureAt: action.captureAt,
      readiness: action.revision === state.revision ? state.readiness : {},
      completedUsers: action.revision === state.revision ? state.completedUsers : [],
      needsRefresh: false,
      error: null,
    }
  }

  const event = action.event
  if (
    state.processedEventIds.includes(event.eventId) ||
    (state.sessionId && event.sessionId !== state.sessionId) ||
    event.revision < state.revision
  ) {
    return state
  }
  if (event.revision > state.revision + 1) {
    return {
      ...state,
      processedEventIds: rememberEvent(state, event.eventId),
      needsRefresh: true,
    }
  }

  const next: SynchronizedSessionState = {
    ...state,
    sessionId: event.sessionId,
    revision: Math.max(state.revision, event.revision),
    processedEventIds: rememberEvent(state, event.eventId),
    needsRefresh: false,
  }
  if (event.type === 'capture:prepare') {
    return {
      ...next,
      phase: 'waiting-for-ready',
      shotIndex: event.payload.shotIndex,
      shotCount: event.payload.shotCount,
      captureAt: null,
      readiness: {},
      completedUsers: [],
    }
  }
  if (event.type === 'capture:ready-ack') {
    return {
      ...next,
      readiness: {
        ...state.readiness,
        [event.senderUserId]: event.payload.cameraReady,
      },
    }
  }
  if (event.type === 'capture:start' || event.type === 'capture:tick') {
    return {
      ...next,
      phase: 'countdown',
      shotIndex: event.payload.shotIndex,
      captureAt: event.payload.captureAt,
      completedUsers: [],
    }
  }
  if (event.type === 'capture:complete') {
    return {
      ...next,
      completedUsers: state.completedUsers.includes(event.payload.userId)
        ? state.completedUsers
        : [...state.completedUsers, event.payload.userId],
    }
  }
  if (event.type === 'capture:cancel') {
    return { ...next, phase: 'cancelled', captureAt: null }
  }
  if (event.type === 'capture:retake' && !event.payload.request) {
    return {
      ...next,
      phase: 'waiting-for-ready',
      shotIndex: event.payload.shotIndex ?? 0,
      captureAt: null,
      readiness: {},
      completedUsers: [],
    }
  }
  if (event.type === 'capture:result-ready') {
    return { ...next, phase: 'completed' }
  }
  return next
}
