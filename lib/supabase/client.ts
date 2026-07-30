'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getPublicSupabaseConfig } from '@/lib/supabase/env'
import type { Database } from '@/types/database'

let browserClient: SupabaseClient<Database> | null | undefined

export function getBrowserSupabaseClient(): SupabaseClient<Database> | null {
  if (browserClient !== undefined) return browserClient
  const config = getPublicSupabaseConfig()
  browserClient = config
    ? createBrowserClient<Database>(config.url, config.publishableKey)
    : null
  return browserClient
}
