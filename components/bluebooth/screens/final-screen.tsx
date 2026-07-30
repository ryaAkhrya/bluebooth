'use client'

import { Download, Save } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useLocalMedia } from '@/components/bluebooth/state/local-media'
import { useToast } from '@/components/bluebooth/ui/toast-provider'
import { renderComposition } from '@/lib/bluebooth/canvas-renderer'
import { getGridPreset } from '@/lib/bluebooth/presets/grids'
import { getFramePreset } from '@/lib/bluebooth/presets/frames'
import { buildResultFilename } from '@/lib/bluebooth/image'
import { useLocalResult } from '@/hooks/use-local-result'
import type { SynchronizedCaptureController } from '@/hooks/use-synchronized-capture'
import { resolveCapturedSlotImages } from '@/lib/bluebooth/capture-events'
import { releaseFinalRenderKey } from '@/lib/bluebooth/final-result'

export function FinalScreen({
  synchronizedCapture,
}: {
  synchronizedCapture: SynchronizedCaptureController
}) {
  if (synchronizedCapture.enabled && synchronizedCapture.configuration) {
    return <SynchronizedFinalScreen synchronizedCapture={synchronizedCapture} />
  }
  return <LocalFinalScreen />
}

function SynchronizedFinalScreen({
  synchronizedCapture,
}: {
  synchronizedCapture: SynchronizedCaptureController
}) {
  const { state } = useBluebooth()
  const media = useLocalMedia()
  const toast = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderingKeyRef = useRef<string | null>(null)
  const configuration = synchronizedCapture.configuration
  const session = synchronizedCapture.snapshot?.session
  const result = synchronizedCapture.snapshot?.result
  const isHost = synchronizedCapture.isHost
  const customFrameUrl = synchronizedCapture.customFrameUrl
  const finalizeResult = synchronizedCapture.finalizeResult
  const setFinalResult = media.setFinalResult
  const total = session?.shot_count ?? 0
  const grid = getGridPreset(configuration?.selectedGrid ?? state.selectedGrid)
  const frame = getFramePreset(configuration?.selectedFrame ?? state.selectedFrame)
  const slotImages = useMemo(
    () =>
      configuration
        ? resolveCapturedSlotImages(
            configuration,
            total,
            synchronizedCapture.sharedCaptureUrls,
          )
        : [],
    [configuration, synchronizedCapture.sharedCaptureUrls, total],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (
      !canvas ||
      !configuration ||
      !session ||
      !isHost ||
      result ||
      slotImages.some((source) => !source)
    ) {
      return
    }
    const key = `${session.id}:${session.revision}`
    if (renderingKeyRef.current === key) return
    renderingKeyRef.current = key
    let active = true
    void renderComposition(canvas, {
      preset: grid,
      frame,
      layout: configuration.layout,
      frameOptions: configuration.frameOptions,
      customFrame:
        configuration.customFrame && customFrameUrl
          ? {
              ...configuration.customFrame,
              source: customFrameUrl,
            }
          : null,
      slotImages,
      roomCode: state.roomCode,
      roomName: state.roomName,
    })
      .then(async (blob) => {
        if (!active) return
        setFinalResult(blob, grid.output[0], grid.output[1])
        const saved = await finalizeResult(
          blob,
          grid.output[0],
          grid.output[1],
        )
        if (!saved && active) {
          renderingKeyRef.current = null
          toast('Final image upload failed. Retry from this screen.', 'error')
        }
      })
      .catch(() => {
        renderingKeyRef.current = null
        if (active) toast('Final image could not be rendered.', 'error')
      })
    return () => {
      active = false
      renderingKeyRef.current = releaseFinalRenderKey(
        renderingKeyRef.current,
        key,
      )
    }
  }, [
    configuration,
    customFrameUrl,
    finalizeResult,
    frame,
    grid,
    isHost,
    result,
    session,
    setFinalResult,
    slotImages,
    state.roomCode,
    state.roomName,
    toast,
  ])

  const download = () => {
    const source =
      synchronizedCapture.resultUrl ?? media.finalResult?.url ?? null
    if (!source) return
    const anchor = document.createElement('a')
    anchor.href = source
    anchor.download = buildResultFilename(state.roomCode, new Date())
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  return (
    <main className="bb-final bb-screen">
      <header className="bb-centered-heading">
        <span className="bb-eyebrow">Shared final result</span>
        <h1>Your Bluebooth photo</h1>
        <p>
          {grid.name} · {grid.output.join('×')} px
        </p>
      </header>
      <div className="bb-final-canvas">
        {synchronizedCapture.isHost ? (
          <canvas ref={canvasRef} aria-label="Final composed photobooth image" />
        ) : synchronizedCapture.resultUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={synchronizedCapture.resultUrl}
            alt="Final composed photobooth result"
          />
        ) : (
          <div className="bb-session-fallback">
            Waiting for the host to finish the shared result
          </div>
        )}
      </div>
      <div className="bb-final-actions">
        <button
          className="bb-primary-button"
          disabled={
            !synchronizedCapture.resultUrl && !media.finalResult
          }
          onClick={download}
        >
          <Download /> Download PNG
        </button>
      </div>
      {synchronizedCapture.state.error && (
        <div className="bb-capture-readiness">
          <span className="is-error">{synchronizedCapture.state.error}</span>
          <button
            className="bb-secondary-button"
            onClick={() => {
              if (synchronizedCapture.isHost && media.finalResult) {
                void synchronizedCapture.finalizeResult(
                  media.finalResult.blob,
                  grid.output[0],
                  grid.output[1],
                )
              } else {
                void synchronizedCapture.refresh()
              }
            }}
          >
            Retry
          </button>
        </div>
      )}
    </main>
  )
}

function LocalFinalScreen() {
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
