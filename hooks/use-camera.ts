'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { CameraStatus } from '@/types/bluebooth'

export function useCamera() {
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState('')

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
    setStatus('stopped')
  }, [])

  const request = useCallback(async (nextDeviceId?: string) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable')
      return
    }
    setStatus('requesting')
    streamRef.current?.getTracks().forEach((track) => track.stop())
    try {
      const nextStream = await navigator.mediaDevices.getUserMedia({
        video: nextDeviceId
          ? { deviceId: { exact: nextDeviceId } }
          : { facingMode: 'user' },
        audio: false,
      })
      streamRef.current = nextStream
      setStream(nextStream)
      setStatus('ready')
      const available = await navigator.mediaDevices.enumerateDevices()
      const cameras = available.filter((device) => device.kind === 'videoinput')
      setDevices(cameras)
      setDeviceId(nextDeviceId ?? nextStream.getVideoTracks()[0]?.getSettings().deviceId ?? '')
    } catch (error) {
      const name = error instanceof DOMException ? error.name : ''
      setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'unavailable')
      setStream(null)
    }
  }, [])

  useEffect(() => stop, [stop])

  return { stream, status, devices, deviceId, request, stop }
}
