'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ensureAnonymousAuth } from '@/lib/supabase/auth'
import { getBrowserSupabaseClient } from '@/lib/supabase/client'
import { getSupabaseEnvironment } from '@/lib/supabase/env'

export type SupabaseAuthStatus = 'unconfigured' | 'loading' | 'ready' | 'error'

interface SupabaseAuthContextValue {
  status: SupabaseAuthStatus
  userId: string | null
  canRetry: boolean
  retry: () => void
}

const SupabaseAuthContext = createContext<SupabaseAuthContextValue | null>(null)

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const client = useMemo(() => getBrowserSupabaseClient(), [])
  const environment = useMemo(() => getSupabaseEnvironment(), [])
  const [status, setStatus] = useState<SupabaseAuthStatus>(
    client ? 'loading' : environment.status === 'invalid' ? 'error' : 'unconfigured',
  )
  const [userId, setUserId] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => {
    if (!client) {
      setStatus('error')
      return
    }
    setStatus('loading')
    setAttempt((current) => current + 1)
  }, [client])

  useEffect(() => {
    if (!client) return
    let active = true
    void ensureAnonymousAuth(client)
      .then((user) => {
        if (!active) return
        setUserId(user.id)
        setStatus('ready')
      })
      .catch(() => {
        if (!active) return
        setUserId(null)
        setStatus('error')
      })

    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (!active) return
      if (session?.user) {
        setUserId(session.user.id)
        setStatus('ready')
      } else if (event === 'SIGNED_OUT') {
        setUserId(null)
        setStatus('error')
      }
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [attempt, client])

  const value = useMemo(
    () => ({ status, userId, canRetry: client !== null, retry }),
    [client, retry, status, userId],
  )
  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>
}

export function useSupabaseAuth() {
  const value = useContext(SupabaseAuthContext)
  if (!value) throw new Error('useSupabaseAuth must be used inside SupabaseAuthProvider')
  return value
}

export function SupabaseAuthNotice() {
  const { status, canRetry, retry } = useSupabaseAuth()
  if (status !== 'error') return null

  return (
    <div className="bb-supabase-status is-error" role="status">
      <span>Online services unavailable; local mode remains active</span>
      {canRetry && (
        <button type="button" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  )
}
