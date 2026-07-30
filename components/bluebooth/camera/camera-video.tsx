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
    if (ref.current) ref.current.srcObject = stream
  }, [stream])

  return <video ref={ref} className={className} style={style} autoPlay playsInline muted />
}
