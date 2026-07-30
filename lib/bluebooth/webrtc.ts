import type {
  WebRtcConnectionState,
  WebRtcSignal,
  WebRtcSignalType,
} from '@/types/webrtc'

export const WEBRTC_SIGNAL_TYPES: readonly WebRtcSignalType[] = [
  'webrtc:ready',
  'webrtc:offer',
  'webrtc:answer',
  'webrtc:ice',
  'webrtc:restart',
  'webrtc:status',
  'webrtc:bye',
]

export const DEFAULT_RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const maxSdpLength = 65_536
const maxCandidateLength = 4_096
const statusStates = new Set(['connecting', 'connected', 'disconnected', 'failed'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string' && uuidPattern.test(value)
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function hasEnvelope(value: Record<string, unknown>): boolean {
  return (
    isUuid(value.eventId) &&
    isUuid(value.roomId) &&
    isUuid(value.senderUserId) &&
    isUuid(value.targetUserId) &&
    isUuid(value.generationId) &&
    isIsoDate(value.sentAt)
  )
}

export function isWebRtcSignal(value: unknown): value is WebRtcSignal {
  if (!isRecord(value) || !hasEnvelope(value)) return false
  if (
    typeof value.type !== 'string' ||
    !WEBRTC_SIGNAL_TYPES.includes(value.type as WebRtcSignalType)
  ) {
    return false
  }
  if (
    value.type === 'webrtc:ready' ||
    value.type === 'webrtc:restart' ||
    value.type === 'webrtc:bye'
  ) {
    return !('payload' in value)
  }
  if (!isRecord(value.payload)) return false
  if (value.type === 'webrtc:offer' || value.type === 'webrtc:answer') {
    return (
      typeof value.payload.sdp === 'string' &&
      value.payload.sdp.length > 0 &&
      value.payload.sdp.length <= maxSdpLength
    )
  }
  if (value.type === 'webrtc:ice') {
    return (
      typeof value.payload.candidate === 'string' &&
      value.payload.candidate.length > 0 &&
      value.payload.candidate.length <= maxCandidateLength &&
      (value.payload.sdpMid === null || typeof value.payload.sdpMid === 'string') &&
      (value.payload.sdpMLineIndex === null ||
        (typeof value.payload.sdpMLineIndex === 'number' &&
          Number.isSafeInteger(value.payload.sdpMLineIndex) &&
          value.payload.sdpMLineIndex >= 0)) &&
      (value.payload.usernameFragment === null ||
        typeof value.payload.usernameFragment === 'string')
    )
  }
  return (
    value.type === 'webrtc:status' &&
    typeof value.payload.state === 'string' &&
    statusStates.has(value.payload.state)
  )
}

export function isSignalForPeer(
  signal: WebRtcSignal,
  roomId: string,
  currentUserId: string,
  peerUserId: string,
): boolean {
  return (
    signal.roomId === roomId &&
    signal.targetUserId === currentUserId &&
    signal.senderUserId === peerUserId
  )
}

export function mapWebRtcConnectionState(
  connectionState: RTCPeerConnectionState,
  iceState: RTCIceConnectionState,
): WebRtcConnectionState {
  if (connectionState === 'closed') return 'closed'
  if (connectionState === 'failed' || iceState === 'failed') return 'failed'
  if (connectionState === 'connected' || iceState === 'connected' || iceState === 'completed') {
    return 'connected'
  }
  if (connectionState === 'disconnected' || iceState === 'disconnected') {
    return 'disconnected'
  }
  return 'connecting'
}

export function webRtcRetryDelay(attempt: number): number {
  return [1_500, 3_000, 6_000][Math.min(Math.max(attempt, 0), 2)]
}

export function iceCandidatePayload(candidate: RTCIceCandidate): {
  candidate: string
  sdpMid: string | null
  sdpMLineIndex: number | null
  usernameFragment: string | null
} {
  return {
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
    usernameFragment: candidate.usernameFragment,
  }
}
