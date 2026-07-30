'use client'

import { useEffect, useRef } from 'react'

export function CameraVideo({
  stream,
  className,
  style,
}: {
  stream: MediaStream | null
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = ref.current
    if (!video) return
    video.srcObject = stream
    return () => {
      video.srcObject = null
    }
  }, [stream])

  return <video ref={ref} className={className} style={style} autoPlay playsInline muted />
}
