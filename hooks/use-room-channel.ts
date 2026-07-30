'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import {
  flattenRoomPresence,
  isRoomLifecycleEvent,
  isRoomSettingsEvent,
} from '@/lib/supabase/realtime'
import { WEBRTC_SIGNAL_TYPES, isWebRtcSignal } from '@/lib/bluebooth/webrtc'
import { CAPTURE_EVENT_TYPES, isCaptureEvent } from '@/lib/bluebooth/capture-events'
import type { Database } from '@/types/database'
import type {
  RoomConnectionStatus,
  RoomLifecycleEvent,
  RoomPresence,
  RoomSettingsEvent,
} from '@/types/room'
import type { WebRtcSignal } from '@/types/webrtc'
import type { CaptureEvent } from '@/types/capture'

interface UseRoomChannelInput {
  client: SupabaseClient<Database> | null
  roomId: string | null
  initialPresence: RoomPresence | null
  onSettings: (event: RoomSettingsEvent) => void
  onLifecycle: (event: RoomLifecycleEvent) => void
  onWebRtcSignal: (signal: WebRtcSignal) => void
  onCaptureEvent: (event: CaptureEvent) => void
  onReconnect: () => void
}

export function useRoomChannel({
  client,
  roomId,
  initialPresence,
  onSettings,
  onLifecycle,
  onWebRtcSignal,
  onCaptureEvent,
  onReconnect,
}: UseRoomChannelInput) {
  const [connection, setConnection] = useState<RoomConnectionStatus>('offline')
  const [presence, setPresenceState] = useState<RoomPresence[]>([])
  const channelRef = useRef<RealtimeChannel | null>(null)
  const connectedRef = useRef(false)
  const presenceRef = useRef(initialPresence)
  const callbacksRef = useRef({
    onSettings,
    onLifecycle,
    onWebRtcSignal,
    onCaptureEvent,
    onReconnect,
  })
  const presenceUserId = initialPresence?.userId ?? null

  useEffect(() => {
    callbacksRef.current = {
      onSettings,
      onLifecycle,
      onWebRtcSignal,
      onCaptureEvent,
      onReconnect,
    }
  }, [onCaptureEvent, onLifecycle, onReconnect, onSettings, onWebRtcSignal])

  useEffect(() => {
    presenceRef.current = initialPresence
  }, [initialPresence])

  const disconnect = useCallback(async () => {
    const channel = channelRef.current
    if (!channel || !client) return
    channelRef.current = null
    connectedRef.current = false
    setConnection('offline')
    setPresenceState([])
    await channel.untrack().catch(() => 'error')
    await client.removeChannel(channel)
  }, [client])

  useEffect(() => {
    if (!client || !roomId || !presenceUserId) return

    let active = true
    let subscribedOnce = false
    queueMicrotask(() => {
      if (active) setConnection('connecting')
    })

    const channel = client.channel(`room:${roomId}`, {
      config: {
        private: true,
        broadcast: { self: false, ack: true },
        presence: { key: presenceUserId, enabled: true },
      },
    })
    channelRef.current = channel

    const syncPresence = () => {
      if (!active) return
      const rawState = channel.presenceState<Record<string, unknown>>()
      setPresenceState(
        flattenRoomPresence(
          Object.fromEntries(
            Object.entries(rawState).map(([key, entries]) => [key, [...entries]]),
          ),
        ),
      )
    }

    channel
      .on('presence', { event: 'sync' }, syncPresence)
      .on('presence', { event: 'join' }, syncPresence)
      .on('presence', { event: 'leave' }, syncPresence)
      .on('broadcast', { event: 'room:settings-patch' }, (message) => {
        if (isRoomSettingsEvent(message.payload)) {
          callbacksRef.current.onSettings(message.payload)
        }
      })
      .on('broadcast', { event: 'room:lifecycle' }, (message) => {
        if (isRoomLifecycleEvent(message.payload)) {
          callbacksRef.current.onLifecycle(message.payload)
        }
      })

    for (const event of WEBRTC_SIGNAL_TYPES) {
      channel.on('broadcast', { event }, (message) => {
        if (isWebRtcSignal(message.payload) && message.payload.type === event) {
          callbacksRef.current.onWebRtcSignal(message.payload)
        }
      })
    }

    for (const event of CAPTURE_EVENT_TYPES) {
      channel.on('broadcast', { event }, (message) => {
        if (isCaptureEvent(message.payload) && message.payload.type === event) {
          callbacksRef.current.onCaptureEvent(message.payload)
        }
      })
    }

    void client.realtime
      .setAuth()
      .then(() => {
        if (!active) return
        channel.subscribe((status) => {
          if (!active) return
          if (status === 'SUBSCRIBED') {
            connectedRef.current = true
            setConnection('connected')
            const currentPresence = presenceRef.current
            if (currentPresence) void channel.track(currentPresence)
            if (subscribedOnce) callbacksRef.current.onReconnect()
            subscribedOnce = true
            return
          }
          connectedRef.current = false
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnection('reconnecting')
          } else if (status === 'CLOSED') {
            setConnection('offline')
          }
        })
      })
      .catch(() => {
        if (active) setConnection('error')
      })

    return () => {
      active = false
      if (channelRef.current !== channel) return
      channelRef.current = null
      connectedRef.current = false
      void channel.untrack().finally(() => client.removeChannel(channel))
    }
  }, [client, presenceUserId, roomId])

  const updatePresence = useCallback(
    (next: RoomPresence) => {
      presenceRef.current = next
      const channel = channelRef.current
      if (channel && connectedRef.current) void channel.track(next)
    },
    [],
  )

  const sendSettings = useCallback(async (event: RoomSettingsEvent) => {
    const channel = channelRef.current
    if (!channel || !connectedRef.current) return false
    return (
      (await channel.send({
        type: 'broadcast',
        event: 'room:settings-patch',
        payload: event,
      })) === 'ok'
    )
  }, [])

  const sendLifecycle = useCallback(async (event: RoomLifecycleEvent) => {
    const channel = channelRef.current
    if (!channel || !connectedRef.current) return false
    return (
      (await channel.send({
        type: 'broadcast',
        event: 'room:lifecycle',
        payload: event,
      })) === 'ok'
    )
  }, [])

  const sendWebRtcSignal = useCallback(async (signal: WebRtcSignal) => {
    const channel = channelRef.current
    if (!channel || !connectedRef.current) return false
    return (
      (await channel.send({
        type: 'broadcast',
        event: signal.type,
        payload: signal,
      })) === 'ok'
    )
  }, [])

  const sendCaptureEvent = useCallback(async (event: CaptureEvent) => {
    const channel = channelRef.current
    if (!channel || !connectedRef.current) return false
    return (
      (await channel.send({
        type: 'broadcast',
        event: event.type,
        payload: event,
      })) === 'ok'
    )
  }, [])

  return {
    connection: roomId ? connection : 'offline',
    presence: roomId ? presence : [],
    updatePresence,
    sendSettings,
    sendLifecycle,
    sendWebRtcSignal,
    sendCaptureEvent,
    disconnect,
  }
}
