import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { getPublicSupabaseConfig } from '@/lib/supabase/env'
import type { Database } from '@/types/database'

export async function createServerSupabaseClient(): Promise<SupabaseClient<Database> | null> {
  const config = getPublicSupabaseConfig()
  if (!config) return null
  const cookieStore = await cookies()
  return createServerClient<Database>(config.url, config.publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components cannot write cookies. proxy.ts performs refresh writes.
        }
      },
    },
  })
}
