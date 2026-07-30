'use client'

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useLocalMedia } from '@/components/bluebooth/state/local-media'
import { useRoom } from '@/components/bluebooth/state/room-state'
import {
  countdownSeconds,
  parseFrozenCaptureConfiguration,
  selectFrozenCaptureConfiguration,
} from '@/lib/bluebooth/capture-events'
import { getCaptureReadiness } from '@/lib/bluebooth/capture-readiness'
import { captureVideoFrame } from '@/lib/bluebooth/media'
import { getSlotIds } from '@/lib/bluebooth/geometry'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'
import { withBoundedRetry } from '@/lib/bluebooth/retry'
import {
  initialSynchronizedSessionState,
  synchronizedSessionReducer,
} from '@/lib/bluebooth/synchronized-session-machine'
import { uploadCapture } from '@/lib/supabase/captures'
import { createResult } from '@/lib/supabase/results'
import { getBrowserSupabaseClient } from '@/lib/supabase/client'
import {
  acknowledgeCaptureReady,
  attachCaptureCustomFrame,
  cancelCaptureSession,
  completeCaptureShot,
  createPhotoboothSession,
  fetchActiveCaptureSession,
  fetchCaptureSession,
  measureCaptureClockOffset,
  prepareCaptureRetake,
  scheduleCaptureShot,
  type CaptureSessionSnapshot,
} from '@/lib/supabase/sessions'
import {
  createPrivateSignedUrl,
  customFrameStoragePath,
  resultStoragePath,
  uploadPrivateObject,
} from '@/lib/supabase/storage'
import type { CameraStatus } from '@/types/bluebooth'
import type {
  CaptureEvent,
  FrozenCaptureConfiguration,
  SharedCaptureUrls,
} from '@/types/capture'
import type { Json } from '@/types/database'

const captureLeadFloorMs = 2_000

