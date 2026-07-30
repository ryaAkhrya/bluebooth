'use client'

import { Download, Save } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useLocalMedia } from '@/components/bluebooth/state/local-media'
import { useToast } from '@/components/bluebooth/ui/toast-provider'
import { renderComposition } from '@/lib/bluebooth/canvas-renderer'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'
import { getFramePreset } from '@/lib/bluebooth/presets/frames'
import { buildResultFilename } from '@/lib/bluebooth/image'
import { useLocalResult } from '@/hooks/use-local-result'

export function FinalScreen() {
  const { state, dispatch } = useBluebooth()
  const toast = useToast()
  const {
    captures,
    customFrame: customFrameResource,
    finalResult,
    setFinalResult,
    clearAll,
  } = useLocalMedia()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState(false)
  const { save } = useLocalResult()
  const grid = getGridPreset(state.selectedGrid)
  const frame = getFramePreset(state.selectedFrame)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let active = true
    void renderComposition(canvas, {
      preset: grid,
      frame,
      layout: state.layout,
      frameOptions: state.frameOptions,
      customFrame:
        state.customFrame && customFrameResource
          ? { ...state.customFrame, source: customFrameResource.url }
          : null,
      slotImages: captures.map((capture) => capture?.url ?? null),
      roomCode: state.roomCode,
      roomName: state.roomName,
    }).then((blob) => {
      if (!active) return
      setFinalResult(blob, grid.output[0], grid.output[1])
      setReady(true)
    }).catch(() => toast('Final image could not be rendered.', 'error'))
    return () => { active = false }
  }, [
    frame,
    grid,
    captures,
    customFrameResource,
    state.customFrame,
    state.frameOptions,
    state.layout,
    state.roomCode,
    state.roomName,
    setFinalResult,
    toast,
  ])

  const download = () => {
    if (!finalResult) return
    const anchor = document.createElement('a')
    anchor.href = finalResult.url
    anchor.download = buildResultFilename(state.roomCode, new Date())
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }
  const saveResult = async () => {
    if (!finalResult) return
    try {
      await save(finalResult.blob, {
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
        <button className="bb-secondary-button" disabled={!ready || saved} onClick={() => void saveResult()}><Save /> {saved ? 'Saved' : 'Save result'}</button>
      </div>
      <button className="bb-text-button" onClick={() => { clearAll(); dispatch({ type: 'reset-room' }) }}>Create another booth</button>
    </main>
  )
}
