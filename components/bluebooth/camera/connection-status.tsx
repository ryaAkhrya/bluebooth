'use client'

import type { WebRtcConnectionState } from '@/types/webrtc'

const labels: Record<WebRtcConnectionState, string> = {
  idle: 'Partner camera idle',
  'waiting-for-peer': 'Waiting for partner camera',
  connecting: 'Connecting partner camera…',
  connected: 'Partner camera connected',
  disconnected: 'Partner camera disconnected',
  failed: 'Partner camera unavailable',
  retrying: 'Retrying partner camera…',
  closed: 'Partner camera closed',
  unsupported: 'Partner camera is not supported in this browser',
}

export function ConnectionStatus({
  state,
  onRetry,
  compact = false,
}: {
  state: WebRtcConnectionState
  onRetry: () => void
  compact?: boolean
}) {
  const retryable = state === 'disconnected' || state === 'failed'

  return (
    <div
      className={`bb-peer-status is-${state}${compact ? ' is-compact' : ''}`}
      role={state === 'failed' || state === 'unsupported' ? 'alert' : 'status'}
    >
      <span>{labels[state]}</span>
      {retryable && (
        <button className="bb-text-button" type="button" onClick={onRetry}>
          Retry
        </button>
      )}
      {process.env.NODE_ENV !== 'production' && state !== 'unsupported' && (
        <small>Development uses STUN only; production needs TURN.</small>
      )}
    </div>
  )
}
