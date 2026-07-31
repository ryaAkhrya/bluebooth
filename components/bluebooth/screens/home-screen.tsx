'use client'

import { ArrowRight } from 'lucide-react'
import { useEffect, useRef, type PointerEvent } from 'react'
import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'

export function HomeScreen() {
  const { dispatch } = useBluebooth()
  const rootRef = useRef<HTMLElement>(null)
  const frameRef = useRef<number | null>(null)

  const setParallax = (x: number, y: number) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    frameRef.current = window.requestAnimationFrame(() => {
      const root = rootRef.current
      if (!root) return
      const values: Record<string, number> = {
        '--bb-home-stage-x': x * -7,
        '--bb-home-stage-y': y * -6,
        '--bb-home-strip-x': x * 13,
        '--bb-home-strip-y': y * 10,
        '--bb-home-soft-x': x * 8,
        '--bb-home-soft-y': y * 8,
        '--bb-home-side-x': x * 18,
        '--bb-home-side-y': y * 13,
        '--bb-home-reverse-x': x * -10,
        '--bb-home-reverse-y': y * -6,
        '--bb-home-far-x': x * 22,
        '--bb-home-far-y': y * 14,
        '--bb-home-note-x': x * 14,
        '--bb-home-note-y': y * 12,
      }
      for (const [property, value] of Object.entries(values)) {
        root.style.setProperty(property, `${value.toFixed(2)}px`)
      }
    })
  }

  const moveScene = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'touch') return
    const bounds = event.currentTarget.getBoundingClientRect()
    setParallax(
      (event.clientX - bounds.left) / bounds.width - 0.5,
      (event.clientY - bounds.top) / bounds.height - 0.5,
    )
  }

  useEffect(
    () => () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
    },
    [],
  )

  return (
    <main
      ref={rootRef}
      className="bb-home bb-screen"
      onPointerMove={moveScene}
      onPointerLeave={() => setParallax(0, 0)}
    >
      <div className="bb-home-environment" aria-hidden="true">
        <span className="bb-home-light-leak is-one" />
        <span className="bb-home-light-leak is-two" />
        <span className="bb-home-grain" />
        <span className="bb-home-dust is-one" />
        <span className="bb-home-dust is-two" />
        <span className="bb-home-dust is-three" />
      </div>

      <section className="bb-home-copy">
        <p className="bb-home-kicker">A little closer, on film.</p>
        <h1>
          <span className="bb-home-wordmark">LDRoll</span>
          <span className="bb-home-statement">
            A photobooth for people who aren&apos;t in the same place.
          </span>
        </h1>
        <div className="bb-home-intro">
          <p>
            Two cameras, one shared roll. Make something worth keeping,
            together and in real time.
          </p>
          <div className="bb-home-actions">
            <button
              className="bb-home-primary"
              onClick={() => dispatch({ type: 'navigate', screen: 'create' })}
            >
              Create a room <ArrowRight />
            </button>
            <button
              className="bb-home-secondary"
              onClick={() => dispatch({ type: 'navigate', screen: 'join' })}
            >
              Join with code
            </button>
          </div>
          <p className="bb-home-assurance">
            Private room <span /> No account needed
          </p>
        </div>
      </section>

      <div className="bb-home-stage" aria-hidden="true">
        <div className="bb-home-negative">
          {Array.from({ length: 8 }, (_, index) => <i key={index} />)}
        </div>

        <div className="bb-home-polaroid is-back">
          <div className="bb-home-memory is-city"><span /></div>
          <small>same night, different cities</small>
        </div>

        <div className="bb-home-polaroid is-side">
          <div className="bb-home-memory is-window"><span /></div>
          <small>11:42 pm / 2:42 am</small>
        </div>

        <div className="bb-home-strip">
          <div className="bb-home-strip-head">
            <span>LDR / 04</span>
            <span>ROLL 01</span>
          </div>
          <div className="bb-home-frame is-first"><i /><b /></div>
          <div className="bb-home-frame is-second"><i /><b /></div>
          <div className="bb-home-frame is-third"><i /><b /></div>
          <div className="bb-home-frame is-fourth"><i /><b /></div>
          <div className="bb-home-strip-foot">LDRoll · keep the distance, lose the space</div>
        </div>

        <div className="bb-home-time-card">
          <span>LIVE ROLL</span>
          <strong>2 cameras</strong>
          <small>one memory</small>
        </div>

        <div className="bb-home-note">
          <span>ROLL 01</span>
          <strong>Friday, after midnight</strong>
        </div>
      </div>

      <p className="bb-home-index" aria-hidden="true">01 / TOGETHER</p>
    </main>
  )
}
