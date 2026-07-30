'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

interface ToastItem {
  id: number
  message: string
  type: 'default' | 'success' | 'error'
}

const ToastContext = createContext<((message: string, type?: ToastItem['type']) => void) | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const show = useCallback((message: string, type: ToastItem['type'] = 'default') => {
    const id = ++idRef.current
    setItems((current) => [...current, { id, message, type }])
    window.setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 2600)
  }, [])
  const value = useMemo(() => show, [show])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="bb-toast-wrap" aria-live="polite">
        {items.map((item) => (
          <div key={item.id} className={`bb-toast bb-toast-${item.type}`}>
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside ToastProvider')
  return value
}
