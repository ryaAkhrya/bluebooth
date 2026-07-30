'use client'

import { Download, Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useToast } from '@/components/bluebooth/ui/toast-provider'
import { renderFinalCanvas } from '@/lib/bluebooth/canvas-renderer'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'
import { useLocalResult } from '@/hooks/use-local-result'

export function FinalScreen() {
  const { state, dispatch } = useBluebooth()
  const toast = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState(false)
  const { save } = useLocalResult()
  const grid = getGridPreset(state.selectedGrid)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let active = true
    void renderFinalCanvas(canvas, state).then((image) => {
      if (!active) return
      if (state.finalImage !== image) dispatch({ type: 'set-final-image', image })
      setReady(true)
    }).catch(() => toast('Final image could not be rendered.', 'error'))
    return () => { active = false }
  }, [dispatch, state, toast])

  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob((blob) => {
      if (!blob) return toast('Download could not be prepared.', 'error')
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `bluebooth-${state.roomCode || 'room'}-${new Date().toISOString().slice(0, 10)}.png`
      anchor.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  }
  const saveResult = () => {
    if (!state.finalImage) return
    try {
      save({
        image: state.finalImage,
        code: state.roomCode,
        roomName: state.roomName,
        gridName: grid.name,
        dimensions: grid.output,
        createdAt: new Date().toISOString(),
      })
      setSaved(true)
      toast('Result saved in this browser.', 'success')
    } catch {
      toast('Browser storage is full. Download the image instead.', 'error')
    }
  }
  return (
    <main className="bb-final bb-screen">
      <header className="bb-centered-heading"><span className="bb-eyebrow">Final result</span><h1>Your Bluebooth photo</h1><p>{grid.name} · {grid.output.join('×')} px</p></header>
      <div className="bb-final-canvas"><canvas ref={canvasRef} aria-label="Final composed photobooth image" /></div>
      <div className="bb-final-actions">
        <button className="bb-primary-button" disabled={!ready} onClick={download}><Download /> Download PNG</button>
        <button className="bb-secondary-button" disabled={!ready || saved} onClick={saveResult}><Save /> {saved ? 'Saved' : 'Save result'}</button>
      </div>
      <button className="bb-text-button" onClick={() => { dispatch({ type: 'reset-room' }) }}>Create another booth</button>
    </main>
  )
}
