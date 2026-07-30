import type { SupabaseClient, User } from '@supabase/supabase-js'
import { SupabaseServiceError } from '@/lib/supabase/errors'
import type { Database } from '@/types/database'

const pendingAuth = new WeakMap<SupabaseClient<Database>, Promise<User>>()

export function ensureAnonymousAuth(client: SupabaseClient<Database>): Promise<User> {
  const pending = pendingAuth.get(client)
  if (pending) return pending

  const request = (async () => {
    const { data: sessionData, error: sessionError } = await client.auth.getSession()
    if (sessionError) {
      throw new SupabaseServiceError(sessionError.message, sessionError.code)
    }
    if (sessionData.session?.user) return sessionData.session.user

    const { data, error } = await client.auth.signInAnonymously()
    if (error) throw new SupabaseServiceError(error.message, error.code)
    if (!data.user) throw new SupabaseServiceError('Anonymous authentication returned no user')
    return data.user
  })().finally(() => {
    pendingAuth.delete(client)
  })

  pendingAuth.set(client, request)
  return request
}

export async function requireAuthenticatedUserId(
  client: SupabaseClient<Database>,
): Promise<string> {
  const { data, error } = await client.auth.getUser()
  if (error) throw new SupabaseServiceError(error.message, error.code)
  if (!data.user) throw new SupabaseServiceError('Authentication is required', 'AUTH_REQUIRED')
  return data.user.id
}