export function useSynchronizedCapture(input: {
  cameraStatus: CameraStatus
  localStream: MediaStream | null
}) {
  const { state: bluebooth, dispatch: dispatchBluebooth } = useBluebooth()
  const media = useLocalMedia()
  const room = useRoom()
  const setRoomPresence = room.setPresence
  const client = useMemo(() => getBrowserSupabaseClient(), [])
  const [state, dispatch] = useReducer(
    synchronizedSessionReducer,
    initialSynchronizedSessionState,
  )
  const [snapshot, setSnapshot] = useState<CaptureSessionSnapshot | null>(null)
  const [configuration, setConfiguration] =
    useState<FrozenCaptureConfiguration | null>(null)
  const [sharedCaptureUrls, setSharedCaptureUrls] =
    useState<SharedCaptureUrls>({})
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [customFrameUrl, setCustomFrameUrl] = useState<string | null>(null)
  const [now, setNow] = useState(0)
  const [localCameraReady, setLocalCameraReady] = useState(false)
  const [pendingRetakeIndex, setPendingRetakeIndex] =
    useState<number | null | undefined>(undefined)
  const snapshotRef = useRef(snapshot)
  const clockOffsetRef = useRef(0)
  const readinessKeyRef = useRef<string | null>(null)
  const captureExecutionRef = useRef(new Set<string>())
  const pendingFramesRef = useRef(
    new Map<
      string,
      {
        blob: Blob
        width: number
        height: number
        capturedAt: string
        metadata: Json
      }
    >(),
  )
  const advancingRef = useRef(false)
  const advanceRef = useRef<
    (candidate?: CaptureSessionSnapshot) => Promise<boolean>
  >(async () => false)
  const refreshRef = useRef<() => Promise<CaptureSessionSnapshot | null>>(
    async () => null,
  )

  const onlineRoom = room.onlineRoom
  const membership = onlineRoom?.membership ?? null
  const isOnline = room.mode === 'online' && Boolean(onlineRoom && client)
  const isHost = membership?.role === 'host'
  const hostUserId =
    onlineRoom?.members.find(
      (member) => member.role === 'host' && member.left_at === null,
    )?.user_id ?? null

  useEffect(() => {
    const track = input.localStream?.getVideoTracks()[0] ?? null
    const update = () => {
      setLocalCameraReady(
        input.cameraStatus === 'ready' &&
          Boolean(track && track.readyState === 'live' && !track.muted),
      )
    }
    queueMicrotask(update)
    track?.addEventListener('mute', update)
    track?.addEventListener('unmute', update)
    track?.addEventListener('ended', update)
    return () => {
      track?.removeEventListener('mute', update)
      track?.removeEventListener('unmute', update)
      track?.removeEventListener('ended', update)
    }
  }, [input.cameraStatus, input.localStream])

  useEffect(() => {
    if (!isOnline || !snapshot) return
    setRoomPresence({
      stage: snapshot.session.status === 'review' ? 'review' : 'session',
      cameraReady: localCameraReady,
    })
  }, [isOnline, localCameraReady, setRoomPresence, snapshot])

  useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  const currentFallbackConfiguration = useMemo(
    () => selectFrozenCaptureConfiguration(bluebooth),
    [bluebooth],
  )

  const hydrate = useCallback(
    (next: CaptureSessionSnapshot) => {
      snapshotRef.current = next
      setSnapshot(next)
      setConfiguration(
        parseFrozenCaptureConfiguration(
          next.session.configuration,
          currentFallbackConfiguration,
        ),
      )
      dispatch({
        type: 'hydrate',
        sessionId: next.session.id,
        revision: next.session.revision,
        phase: next.session.status,
        shotIndex: next.session.current_shot_index,
        shotCount: next.session.shot_count,
        captureAt: next.session.capture_at,
      })
      if (
        next.session.status === 'waiting-for-ready' ||
        next.session.status === 'countdown' ||
        next.session.status === 'retake-countdown' ||
        next.session.status === 'capturing' ||
        next.session.status === 'waiting-for-uploads'
      ) {
        dispatchBluebooth({ type: 'navigate', screen: 'session' })
      } else if (next.session.status === 'review') {
        dispatchBluebooth({ type: 'navigate', screen: 'review' })
      } else if (next.session.status === 'completed') {
        dispatchBluebooth({ type: 'navigate', screen: 'final' })
      } else if (next.session.status === 'cancelled') {
        dispatchBluebooth({ type: 'navigate', screen: 'setup' })
      }
    },
    [currentFallbackConfiguration, dispatchBluebooth],
  )

  const refresh = useCallback(async () => {
    if (!client || !onlineRoom) return null
    const current = snapshotRef.current
    const next = current
      ? await fetchCaptureSession(client, current.session.id)
      : await fetchActiveCaptureSession(client, onlineRoom.room.id)
    if (next) hydrate(next)
    return next
  }, [client, hydrate, onlineRoom])

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    if (!isOnline || !client || !onlineRoom) {
      queueMicrotask(() => {
        snapshotRef.current = null
        setSnapshot(null)
        setConfiguration(null)
        setSharedCaptureUrls({})
        setResultUrl(null)
        setCustomFrameUrl(null)
        dispatch({ type: 'reset' })
      })
      return
    }
    let active = true
    void Promise.all([
      measureCaptureClockOffset(client, onlineRoom.room.id),
      fetchActiveCaptureSession(client, onlineRoom.room.id),
    ])
      .then(([offset, restored]) => {
        if (!active) return
        clockOffsetRef.current = offset
        if (restored) hydrate(restored)
      })
      .catch(() => {
        if (active) {
          dispatch({
            type: 'operation',
            operation: 'error',
            error: 'The shared capture session could not be restored.',
          })
        }
      })
    return () => {
      active = false
    }
  }, [client, hydrate, isOnline, onlineRoom])

  useEffect(() => {
    if (!isOnline) return
    return room.subscribeCaptureEvents((event) => {
      const currentRoom = room.onlineRoom
      if (!currentRoom || event.roomId !== currentRoom.room.id) return
      const sender = currentRoom.members.find(
        (member) => member.user_id === event.senderUserId && member.left_at === null,
      )
      if (!sender) return

      if (event.type === 'capture:ready-ack') {
        dispatch({ type: 'event', event })
        void refreshRef.current()
        return
      }
      if (event.type === 'capture:complete') {
        dispatch({ type: 'event', event })
        void refreshRef.current().then((next) => {
          if (isHost && next) void advanceRef.current(next)
        })
        return
      }
      if (sender.user_id !== hostUserId) return
      void refreshRef.current()
    })
  }, [hostUserId, isHost, isOnline, room])

  const eventBase = useCallback(
    (sessionId: string, revision: number) => {
      if (!onlineRoom || !membership) return null
      return {
        eventId: crypto.randomUUID(),
        roomId: onlineRoom.room.id,
        sessionId,
        senderUserId: membership.user_id,
        revision,
        sentAt: new Date(Date.now() + clockOffsetRef.current).toISOString(),
      }
    },
    [membership, onlineRoom],
  )

  const send = useCallback(
    async (event: CaptureEvent) => room.sendCaptureEvent(event),
    [room],
  )

  const startSession = useCallback(async () => {
    if (!client || !onlineRoom || !isHost) return false
    dispatch({ type: 'operation', operation: 'preparing' })
    try {
      const frozen = selectFrozenCaptureConfiguration(bluebooth)
      const shotCount = getSlotIds(getGridPreset(frozen.selectedGrid)).length
      let session = await createPhotoboothSession(client, {
        roomId: onlineRoom.room.id,
        configuration: frozen as unknown as Json,
        shotCount,
      })
      if (frozen.customFrame && media.customFrame) {
        const contentType =
          media.customFrame.blob.type === 'image/png'
            ? 'image/png'
            : 'image/webp'
        const framePath = customFrameStoragePath({
          roomId: onlineRoom.room.id,
          sessionId: session.id,
          userId: membership?.user_id ?? '',
          fileId: frozen.customFrame.id,
          mimeType: contentType,
        })
        await uploadPrivateObject(client, {
          path: framePath,
          body: media.customFrame.blob,
          contentType,
        })
        session = await attachCaptureCustomFrame(client, {
          sessionId: session.id,
          expectedRevision: session.revision,
          storagePath: framePath,
        })
      }
      const next = await fetchCaptureSession(client, session.id)
      media.clearCaptures()
      media.clearFinalResult()
      hydrate(next)
      const base = eventBase(session.id, session.revision)
      if (base) {
        await send({
          ...base,
          type: 'capture:prepare',
          payload: { shotCount, shotIndex: 0 },
        })
      }
      dispatch({ type: 'operation', operation: 'ready' })
      return true
    } catch (error) {
      dispatch({
        type: 'operation',
        operation: 'error',
        error: error instanceof Error ? error.message : 'Session preparation failed.',
      })
      return false
    }
  }, [
    bluebooth,
    client,
    eventBase,
    hydrate,
    isHost,
    media,
    membership,
    onlineRoom,
    send,
  ])

  const acknowledgeReady = useCallback(async () => {
    const current = snapshotRef.current
    if (!client || !current || !membership) return false
    const cameraReady = localCameraReady
    const key = `${current.session.id}:${current.session.revision}:${cameraReady}`
    if (readinessKeyRef.current === key) return cameraReady
    try {
      await acknowledgeCaptureReady(client, {
        sessionId: current.session.id,
        expectedRevision: current.session.revision,
        cameraReady,
      })
      readinessKeyRef.current = key
      const base = eventBase(current.session.id, current.session.revision)
      if (base) {
        await send({
          ...base,
          type: 'capture:ready-ack',
          payload: { cameraReady },
        })
      }
      await refresh()
      return cameraReady
    } catch (error) {
      dispatch({
        type: 'operation',
        operation: 'error',
        error: error instanceof Error ? error.message : 'Readiness could not be confirmed.',
      })
      return false
    }
  }, [
    client,
    eventBase,
    localCameraReady,
    membership,
    refresh,
    send,
  ])

  useEffect(() => {
    if (snapshot?.session.status !== 'waiting-for-ready') return
    void acknowledgeReady()
  }, [acknowledgeReady, snapshot?.session.revision, snapshot?.session.status])

  useEffect(() => {
    if (
      !isOnline ||
      snapshot?.session.status !== 'waiting-for-ready'
    ) {
      return
    }
    const timer = window.setInterval(() => {
      void refreshRef.current()
    }, 1_500)
    return () => window.clearInterval(timer)
  }, [isOnline, snapshot?.session.status])

  const retryReadiness = useCallback(() => {
    readinessKeyRef.current = null
    dispatch({ type: 'operation', operation: 'preparing' })
    void acknowledgeReady().then((ready) => {
      dispatch({
        type: 'operation',
        operation: ready ? 'ready' : 'error',
        error: ready ? null : 'Start your camera, then retry readiness.',
      })
    })
  }, [acknowledgeReady])

  const startCountdown = useCallback(async () => {
    const current = snapshotRef.current
    if (!client || !current || !isHost || !configuration) return false
    dispatch({ type: 'operation', operation: 'preparing' })
    try {
      const scheduled = await scheduleCaptureShot(client, {
        sessionId: current.session.id,
        expectedRevision: current.session.revision,
        leadMs: Math.max(captureLeadFloorMs, configuration.timer * 1000),
      })
      const next = await fetchCaptureSession(client, scheduled.id)
      hydrate(next)
      const base = eventBase(scheduled.id, scheduled.revision)
      if (base && scheduled.capture_at) {
        await send({
          ...base,
          type: 'capture:start',
          payload: {
            shotIndex: scheduled.current_shot_index,
            captureAt: scheduled.capture_at,
          },
        })
      }
      dispatch({ type: 'operation', operation: 'capturing' })
      return true
    } catch (error) {
      await refresh().catch(() => null)
      dispatch({
        type: 'operation',
        operation: 'error',
        error:
          error instanceof Error
            ? error.message
            : 'Both participants must be ready before capture.',
      })
      return false
    }
  }, [client, configuration, eventBase, hydrate, isHost, refresh, send])

  const advanceIfComplete = useCallback(
    async (candidate?: CaptureSessionSnapshot) => {
      const current = candidate ?? snapshotRef.current
      if (!client || !current || !isHost || advancingRef.current) return false
      const readyCaptures = current.captures.filter(
        (capture) =>
          capture.shot_index === current.session.current_shot_index &&
          capture.revision === current.session.revision,
      )
      if (readyCaptures.length !== 2) return false
      advancingRef.current = true
      try {
        const completed = await completeCaptureShot(client, {
          sessionId: current.session.id,
          expectedRevision: current.session.revision,
        })
        const next = await fetchCaptureSession(client, completed.id)
        hydrate(next)
        const base = eventBase(completed.id, completed.revision)
        if (base) {
          if (completed.status === 'waiting-for-ready') {
            await send({
              ...base,
              type: 'capture:prepare',
              payload: {
                shotCount: completed.shot_count,
                shotIndex: completed.current_shot_index,
              },
            })
          } else {
            await send({
              ...base,
              type: 'capture:complete',
              payload: {
                shotIndex: current.session.current_shot_index,
                userId: membership?.user_id ?? base.senderUserId,
              },
            })
          }
        }
        return true
      } catch {
        await refresh().catch(() => null)
        return false
      } finally {
        advancingRef.current = false
      }
    },
    [client, eventBase, hydrate, isHost, membership, refresh, send],
  )

  useEffect(() => {
    advanceRef.current = advanceIfComplete
  }, [advanceIfComplete])

  useEffect(() => {
    if (
      !isHost ||
      !snapshot ||
      !['countdown', 'retake-countdown'].includes(snapshot.session.status) ||
      countdownSeconds(
        snapshot.session.capture_at,
        Date.now() + clockOffsetRef.current,
      ) !== 0
    ) {
      return
    }
    const check = () => {
      void refreshRef.current().then((next) => {
        if (next) void advanceRef.current(next)
      })
    }
    check()
    const timer = window.setInterval(check, 1_000)
    return () => window.clearInterval(timer)
  }, [isHost, snapshot])

  const captureLocalFrame = useCallback(
    async (video: HTMLVideoElement | null) => {
      const current = snapshotRef.current
      if (!client || !current || !membership) return false
      const session = current.session
      if (
        !['countdown', 'retake-countdown', 'capturing', 'waiting-for-uploads'].includes(
          session.status,
        )
      ) {
        return false
      }
      const executionKey = `${session.id}:${session.revision}:${session.current_shot_index}:${membership.user_id}`
      if (captureExecutionRef.current.has(executionKey)) return true
      const pendingFrame = pendingFramesRef.current.get(executionKey)
      if (
        !pendingFrame &&
        (!localCameraReady ||
          !input.localStream ||
          !video?.videoWidth ||
          !video.videoHeight)
      ) {
        dispatch({
          type: 'operation',
          operation: 'error',
          error: 'Your local camera is not ready. Start it and retry this capture.',
        })
        return false
      }
      captureExecutionRef.current.add(executionKey)
      dispatch({ type: 'operation', operation: 'capturing' })
      try {
        const frame =
          pendingFrame ??
          (await (async () => {
            const capturedAt = new Date(
              Date.now() + clockOffsetRef.current,
            ).toISOString()
            const captured = await captureVideoFrame(
              video,
              configuration?.cameraSettings ?? bluebooth.cameraSettings,
            )
            const trackSettings =
              input.localStream?.getVideoTracks()[0]?.getSettings()
            const next = {
              ...captured,
              capturedAt,
              metadata: {
                scheduledCaptureAt: session.capture_at,
                actualCaptureAt: capturedAt,
                sourceWidth: trackSettings?.width ?? null,
                sourceHeight: trackSettings?.height ?? null,
              } as Json,
            }
            pendingFramesRef.current.set(executionKey, next)
            media.setCapture(
              session.current_shot_index,
              captured.blob,
              captured.width,
              captured.height,
            )
            return next
          })())
        dispatch({ type: 'operation', operation: 'uploading' })
        const capture = await withBoundedRetry(() =>
          uploadCapture(client, {
            sessionId: session.id,
            roomId: session.room_id,
            shotIndex: session.current_shot_index,
            revision: session.revision,
            blob: frame.blob,
            width: frame.width,
            height: frame.height,
            capturedAt: frame.capturedAt,
            metadata: frame.metadata,
          }),
        )
        const base = eventBase(session.id, session.revision)
        if (base) {
          await send({
            ...base,
            type: 'capture:complete',
            payload: {
              shotIndex: session.current_shot_index,
              userId: membership.user_id,
            },
          })
        }
        dispatch({ type: 'operation', operation: 'waiting' })
        pendingFramesRef.current.delete(executionKey)
        const next = await fetchCaptureSession(client, session.id)
        hydrate(next)
        if (isHost) await advanceIfComplete(next)
        return Boolean(capture)
      } catch (error) {
        captureExecutionRef.current.delete(executionKey)
        dispatch({
          type: 'operation',
          operation: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'The capture upload failed. Retry this shot.',
        })
        return false
      }
    },
    [
      advanceIfComplete,
      bluebooth.cameraSettings,
      configuration?.cameraSettings,
      client,
      eventBase,
      hydrate,
      input.localStream,
      isHost,
      localCameraReady,
      media,
      membership,
      send,
    ],
  )

  const requestRetake = useCallback(
    async (shotIndex: number | null) => {
      const current = snapshotRef.current
      if (!current || !isHost) return false
      if (!client) return false
      try {
        const prepared = await prepareCaptureRetake(client, {
          sessionId: current.session.id,
          expectedRevision: current.session.revision,
          shotIndex,
        })
        captureExecutionRef.current.clear()
        const next = await fetchCaptureSession(client, prepared.id)
        hydrate(next)
        const base = eventBase(prepared.id, prepared.revision)
        if (base) {
          await send({
            ...base,
            type: 'capture:retake',
            payload: { shotIndex, request: false },
          })
        }
        setPendingRetakeIndex(undefined)
        return true
      } catch (error) {
        dispatch({
          type: 'operation',
          operation: 'error',
          error: error instanceof Error ? error.message : 'Retake could not start.',
        })
        return false
      }
    },
    [client, eventBase, hydrate, isHost, send],
  )

  const cancel = useCallback(async () => {
    const current = snapshotRef.current
    if (!client || !current || !isHost) return false
    try {
      const cancelled = await cancelCaptureSession(client, {
        sessionId: current.session.id,
        expectedRevision: current.session.revision,
      })
      const base = eventBase(cancelled.id, cancelled.revision)
      if (base) await send({ ...base, type: 'capture:cancel' })
      snapshotRef.current = null
      setSnapshot(null)
      setConfiguration(null)
      dispatch({ type: 'reset' })
      dispatchBluebooth({ type: 'navigate', screen: 'setup' })
      return true
    } catch (error) {
      dispatch({
        type: 'operation',
        operation: 'error',
        error: error instanceof Error ? error.message : 'Session could not be cancelled.',
      })
      return false
    }
  }, [client, dispatchBluebooth, eventBase, isHost, send])

  const finalizeResult = useCallback(
    async (blob: Blob, width: number, height: number) => {
      const current = snapshotRef.current
      if (!client || !current || !isHost) return false
      dispatch({ type: 'operation', operation: 'uploading' })
      try {
        const path = resultStoragePath(
          current.session.room_id,
          current.session.id,
        )
        await withBoundedRetry(() =>
          uploadPrivateObject(client, {
            path,
            body: blob,
            contentType: 'image/png',
            upsert: true,
          }),
        )
        await createResult(client, {
          sessionId: current.session.id,
          roomId: current.session.room_id,
          storagePath: path,
          width,
          height,
          expectedRevision: current.session.revision,
          metadata: {
            configuration: current.session.configuration,
            captureCount: current.captures.length,
          },
        })
        const next = await fetchCaptureSession(client, current.session.id)
        hydrate(next)
        const base = eventBase(next.session.id, next.session.revision)
        if (base) await send({ ...base, type: 'capture:result-ready' })
        dispatch({ type: 'operation', operation: 'ready' })
        return true
      } catch (error) {
        dispatch({
          type: 'operation',
          operation: 'error',
          error:
            error instanceof Error
              ? error.message
              : 'The final result could not be uploaded.',
        })
        return false
      }
    },
    [client, eventBase, hydrate, isHost, send],
  )

  useEffect(() => {
    if (
      !snapshot ||
      !['countdown', 'retake-countdown'].includes(snapshot.session.status)
    ) {
      return
    }
    const update = () => setNow(Date.now() + clockOffsetRef.current)
    update()
    const timer = window.setInterval(update, 100)
    return () => window.clearInterval(timer)
  }, [snapshot])

  const lastTickRef = useRef<string | null>(null)
  const countdown = countdownSeconds(snapshot?.session.capture_at ?? null, now)
  useEffect(() => {
    if (
      !isHost ||
      countdown === null ||
      !snapshot?.session.capture_at ||
      !['countdown', 'retake-countdown'].includes(snapshot.session.status)
    ) {
      return
    }
    const tickKey = `${snapshot.session.id}:${snapshot.session.revision}:${countdown}`
    if (lastTickRef.current === tickKey) return
    lastTickRef.current = tickKey
    const base = eventBase(snapshot.session.id, snapshot.session.revision)
    if (!base) return
    void send({
      ...base,
      type: 'capture:tick',
      payload: {
        shotIndex: snapshot.session.current_shot_index,
        captureAt: snapshot.session.capture_at,
      },
    })
  }, [countdown, eventBase, isHost, send, snapshot])

  useEffect(() => {
    if (!snapshot || !client) {
      queueMicrotask(() => {
        setSharedCaptureUrls({})
        setResultUrl(null)
        setCustomFrameUrl(null)
      })
      return
    }
    let active = true
    void Promise.all(
      snapshot.captures.map(async (capture) => ({
        capture,
        url: await createPrivateSignedUrl(client, capture.storage_path, 900),
      })),
    )
      .then((entries) => {
        if (!active) return
        const next: SharedCaptureUrls = {}
        for (const { capture, url } of entries) {
          next[capture.shot_index] = {
            ...next[capture.shot_index],
            [capture.role]: url,
          }
        }
        setSharedCaptureUrls(next)
      })
      .catch(() => {
        if (active) {
          dispatch({
            type: 'operation',
            operation: 'error',
            error: 'Shared capture previews could not be loaded.',
          })
        }
      })
    if (snapshot.result) {
      void createPrivateSignedUrl(client, snapshot.result.storage_path, 900)
        .then((url) => {
          if (active) setResultUrl(url)
        })
        .catch(() => {
          if (active) setResultUrl(null)
        })
    } else {
      queueMicrotask(() => {
        if (active) setResultUrl(null)
      })
    }
    if (configuration?.customFrameStoragePath) {
      void createPrivateSignedUrl(
        client,
        configuration.customFrameStoragePath,
        900,
      )
        .then((url) => {
          if (active) setCustomFrameUrl(url)
        })
        .catch(() => {
          if (active) setCustomFrameUrl(null)
        })
    } else {
      queueMicrotask(() => {
        if (active) setCustomFrameUrl(null)
      })
    }
    return () => {
      active = false
    }
  }, [client, configuration?.customFrameStoragePath, snapshot])

  const readiness = useMemo(
    () =>
      Object.fromEntries(
        (snapshot?.readiness ?? [])
          .filter((entry) => entry.revision === snapshot?.session.revision)
          .map((entry) => [entry.user_id, entry.camera_ready]),
      ),
    [snapshot],
  )
  const { bothReady, participantsConnected, canStartCapture } =
    getCaptureReadiness(onlineRoom?.members ?? [], readiness, room.presence)

  const automaticStartKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (
      !isHost ||
      !canStartCapture ||
      !snapshot ||
      snapshot.session.status !== 'waiting-for-ready' ||
      snapshot.session.revision === 0
    ) {
      return
    }
    const key = `${snapshot.session.id}:${snapshot.session.revision}`
    if (automaticStartKeyRef.current === key) return
    automaticStartKeyRef.current = key
    const timer = window.setTimeout(
      () => void startCountdown(),
      Math.max(0, (configuration?.shotDelay ?? 0) * 1000),
    )
    return () => window.clearTimeout(timer)
  }, [
    canStartCapture,
    configuration?.shotDelay,
    isHost,
    snapshot,
    startCountdown,
  ])

  return {
    enabled: isOnline,
    isHost,
    state,
    snapshot,
    configuration,
    sharedCaptureUrls,
    resultUrl,
    customFrameUrl,
    countdown,
    bothReady,
    participantsConnected,
    canStartCapture,
    readiness,
    pendingRetakeIndex,
    startSession,
    startCountdown,
    acknowledgeReady: retryReadiness,
    captureLocalFrame,
    requestRetake,
    acceptPendingRetake: () =>
      pendingRetakeIndex !== undefined
        ? requestRetake(pendingRetakeIndex)
        : Promise.resolve(false),
    dismissPendingRetake: () => setPendingRetakeIndex(undefined),
    cancel,
    finalizeResult,
    refresh,
  }
}

export type SynchronizedCaptureController = ReturnType<
  typeof useSynchronizedCapture
>
