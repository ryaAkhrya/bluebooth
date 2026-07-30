import { describe, expect, it } from 'vitest'
import {
  isSignalForPeer,
  isWebRtcSignal,
  mapWebRtcConnectionState,
  webRtcRetryDelay,
} from '@/lib/bluebooth/webrtc'

const envelope = {
  eventId: '11111111-1111-4111-8111-111111111111',
  roomId: '22222222-2222-4222-8222-222222222222',
  senderUserId: '33333333-3333-4333-8333-333333333333',
  targetUserId: '44444444-4444-4444-8444-444444444444',
  generationId: '55555555-5555-4555-8555-555555555555',
  sentAt: '2026-07-30T10:00:00.000Z',
}

describe('WebRTC signaling contracts', () => {
  it('accepts bounded targeted signaling payloads', () => {
    expect(
      isWebRtcSignal({
        ...envelope,
        type: 'webrtc:offer',
        payload: { sdp: 'v=0\r\n' },
      }),
    ).toBe(true)
    expect(
      isWebRtcSignal({
        ...envelope,
        type: 'webrtc:ice',
        payload: {
          candidate: 'candidate:1 1 udp 1 192.0.2.1 5000 typ host',
          sdpMid: '0',
          sdpMLineIndex: 0,
          usernameFragment: null,
        },
      }),
    ).toBe(true)
  })

  it('rejects binary/media-shaped and oversized signaling data', () => {
    expect(
      isWebRtcSignal({
        ...envelope,
        type: 'webrtc:offer',
        payload: { image: 'data:image/png;base64,not-signaling' },
      }),
    ).toBe(false)
    expect(
      isWebRtcSignal({
        ...envelope,
        type: 'webrtc:ice',
        payload: {
          candidate: 'x'.repeat(4_097),
          sdpMid: null,
          sdpMLineIndex: null,
          usernameFragment: null,
        },
      }),
    ).toBe(false)
  })

  it('requires the durable room peer and explicit target', () => {
    const signal = { ...envelope, type: 'webrtc:ready' } as const
    expect(
      isSignalForPeer(
        signal,
        envelope.roomId,
        envelope.targetUserId,
        envelope.senderUserId,
      ),
    ).toBe(true)
    expect(
      isSignalForPeer(signal, envelope.roomId, envelope.senderUserId, envelope.targetUserId),
    ).toBe(false)
  })

  it('maps browser states and bounds retry timing', () => {
    expect(mapWebRtcConnectionState('connected', 'connected')).toBe('connected')
    expect(mapWebRtcConnectionState('connecting', 'disconnected')).toBe('disconnected')
    expect(mapWebRtcConnectionState('failed', 'failed')).toBe('failed')
    expect([webRtcRetryDelay(0), webRtcRetryDelay(1), webRtcRetryDelay(9)]).toEqual([
      1_500,
      3_000,
      6_000,
    ])
  })
})
