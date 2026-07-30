'use client'

import { useEffect, useRef } from 'react'

export function useDemoPartner(enabled: boolean) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!enabled || !canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frameId = 0
    let tick = 0
    const draw = () => {
      const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height)
      gradient.addColorStop(0, '#dceeff')
      gradient.addColorStop(1, '#8fc5ff')
      context.fillStyle = gradient
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.fillStyle = 'rgba(255,255,255,.55)'
      for (let index = 0; index < 5; index += 1) {
        const y = (Math.sin(tick + index) * 0.5 + 0.5) * canvas.height
        context.beginPath()
        context.arc(45 + index * 60, y, 24 + index * 3, 0, Math.PI * 2)
        context.fill()
      }
      tick += 0.025
      if (!reduced) frameId = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frameId)
  }, [enabled])

  return canvasRef
}
