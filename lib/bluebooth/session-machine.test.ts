import { describe, expect, it } from 'vitest'
import {
  initialLocalSessionState,
  localSessionReducer,
  type LocalSessionAction,
} from '@/lib/bluebooth/session-machine'

function reduce(actions: LocalSessionAction[]) {
  return actions.reduce(localSessionReducer, initialLocalSessionState)
}

describe('local session state machine', () => {
  it('moves through countdown, capture, spacing, and completion', () => {
    const state = reduce([
      { type: 'start', total: 1, countdown: 1 },
      { type: 'tick' },
      { type: 'capture' },
      { type: 'captured' },
      { type: 'advance' },
    ])
    expect(state.phase).toBe('completed')
  })

  it('ignores duplicate capture transitions', () => {
    const state = reduce([
      { type: 'start', total: 1, countdown: 0 },
      { type: 'capture' },
      { type: 'capture' },
    ])
    expect(state.phase).toBe('capturing')
  })

  it('pauses and resumes the current deterministic phase', () => {
    const paused = reduce([
      { type: 'start', total: 2, countdown: 3 },
      { type: 'pause' },
    ])
    expect(paused.phase).toBe('paused')
    expect(localSessionReducer(paused, { type: 'resume' }).phase).toBe('countdown')
  })

  it('completes an individual retake without advancing other slots', () => {
    const state = reduce([
      { type: 'start', total: 4, countdown: 0, retakeIndex: 2 },
      { type: 'capture' },
      { type: 'captured' },
      { type: 'advance' },
    ])
    expect(state).toMatchObject({ phase: 'completed', shotIndex: 2, retakeIndex: 2 })
  })
})
