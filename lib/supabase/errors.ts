import type { PostgrestError } from '@supabase/supabase-js'

export class SupabaseServiceError extends Error {
  readonly code: string | undefined

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'SupabaseServiceError'
    this.code = code
  }
}

export function throwPostgrestError(error: PostgrestError): never {
  throw new SupabaseServiceError(error.message, error.code)
}
