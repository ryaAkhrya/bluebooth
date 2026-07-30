'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useSupabaseAuth } from '@/components/bluebooth/state/supabase-auth'
import { useRoomChannel } from '@/hooks/use-room-channel'
import {
  applySharedSetupPatch,
  isSharedSetupPatch,
  parseSharedSetup,
  sharedSetupPatchToJson,
  sharedSetupToJson,
  type SharedSetupPatch,
} from '@/lib/bluebooth/shared-settings'
import { shouldApplyRoomSnapshot } from '@/lib/bluebooth/room-settings-authority'
import { getBrowserSupabaseClient } from '@/lib/supabase/client'
import { RoomServiceError } from '@/lib/supabase/errors'
import {
  createRoom as createOnlineRoom,
  enterRoomSetup,
  fetchRoomState,
  fetchRoomStateByCode,
  joinRoom as joinOnlineRoom,
  leaveRoom as leaveOnlineRoom,
  normalizeRoomCode,
  updateRoomSettings,
} from '@/lib/supabase/rooms'
import type { RoomState as DatabaseRoomState } from '@/types/supabase'
import type {
  OnlineRoomState,
  RoomLifecycleEvent,
  RoomMode,
  RoomPresence,
  RoomPresenceStage,
  RoomSettingsEvent,
} from '@/types/room'
import type { WebRtcSignal } from '@/types/webrtc'
import type { CaptureEvent } from '@/types/capture'

type RoomOperationStatus = 'idle' | 'loading' | 'error'
type SettingsStatus = 'idle' | 'saving' | 'saved' | 'error'

interface RoomOperationResult {
  mode: RoomMode
  code: string
}

interface RoomContextValue {
  mode: RoomMode
  onlineAvailable: boolean
  onlineRoom: OnlineRoomState | null
  presence: RoomPresence[]
  connection: ReturnType<typeof useRoomChannel>['connection']
  operationStatus: RoomOperationStatus
  settingsStatus: SettingsStatus
  canControlBooth: boolean
  createRoom: (
    input: { displayName: string; roomName: string },
    forceLocal?: boolean,
  ) => Promise<RoomOperationResult>
  joinRoom: (
    input: { displayName: string; code: string },
    forceLocal?: boolean,
  ) => Promise<RoomOperationResult>
  leaveRoom: () => Promise<void>
  enterSetup: () => Promise<void>
  updateSharedSettings: (patch: SharedSetupPatch) => void
  retrySettings: () => void
  setPresence: (patch: {
    stage?: RoomPresenceStage
    cameraReady?: boolean
  }) => void
  sendWebRtcSignal: (signal: WebRtcSignal) => Promise<boolean>
  subscribeWebRtcSignals: (listener: (signal: WebRtcSignal) => void) => () => void
  sendCaptureEvent: (event: CaptureEvent) => Promise<boolean>
  subscribeCaptureEvents: (listener: (event: CaptureEvent) => void) => () => void
}

const RoomContext = createContext<RoomContextValue | null>(null)

function randomLocalCode() {
  const digits = Math.floor(100 + Math.random() * 900)
  return `BLU${digits}`
}

function patchKey(patch: SharedSetupPatch): string {
  return Object.keys(patch)[0]
}

