export type ActiveSessionPhase =
  | 'idle'
  | 'countdown'
  | 'capturing'
  | 'betweenShots'
  | 'paused'
  | 'completed'
  | 'cancelled'

export interface LocalSessionState {
  phase: ActiveSessionPhase
  resumePhase: 'countdown' | 'betweenShots' | null
  shotIndex: number
  total: number
  countdown: number
  countdownStart: number
  retakeIndex: number | null
}

export type LocalSessionAction =
  | { type: 'start'; total: number; countdown: number; retakeIndex?: number | null }
  | { type: 'tick' }
  | { type: 'capture' }
  | { type: 'captured' }
  | { type: 'advance' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'cancel' }

export const initialLocalSessionState: LocalSessionState = {
  phase: 'idle',
  resumePhase: null,
  shotIndex: 0,
  total: 0,
  countdown: 0,
  countdownStart: 0,
  retakeIndex: null,
}

export function localSessionReducer(
  state: LocalSessionState,
  action: LocalSessionAction,
): LocalSessionState {
  switch (action.type) {
    case 'start': {
      const retakeIndex = action.retakeIndex ?? null
      const shotIndex = retakeIndex ?? 0
      return {
        phase: action.total > 0 ? 'countdown' : 'completed',
        resumePhase: null,
        shotIndex,
        total: Math.max(0, action.total),
        countdown: Math.max(0, action.countdown),
        countdownStart: Math.max(0, action.countdown),
        retakeIndex,
      }
    }
    case 'tick':
      return state.phase === 'countdown'
        ? { ...state, countdown: Math.max(0, state.countdown - 1) }
        : state
    case 'capture':
      return state.phase === 'countdown' && state.countdown === 0
        ? { ...state, phase: 'capturing' }
        : state
    case 'captured':
      return state.phase === 'capturing' ? { ...state, phase: 'betweenShots' } : state
    case 'advance':
      if (state.phase !== 'betweenShots') return state
      if (state.retakeIndex !== null || state.shotIndex + 1 >= state.total) {
        return { ...state, phase: 'completed' }
      }
      return {
        ...state,
        phase: 'countdown',
        shotIndex: state.shotIndex + 1,
        countdown: state.countdownStart,
      }
    case 'pause':
      return state.phase === 'countdown' || state.phase === 'betweenShots'
        ? { ...state, phase: 'paused', resumePhase: state.phase }
        : state
    case 'resume':
      return state.phase === 'paused' && state.resumePhase
        ? { ...state, phase: state.resumePhase, resumePhase: null }
        : state
    case 'cancel':
      return state.phase === 'completed' || state.phase === 'cancelled'
        ? state
        : { ...state, phase: 'cancelled', resumePhase: null }
  }
}
