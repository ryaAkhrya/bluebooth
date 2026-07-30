'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CameraStatus } from '@/types/bluebooth'

export function useCamera() {
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')
  const requestIdRef = useRef(0)
  const pendingRef = useRef<Promise<void> | null>(null)

  const stop = useCallback(() => {
    requestIdRef.current += 1
    pendingRef.current = null
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
    setStatus('stopped')
  }, [])

  const request = useCallback((nextDeviceId?: string): Promise<void> => {
    if (pendingRef.current) return pendingRef.current
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      return Promise.resolve()
    }
    const requestId = ++requestIdRef.current
    setStatus('requesting')
    const previous = streamRef.current
    previous?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
    const pending = (async () => {
      try {
        const nextStream = await navigator.mediaDevices.getUserMedia({
          video: nextDeviceId
            ? { deviceId: { exact: nextDeviceId } }
            : { facingMode: 'user' },
          audio: false,
        })
        if (requestId !== requestIdRef.current) {
          nextStream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = nextStream
        setStream(nextStream)
        setStatus('ready')
        const available = await navigator.mediaDevices.enumerateDevices()
        if (requestId !== requestIdRef.current) return
        setDevices(available.filter((device) => device.kind === 'videoinput'))
        setDeviceId(
          nextDeviceId ?? nextStream.getVideoTracks()[0]?.getSettings().deviceId ?? '',
        )
      } catch (error) {
        if (requestId !== requestIdRef.current) return
        const name = error instanceof DOMException ? error.name : ''
        setStatus(
          name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable',
        )
        setStream(null)
      }
    })().finally(() => {
      if (pendingRef.current === pending) pendingRef.current = null
    })
    pendingRef.current = pending
    return pending
  }, [])

  useEffect(() => stop, [stop])

  return { stream, status, devices, deviceId, request, stop }
}