export function RoomProvider({
  children,
  initialJoinCode,
}: {
  children: ReactNode
  initialJoinCode?: string
}) {
  const { dispatch } = useBluebooth()
  const auth = useSupabaseAuth()
  const client = useMemo(() => getBrowserSupabaseClient(), [])
  const [onlineRoom, setOnlineRoom] = useState<OnlineRoomState | null>(null)
  const [localRoomActive, setLocalRoomActive] = useState(false)
  const [operationStatus, setOperationStatus] =
    useState<RoomOperationStatus>('idle')
  const [settingsStatus, setSettingsStatus] = useState<SettingsStatus>('idle')
  const [pendingSettingsBroadcast, setPendingSettingsBroadcast] =
    useState<RoomSettingsEvent | null>(null)
  const [presenceMetadata, setPresenceMetadata] = useState<{
    stage: RoomPresenceStage
    cameraReady: boolean
  }>({ stage: 'waiting', cameraReady: false })
  const roomRef = useRef(onlineRoom)
  const requestRevisionRef = useRef(0)
  const restoreCodeRef = useRef<string | null>(null)
  const pendingPatchesRef = useRef(new Map<string, SharedSetupPatch>())
  const failedPatchRef = useRef<SharedSetupPatch | null>(null)
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lifecycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const syncQueueRef = useRef(Promise.resolve())
  const signalListenersRef = useRef(new Set<(signal: WebRtcSignal) => void>())
  const captureListenersRef = useRef(new Set<(event: CaptureEvent) => void>())

  useEffect(() => {
    roomRef.current = onlineRoom
  }, [onlineRoom])
  const onlineAvailable = auth.status === 'ready' && client !== null
  const mode: RoomMode = onlineRoom
    ? 'online'
    : localRoomActive
      ? 'local'
      : onlineAvailable
        ? 'online'
        : 'local'

  const hydrateRoom = useCallback(
    (
      databaseState: DatabaseRoomState,
      membership: DatabaseRoomState['members'][number],
    ) => {
      const current = roomRef.current
      const applyIncomingSettings = shouldApplyRoomSnapshot(
        current
          ? {
              roomId: current.room.id,
              revision: current.settingsRevision,
            }
          : null,
        {
          roomId: databaseState.room.id,
          revision: databaseState.room.settings_revision,
        },
      )
      const settings =
        applyIncomingSettings || !current
          ? parseSharedSetup(databaseState.room.shared_settings)
          : current.settings
      const room =
        applyIncomingSettings || !current
          ? databaseState.room
          : {
              ...databaseState.room,
              shared_settings: sharedSetupToJson(current.settings),
              settings_revision: current.settingsRevision,
            }
      const next: OnlineRoomState = {
        room,
        membership,
        members: databaseState.members,
        settings,
        settingsRevision: room.settings_revision,
      }
      roomRef.current = next
      setOnlineRoom(next)
      setLocalRoomActive(false)
      setPresenceMetadata((current) => ({
        ...current,
        stage: databaseState.room.status === 'setup' ? 'setup' : 'waiting',
      }))
      dispatch({
        type: 'set-room',
        code: databaseState.room.code,
        roomName: databaseState.room.name,
        userName: membership.display_name,
        participants: [],
      })
      if (applyIncomingSettings || !current) {
        dispatch({ type: 'apply-shared-setup', settings })
      }
    },
    [dispatch],
  )

  const refreshRoom = useCallback(async () => {
    const current = roomRef.current
    if (!client || !current) return
    const refreshed = await fetchRoomState(client, current.room.id)
    const membership = refreshed.members.find(
      (member) => member.user_id === current.membership.user_id,
    )
    if (!membership) {
      roomRef.current = null
      setOnlineRoom(null)
      return
    }
    hydrateRoom(refreshed, membership)
  }, [client, hydrateRoom])

  const handleSettingsEvent = useCallback(
    (event: RoomSettingsEvent) => {
      const current = roomRef.current
      if (
        !current ||
        event.roomId !== current.room.id ||
        event.senderUserId === current.membership.user_id
      ) {
        return
      }
      if (
        !current.members.some(
          (member) =>
            member.user_id === event.senderUserId &&
            member.role === 'host' &&
            member.left_at === null,
        )
      ) {
        return
      }
      if (event.revision < current.settingsRevision) return
      if (
        event.revision > current.settingsRevision + 1 &&
        !event.settings
      ) {
        void refreshRoom()
        return
      }
      const settings =
        event.settings ??
        applySharedSetupPatch(current.settings, event.payload)
      const next: OnlineRoomState = {
        ...current,
        room: {
          ...current.room,
          shared_settings: sharedSetupToJson(settings),
          settings_revision: event.revision,
        },
        settings,
        settingsRevision: event.revision,
      }
      roomRef.current = next
      setOnlineRoom(next)
      dispatch({ type: 'apply-shared-setup', settings })
    },
    [dispatch, refreshRoom],
  )

  const handleLifecycleEvent = useCallback(
    (event: RoomLifecycleEvent) => {
      const current = roomRef.current
      const sender = current?.members.find(
        (member) =>
          member.user_id === event.senderUserId && member.left_at === null,
      )
      if (
        !current ||
        event.roomId !== current.room.id ||
        event.senderUserId === current.membership.user_id ||
        !sender
      ) {
        return
      }
      if (event.event === 'setup-entered') {
        if (sender.role !== 'host') return
        void refreshRoom()
        dispatch({ type: 'navigate', screen: 'setup' })
      } else {
        if (lifecycleTimerRef.current) clearTimeout(lifecycleTimerRef.current)
        lifecycleTimerRef.current = setTimeout(() => void refreshRoom(), 300)
      }
    },
    [dispatch, refreshRoom],
  )

  const handleWebRtcSignal = useCallback((signal: WebRtcSignal) => {
    const current = roomRef.current
    if (
      !current ||
      signal.roomId !== current.room.id ||
      signal.targetUserId !== current.membership.user_id ||
      signal.senderUserId === current.membership.user_id ||
      !current.members.some(
        (member) => member.user_id === signal.senderUserId && member.left_at === null,
      )
    ) {
      return
    }
    for (const listener of signalListenersRef.current) listener(signal)
  }, [])

  const handleCaptureEvent = useCallback((event: CaptureEvent) => {
    const current = roomRef.current
    if (
      !current ||
      event.roomId !== current.room.id ||
      event.senderUserId === current.membership.user_id ||
      !current.members.some(
        (member) => member.user_id === event.senderUserId && member.left_at === null,
      )
    ) {
      return
    }
    for (const listener of captureListenersRef.current) listener(event)
  }, [])

  const membership = onlineRoom?.membership
  const currentPresence = useMemo<RoomPresence | null>(() => {
    if (!membership) return null
    return {
      userId: membership.user_id,
      displayName: membership.display_name,
      role: membership.role,
      stage: presenceMetadata.stage,
      cameraReady: presenceMetadata.cameraReady,
      joinedAt: membership.joined_at,
    }
  }, [membership, presenceMetadata])

  const {
    connection,
    presence,
    updatePresence,
    sendSettings,
    sendLifecycle,
    sendWebRtcSignal: sendChannelWebRtcSignal,
    sendCaptureEvent: sendChannelCaptureEvent,
    disconnect,
  } = useRoomChannel({
    client,
    roomId: onlineRoom?.room.id ?? null,
    initialPresence: currentPresence,
    onSettings: handleSettingsEvent,
    onLifecycle: handleLifecycleEvent,
    onWebRtcSignal: handleWebRtcSignal,
    onCaptureEvent: handleCaptureEvent,
    onReconnect: refreshRoom,
  })

  useEffect(() => {
    if (currentPresence) updatePresence(currentPresence)
  }, [currentPresence, updatePresence])

  useEffect(() => {
    if (!pendingSettingsBroadcast || connection !== 'connected') return
    let active = true
    const retry = async () => {
      const delivered = await sendSettings(pendingSettingsBroadcast).catch(
        () => false,
      )
      if (!active || !delivered) return
      setPendingSettingsBroadcast((current) =>
        current && current.revision <= pendingSettingsBroadcast.revision
          ? null
          : current,
      )
    }
    void retry()
    const timer = setInterval(() => void retry(), 1_000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [connection, pendingSettingsBroadcast, sendSettings])

  const authorizedPresence = useMemo(() => {
    if (!onlineRoom) return []
    return presence.flatMap((entry) => {
      const member = onlineRoom.members.find(
        (candidate) => candidate.user_id === entry.userId && candidate.left_at === null,
      )
      return member
        ? [{ ...entry, displayName: member.display_name, role: member.role }]
        : []
    })
  }, [onlineRoom, presence])

  useEffect(() => {
    if (
      onlineRoom &&
      presence.some(
        (entry) =>
          !onlineRoom.members.some(
            (member) => member.user_id === entry.userId && member.left_at === null,
          ),
      )
    ) {
      void refreshRoom()
    }
  }, [onlineRoom, presence, refreshRoom])

  useEffect(() => {
    const normalized = initialJoinCode ? normalizeRoomCode(initialJoinCode) : ''
    if (
      !normalized ||
      !onlineAvailable ||
      !client ||
      onlineRoom ||
      localRoomActive ||
      restoreCodeRef.current === normalized ||
      !auth.userId
    ) {
      return
    }
    restoreCodeRef.current = normalized
    let active = true
    setOperationStatus('loading')
    void fetchRoomStateByCode(client, normalized, auth.userId)
      .then((restored) => {
        if (!active) return
        if (restored) {
          hydrateRoom(restored, restored.membership)
          dispatch({
            type: 'navigate',
            screen: restored.room.status === 'setup' ? 'setup' : 'waiting',
          })
        }
        setOperationStatus('idle')
      })
      .catch(() => {
        if (active) setOperationStatus('error')
      })
    return () => {
      active = false
    }
  }, [
    auth.userId,
    client,
    dispatch,
    hydrateRoom,
    initialJoinCode,
    localRoomActive,
    onlineAvailable,
    onlineRoom,
  ])

  const createRoom = useCallback(
    async (
      input: { displayName: string; roomName: string },
      forceLocal = false,
    ): Promise<RoomOperationResult> => {
      const displayName = input.displayName.trim()
      const roomName = input.roomName.trim() || 'Bluebooth'
      const requestRevision = ++requestRevisionRef.current
      setOperationStatus('loading')
      if (forceLocal || !onlineAvailable || !client || !auth.userId) {
        const code = randomLocalCode()
        setLocalRoomActive(true)
        dispatch({
          type: 'set-room',
          code,
          roomName,
          userName: displayName,
          participants: [
            { id: 'self', name: displayName, connected: true, isSelf: true },
          ],
        })
        setOperationStatus('idle')
        return { mode: 'local', code }
      }
      try {
        const access = await createOnlineRoom(client, { displayName, roomName })
        const databaseState = await fetchRoomState(client, access.roomId)
        const membership = databaseState.members.find(
          (member) => member.user_id === auth.userId,
        )
        if (!membership) throw new RoomServiceError('membership', 'Membership was not created.')
        if (requestRevision !== requestRevisionRef.current) {
          throw new RoomServiceError('unavailable', 'A newer room request replaced this one.')
        }
        hydrateRoom(databaseState, membership)
        setOperationStatus('idle')
        return { mode: 'online', code: access.code }
      } catch (error) {
        if (requestRevision === requestRevisionRef.current) setOperationStatus('error')
        throw error
      }
    },
    [auth.userId, client, dispatch, hydrateRoom, onlineAvailable],
  )

  const joinRoom = useCallback(
    async (
      input: { displayName: string; code: string },
      forceLocal = false,
    ): Promise<RoomOperationResult> => {
      const displayName = input.displayName.trim() || 'You'
      const code = normalizeRoomCode(input.code)
      const requestRevision = ++requestRevisionRef.current
      setOperationStatus('loading')
      if (forceLocal || !onlineAvailable || !client || !auth.userId) {
        setLocalRoomActive(true)
        dispatch({
          type: 'set-room',
          code,
          roomName: 'Bluebooth',
          userName: displayName,
          participants: [
            { id: 'partner', name: 'Partner', connected: true, isSelf: false },
            { id: 'self', name: displayName, connected: true, isSelf: true },
          ],
        })
        setOperationStatus('idle')
        return { mode: 'local', code }
      }
      try {
        const access = await joinOnlineRoom(client, { code, displayName })
        const databaseState = await fetchRoomState(client, access.roomId)
        const membership = databaseState.members.find(
          (member) => member.user_id === auth.userId,
        )
        if (!membership) throw new RoomServiceError('membership', 'Membership was not created.')
        if (requestRevision !== requestRevisionRef.current) {
          throw new RoomServiceError('unavailable', 'A newer room request replaced this one.')
        }
        hydrateRoom(databaseState, membership)
        setOperationStatus('idle')
        return { mode: 'online', code: access.code }
      } catch (error) {
        if (requestRevision === requestRevisionRef.current) setOperationStatus('error')
        throw error
      }
    },
    [auth.userId, client, dispatch, hydrateRoom, onlineAvailable],
  )

  const persistPatch = useCallback(
    async (patch: SharedSetupPatch): Promise<void> => {
      const current = roomRef.current
      if (!client || !current) return
      const submit = (room: OnlineRoomState) =>
        updateRoomSettings(client, {
          roomId: room.room.id,
          expectedRevision: room.settingsRevision,
          patch: sharedSetupPatchToJson(patch),
        })
      let result
      try {
        result = await submit(current)
      } catch (error) {
        if (
          error instanceof RoomServiceError &&
          error.kind === 'revision-conflict'
        ) {
          await refreshRoom()
          const refreshed = roomRef.current
          if (!refreshed) return
          result = await submit(refreshed)
        } else {
          throw error
        }
      }
      const settings = parseSharedSetup(result.sharedSettings)
      const latest = roomRef.current
      if (!latest || latest.room.id !== result.roomId) return
      const next: OnlineRoomState = {
        ...latest,
        room: {
          ...latest.room,
          shared_settings: result.sharedSettings,
          settings_revision: result.settingsRevision,
          updated_at: result.updatedAt,
        },
        settings,
        settingsRevision: result.settingsRevision,
      }
      roomRef.current = next
      setOnlineRoom(next)
      dispatch({ type: 'apply-shared-setup-patch', patch })
      const event: RoomSettingsEvent = {
        eventId: crypto.randomUUID(),
        roomId: result.roomId,
        senderUserId: latest.membership.user_id,
        sentAt: new Date().toISOString(),
        revision: result.settingsRevision,
        payload: patch,
        settings,
      }
      const delivered = await sendSettings(event).catch(() => false)
      if (!delivered) setPendingSettingsBroadcast(event)
    },
    [client, dispatch, refreshRoom, sendSettings],
  )

  const flushPatches = useCallback(() => {
    flushTimerRef.current = null
    const patches = [...pendingPatchesRef.current.values()]
    pendingPatchesRef.current.clear()
    if (patches.length === 0) return
    setSettingsStatus('saving')
    syncQueueRef.current = syncQueueRef.current
      .then(async () => {
        for (const patch of patches) await persistPatch(patch)
      })
      .then(() => {
        failedPatchRef.current = null
        setSettingsStatus('saved')
      })
      .catch(() => {
        failedPatchRef.current = patches.at(-1) ?? null
        setSettingsStatus('error')
      })
  }, [persistPatch])

  const updateSharedSettings = useCallback(
    (patch: SharedSetupPatch) => {
      if (!isSharedSetupPatch(patch)) return
      const current = roomRef.current
      if (current && current.membership.role !== 'host') return
      dispatch({ type: 'apply-shared-setup-patch', patch })
      if (!current) return
      pendingPatchesRef.current.set(patchKey(patch), patch)
      setSettingsStatus('saving')
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
      flushTimerRef.current = setTimeout(flushPatches, 120)
    },
    [dispatch, flushPatches],
  )

  const retrySettings = useCallback(() => {
    const failed = failedPatchRef.current
    if (!failed) return
    pendingPatchesRef.current.set(patchKey(failed), failed)
    flushPatches()
  }, [flushPatches])

  const enterSetup = useCallback(async () => {
    const current = roomRef.current
    if (!client || !current || current.membership.role !== 'host') return
    await enterRoomSetup(client, current.room.id)
    const event: RoomLifecycleEvent = {
      eventId: crypto.randomUUID(),
      roomId: current.room.id,
      senderUserId: current.membership.user_id,
      sentAt: new Date().toISOString(),
      event: 'setup-entered',
    }
    await sendLifecycle(event)
    await refreshRoom()
  }, [client, refreshRoom, sendLifecycle])

  const leaveRoom = useCallback(async () => {
    requestRevisionRef.current += 1
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    if (lifecycleTimerRef.current) clearTimeout(lifecycleTimerRef.current)
    pendingPatchesRef.current.clear()
    failedPatchRef.current = null
    const current = roomRef.current
    if (client && current) {
      await sendLifecycle({
        eventId: crypto.randomUUID(),
        roomId: current.room.id,
        senderUserId: current.membership.user_id,
        sentAt: new Date().toISOString(),
        event: 'member-left',
      })
      await disconnect()
      await leaveOnlineRoom(client, current.room.id).catch(() => false)
    }
    roomRef.current = null
    setOnlineRoom(null)
    setLocalRoomActive(false)
    setOperationStatus('idle')
    setSettingsStatus('idle')
    setPendingSettingsBroadcast(null)
    signalListenersRef.current.clear()
    captureListenersRef.current.clear()
    dispatch({ type: 'reset-room' })
  }, [client, disconnect, dispatch, sendLifecycle])

  const setPresence = useCallback(
    (patch: { stage?: RoomPresenceStage; cameraReady?: boolean }) => {
      setPresenceMetadata((current) => ({ ...current, ...patch }))
    },
    [],
  )

  const sendWebRtcSignal = useCallback(
    async (signal: WebRtcSignal) => {
      const current = roomRef.current
      if (
        !current ||
        signal.roomId !== current.room.id ||
        signal.senderUserId !== current.membership.user_id ||
        !current.members.some(
          (member) => member.user_id === signal.targetUserId && member.left_at === null,
        )
      ) {
        return false
      }
      return sendChannelWebRtcSignal(signal)
    },
    [sendChannelWebRtcSignal],
  )

  const subscribeWebRtcSignals = useCallback(
    (listener: (signal: WebRtcSignal) => void) => {
      signalListenersRef.current.add(listener)
      return () => signalListenersRef.current.delete(listener)
    },
    [],
  )

  const sendCaptureEvent = useCallback(
    async (event: CaptureEvent) => {
      const current = roomRef.current
      if (
        !current ||
        event.roomId !== current.room.id ||
        event.senderUserId !== current.membership.user_id
      ) {
        return false
      }
      return sendChannelCaptureEvent(event)
    },
    [sendChannelCaptureEvent],
  )

  const subscribeCaptureEvents = useCallback(
    (listener: (event: CaptureEvent) => void) => {
      captureListenersRef.current.add(listener)
      return () => captureListenersRef.current.delete(listener)
    },
    [],
  )

  useEffect(
    () => () => {
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
      if (lifecycleTimerRef.current) clearTimeout(lifecycleTimerRef.current)
      signalListenersRef.current.clear()
      captureListenersRef.current.clear()
    },
    [],
  )

  const value = useMemo<RoomContextValue>(
    () => ({
      mode,
      onlineAvailable,
      onlineRoom,
      presence: authorizedPresence,
      connection,
      operationStatus,
      settingsStatus,
      canControlBooth:
        !onlineRoom || onlineRoom.membership.role === 'host',
      createRoom,
      joinRoom,
      leaveRoom,
      enterSetup,
      updateSharedSettings,
      retrySettings,
      setPresence,
      sendWebRtcSignal,
      subscribeWebRtcSignals,
      sendCaptureEvent,
      subscribeCaptureEvents,
    }),
    [
      authorizedPresence,
      connection,
      createRoom,
      enterSetup,
      joinRoom,
      leaveRoom,
      mode,
      onlineAvailable,
      onlineRoom,
      operationStatus,
      retrySettings,
      setPresence,
      sendWebRtcSignal,
      sendCaptureEvent,
      settingsStatus,
      subscribeWebRtcSignals,
      subscribeCaptureEvents,
      updateSharedSettings,
    ],
  )

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>
}

export function useRoom() {
  const value = useContext(RoomContext)
  if (!value) throw new Error('useRoom must be used inside RoomProvider')
  return value
}
