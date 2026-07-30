'use client'

import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])
  if (!open) return null
  return (
    <div className="bb-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="bb-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bb-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="bb-modal-header">
          <h2 id="bb-modal-title">{title}</h2>
          <button className="bb-icon-button" aria-label="Close" onClick={onClose}><X /></button>
        </header>
        {children}
      </section>
    </div>
  )
}
