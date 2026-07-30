export type WebRtcConnectionState =
  | 'idle'
  | 'waiting-for-peer'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'retrying'
  | 'closed'
  | 'unsupported'

export type WebRtcStatusSignalState = 'connecting' | 'connected' | 'disconnected' | 'failed'

interface WebRtcSignalEnvelope {
  eventId: string
  roomId: string
  senderUserId: string
  targetUserId: string
  generationId: string
  sentAt: string
}

export interface WebRtcReadySignal extends WebRtcSignalEnvelope {
  type: 'webrtc:ready'
}

export interface WebRtcOfferSignal extends WebRtcSignalEnvelope {
  type: 'webrtc:offer'
  payload: { sdp: string }
}

export interface WebRtcAnswerSignal extends WebRtcSignalEnvelope {
  type: 'webrtc:answer'
  payload: { sdp: string }
}

export interface WebRtcIceSignal extends WebRtcSignalEnvelope {
  type: 'webrtc:ice'
  payload: {
    candidate: string
    sdpMid: string | null
    sdpMLineIndex: number | null
    usernameFragment: string | null
  }
}

export interface WebRtcRestartSignal extends WebRtcSignalEnvelope {
  type: 'webrtc:restart'
}

export interface WebRtcStatusSignal extends WebRtcSignalEnvelope {
  type: 'webrtc:status'
  payload: { state: WebRtcStatusSignalState }
}

export interface WebRtcByeSignal extends WebRtcSignalEnvelope {
  type: 'webrtc:bye'
}

export type WebRtcSignal =
  | WebRtcReadySignal
  | WebRtcOfferSignal
  | WebRtcAnswerSignal
  | WebRtcIceSignal
  | WebRtcRestartSignal
  | WebRtcStatusSignal
  | WebRtcByeSignal

export type WebRtcSignalType = WebRtcSignal['type']
