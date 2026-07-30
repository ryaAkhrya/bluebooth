import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAuthenticatedUserId } from '@/lib/supabase/auth'
import { throwPostgrestError } from '@/lib/supabase/errors'
import type { Database, Json } from '@/types/database'
import type { ResultRow } from '@/types/supabase'

export interface CreateResultInput {
  sessionId: string
  roomId: string
  storagePath: string
  width: number
  height: number
  metadata?: Json
}

export async function createResult(
  client: SupabaseClient<Database>,
  input: CreateResultInput,
): Promise<ResultRow> {
  const userId = await requireAuthenticatedUserId(client)
  const { data, error } = await client
    .from('results')
    .insert({
      session_id: input.sessionId,
      room_id: input.roomId,
      created_by: userId,
      storage_path: input.storagePath,
      width: input.width,
      height: input.height,
      metadata: input.metadata ?? {},
    })
    .select()
    .single()
  if (error) throwPostgrestError(error)
  return data
}
