'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_RTC_CONFIGURATION,
  iceCandidatePayload,
  isSignalForPeer,
  mapWebRtcConnectionState,
  webRtcRetryDelay,
} from '@/lib/bluebooth/webrtc'
import type { RoomConnectionStatus } from '@/types/room'
import type {
  WebRtcConnectionState,
  WebRtcSignal,
  WebRtcStatusSignalState,
} from '@/types/webrtc'

interface UseWebRtcPeerInput {
  enabled: boolean
  localStream: MediaStream | null
  roomId: string | null
  currentUserId: string | null
  peerUserId: string | null
  role: 'host' | 'partner' | null
  roomConnection: RoomConnectionStatus
  sendSignal: (signal: WebRtcSignal) => Promise<boolean>
  subscribeSignals: (listener: (signal: WebRtcSignal) => void) => () => void
}

interface CloseOptions {
  notify?: boolean
}

const maxQueuedCandidates = 64
const maxAutomaticRetries = 3

export function useWebRtcPeer(input: UseWebRtcPeerInput) {
  const {
    enabled,
    localStream,
    peerUserId,
    roomConnection,
    subscribeSignals,
  } = input
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [connectionState, setConnectionState] =
    useState<WebRtcConnectionState>('idle')
  const peerRef = useRef<RTCPeerConnection | null>(null)
  const activePeerUserIdRef = useRef<string | null>(null)
  const senderRef = useRef<RTCRtpSender | null>(null)
  const generationRef = useRef<string | null>(null)
  const readinessGenerationRef = useRef<string | null>(null)
  const queuedCandidatesRef = useRef<RTCIceCandidateInit[]>([])
  const earlyCandidatesRef = useRef(new Map<string, RTCIceCandidateInit[]>())
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryAttemptRef = useRef(0)
  const makingOfferRef = useRef(false)
  const mountedRef = useRef(true)
  const inputRef = useRef(input)
  const startOfferRef = useRef<(restart: boolean) => Promise<void>>(async () => {})
  const requestRetryRef = useRef<() => Promise<void>>(async () => {})

  useEffect(() => {
    inputRef.current = input
  }, [input])

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current)
    retryTimerRef.current = null
  }, [])

  const closePeerConnection = useCallback(() => {
    clearRetryTimer()
    const peer = peerRef.current
    if (peer) {
      peer.onicecandidate = null
      peer.ontrack = null
      peer.onconnectionstatechange = null
      peer.oniceconnectionstatechange = null
      peer.close()
    }
    peerRef.current = null
    activePeerUserIdRef.current = null
    senderRef.current = null
    generationRef.current = null
    queuedCandidatesRef.current = []
    earlyCandidatesRef.current.clear()
    makingOfferRef.current = false
    setRemoteStream(null)
  }, [clearRetryTimer])

  const envelope = useCallback((generationId: string) => {
    const current = inputRef.current
    if (!current.roomId || !current.currentUserId || !current.peerUserId) return null
    return {
      eventId: crypto.randomUUID(),
      roomId: current.roomId,
      senderUserId: current.currentUserId,
      targetUserId: current.peerUserId,
      generationId,
      sentAt: new Date().toISOString(),
    }
  }, [])

  const sendReady = useCallback(async () => {
    const generationId =
      readinessGenerationRef.current ?? crypto.randomUUID()
    readinessGenerationRef.current = generationId
    const base = envelope(generationId)
    if (!base) return false
    return inputRef.current.sendSignal({ ...base, type: 'webrtc:ready' })
  }, [envelope])

  const sendStatus = useCallback(
    async (state: WebRtcStatusSignalState) => {
      const generationId = generationRef.current
      if (!generationId) return false
      const base = envelope(generationId)
      if (!base) return false
      return inputRef.current.sendSignal({
        ...base,
        type: 'webrtc:status',
        payload: { state },
      })
    },
    [envelope],
  )

  const scheduleRetry = useCallback(() => {
    if (retryTimerRef.current || retryAttemptRef.current >= maxAutomaticRetries) {
      if (retryAttemptRef.current >= maxAutomaticRetries) setConnectionState('failed')
      return
    }
    const attempt = retryAttemptRef.current
    retryAttemptRef.current += 1
    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null
      if (!mountedRef.current) return
      setConnectionState('retrying')
      void requestRetryRef.current()
    }, webRtcRetryDelay(attempt))
  }, [])

  const createPeerConnection = useCallback(
    (generationId: string) => {
      closePeerConnection()
      const current = inputRef.current
      if (typeof RTCPeerConnection === 'undefined') return null
      const peer = new RTCPeerConnection(DEFAULT_RTC_CONFIGURATION)
      peerRef.current = peer
      activePeerUserIdRef.current = current.peerUserId
      generationRef.current = generationId
      const localTrack = current.localStream?.getVideoTracks()[0] ?? null
      if (localTrack && current.localStream) {
        senderRef.current = peer.addTrack(localTrack, current.localStream)
      }

      peer.onicecandidate = (event) => {
        const candidate = event.candidate
        const activeGeneration = generationRef.current
        const base = activeGeneration ? envelope(activeGeneration) : null
        if (!candidate || !base) return
        void inputRef.current.sendSignal({
          ...base,
          type: 'webrtc:ice',
          payload: iceCandidatePayload(candidate),
        })
      }
      peer.ontrack = (event) => {
        if (event.track.kind !== 'video') {
          event.track.stop()
          return
        }
        const stream = event.streams[0] ?? new MediaStream([event.track])
        setRemoteStream(stream)
      }

      const updateConnectionState = () => {
        if (peerRef.current !== peer) return
        const next = mapWebRtcConnectionState(
          peer.connectionState,
          peer.iceConnectionState,
        )
        setConnectionState(next)
        if (next === 'connected') {
          retryAttemptRef.current = 0
          clearRetryTimer()
          void sendStatus('connected')
        } else if (next === 'disconnected') {
          void sendStatus('disconnected')
          scheduleRetry()
        } else if (next === 'failed') {
          void sendStatus('failed')
          scheduleRetry()
        } else {
          void sendStatus('connecting')
        }
      }
      peer.onconnectionstatechange = updateConnectionState
      peer.oniceconnectionstatechange = updateConnectionState
      setConnectionState('connecting')
      return peer
    },
    [clearRetryTimer, closePeerConnection, envelope, scheduleRetry, sendStatus],
  )

  const flushCandidates = useCallback(async () => {
    const peer = peerRef.current
    if (!peer?.remoteDescription) return
    const candidates = queuedCandidatesRef.current
    queuedCandidatesRef.current = []
    for (const candidate of candidates) {
      if (peerRef.current !== peer) return
      await peer.addIceCandidate(candidate)
    }
  }, [])

  const startOffer = useCallback(
    async (restart: boolean) => {
      const current = inputRef.current
      const localTrack = current.localStream?.getVideoTracks()[0]
      if (
        current.role !== 'host' ||
        !localTrack ||
        current.roomConnection !== 'connected' ||
        makingOfferRef.current
      ) {
        return
      }
      makingOfferRef.current = true
      try {
        let peer = peerRef.current
        if (peer && peer.signalingState !== 'stable') return
        const generationId = crypto.randomUUID()
        if (!peer || peer.signalingState === 'closed') {
          peer = createPeerConnection(generationId)
        } else {
          generationRef.current = generationId
          queuedCandidatesRef.current = []
          if (restart) peer.restartIce()
        }
        if (!peer || peer.signalingState !== 'stable') return
        const offer = await peer.createOffer(restart ? { iceRestart: true } : undefined)
        if (peerRef.current !== peer || generationRef.current !== generationId) return
        await peer.setLocalDescription(offer)
        const base = envelope(generationId)
        if (!base || !peer.localDescription?.sdp) return
        await current.sendSignal({
          ...base,
          type: 'webrtc:offer',
          payload: { sdp: peer.localDescription.sdp },
        })
      } catch {
        setConnectionState('failed')
        scheduleRetry()
      } finally {
        makingOfferRef.current = false
      }
    },
    [createPeerConnection, envelope, scheduleRetry],
  )

  useEffect(() => {
    startOfferRef.current = startOffer
  }, [startOffer])

  const requestRetry = useCallback(async () => {
    const current = inputRef.current
    const generationId =
      generationRef.current ??
      readinessGenerationRef.current ??
      crypto.randomUUID()
    if (current.role === 'host') {
      await startOfferRef.current(true)
      return
    }
    const base = envelope(generationId)
    if (!base) return
    await current.sendSignal({ ...base, type: 'webrtc:restart' })
  }, [envelope])

  useEffect(() => {
    requestRetryRef.current = requestRetry
  }, [requestRetry])

  const handleSignal = useCallback(
    async (signal: WebRtcSignal) => {
      const current = inputRef.current
      if (
        !current.roomId ||
        !current.currentUserId ||
        !current.peerUserId ||
        !isSignalForPeer(
          signal,
          current.roomId,
          current.currentUserId,
          current.peerUserId,
        )
      ) {
        return
      }

      if (signal.type === 'webrtc:ready') {
        if (current.role === 'host') {
          const peer = peerRef.current
          if (peer?.connectionState === 'connected') return
          await startOfferRef.current(Boolean(peer))
        } else if (current.localStream?.getVideoTracks()[0]) {
          await sendReady()
        }
        return
      }
      if (signal.type === 'webrtc:bye') {
        closePeerConnection()
        setConnectionState('waiting-for-peer')
        return
      }
      if (signal.type === 'webrtc:restart') {
        if (current.role === 'host') await startOfferRef.current(true)
        return
      }
      if (signal.type === 'webrtc:status') {
        if (signal.payload.state === 'failed' || signal.payload.state === 'disconnected') {
          scheduleRetry()
        }
        return
      }
      if (signal.type === 'webrtc:offer') {
        if (current.role !== 'partner') return
        let peer = peerRef.current
        if (
          !peer ||
          peer.signalingState === 'closed' ||
          generationRef.current !== signal.generationId
        ) {
          peer = createPeerConnection(signal.generationId)
        }
        if (!peer) return
        generationRef.current = signal.generationId
        const early = earlyCandidatesRef.current.get(signal.generationId) ?? []
        earlyCandidatesRef.current.delete(signal.generationId)
        queuedCandidatesRef.current.push(...early)
        if (peer.signalingState !== 'stable') return
        await peer.setRemoteDescription({ type: 'offer', sdp: signal.payload.sdp })
        await flushCandidates()
        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        const base = envelope(signal.generationId)
        if (!base || !peer.localDescription?.sdp) return
        await current.sendSignal({
          ...base,
          type: 'webrtc:answer',
          payload: { sdp: peer.localDescription.sdp },
        })
        return
      }
      if (signal.type === 'webrtc:answer') {
        const peer = peerRef.current
        if (
          current.role !== 'host' ||
          !peer ||
          generationRef.current !== signal.generationId ||
          peer.signalingState !== 'have-local-offer'
        ) {
          return
        }
        await peer.setRemoteDescription({ type: 'answer', sdp: signal.payload.sdp })
        await flushCandidates()
        return
      }

      const candidate: RTCIceCandidateInit = signal.payload
      if (generationRef.current !== signal.generationId) {
        const early = earlyCandidatesRef.current.get(signal.generationId) ?? []
        if (early.length < maxQueuedCandidates) {
          early.push(candidate)
          earlyCandidatesRef.current.set(signal.generationId, early)
        }
        return
      }
      const peer = peerRef.current
      if (!peer?.remoteDescription) {
        if (queuedCandidatesRef.current.length < maxQueuedCandidates) {
          queuedCandidatesRef.current.push(candidate)
        }
        return
      }
      await peer.addIceCandidate(candidate)
    },
    [
      closePeerConnection,
      createPeerConnection,
      envelope,
      flushCandidates,
      scheduleRetry,
      sendReady,
    ],
  )

  useEffect(() => {
    if (!enabled) return
    return subscribeSignals((signal) => {
      void handleSignal(signal).catch(() => {
        setConnectionState('failed')
        scheduleRetry()
      })
    })
  }, [enabled, handleSignal, scheduleRetry, subscribeSignals])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
      if (!enabled) {
        closePeerConnection()
        setConnectionState('idle')
        return
      }
      if (typeof RTCPeerConnection === 'undefined') {
        closePeerConnection()
        setConnectionState('unsupported')
        return
      }
      if (!peerUserId) {
        closePeerConnection()
        setConnectionState('waiting-for-peer')
        return
      }
      if (
        activePeerUserIdRef.current &&
        activePeerUserIdRef.current !== peerUserId
      ) {
        closePeerConnection()
        setConnectionState('waiting-for-peer')
      }
      if (!localStream?.getVideoTracks()[0]) {
        if (!peerRef.current) setConnectionState('waiting-for-peer')
        return
      }
      if (roomConnection === 'connected') void sendReady()
    })
    return () => {
      active = false
    }
  }, [
    closePeerConnection,
    enabled,
    localStream,
    peerUserId,
    roomConnection,
    sendReady,
  ])

  useEffect(() => {
    const peer = peerRef.current
    if (!peer) return
    const nextTrack = localStream?.getVideoTracks()[0] ?? null
    const sender = senderRef.current
    if (!sender || sender.track === nextTrack) return
    void sender.replaceTrack(nextTrack).catch(() => {
      setConnectionState('failed')
      scheduleRetry()
    })
  }, [localStream, scheduleRetry])

  const retry = useCallback(() => {
    retryAttemptRef.current = 0
    clearRetryTimer()
    setConnectionState('retrying')
    void requestRetryRef.current()
  }, [clearRetryTimer])

  const close = useCallback(
    ({ notify = true }: CloseOptions = {}) => {
      const generationId =
        generationRef.current ??
        readinessGenerationRef.current ??
        crypto.randomUUID()
      if (notify) {
        const base = envelope(generationId)
        if (base) {
          void inputRef.current.sendSignal({ ...base, type: 'webrtc:bye' })
        }
      }
      closePeerConnection()
      setConnectionState('closed')
    },
    [closePeerConnection, envelope],
  )

  useEffect(
    () => () => {
      mountedRef.current = false
      clearRetryTimer()
      const generationId =
        generationRef.current ??
        readinessGenerationRef.current ??
        crypto.randomUUID()
      const current = inputRef.current
      if (current.roomId && current.currentUserId && current.peerUserId) {
        void current.sendSignal({
          eventId: crypto.randomUUID(),
          roomId: current.roomId,
          senderUserId: current.currentUserId,
          targetUserId: current.peerUserId,
          generationId,
          sentAt: new Date().toISOString(),
          type: 'webrtc:bye',
        })
      }
      const peer = peerRef.current
      if (peer) {
        peer.onicecandidate = null
        peer.ontrack = null
        peer.onconnectionstatechange = null
        peer.oniceconnectionstatechange = null
        peer.close()
      }
      peerRef.current = null
      activePeerUserIdRef.current = null
      senderRef.current = null
      queuedCandidatesRef.current = []
      earlyCandidatesRef.current.clear()
    },
    [clearRetryTimer],
  )

  return { remoteStream, connectionState, retry, close }
}
