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
  expectedRevision: number
}

export async function createResult(
  client: SupabaseClient<Database>,
  input: CreateResultInput,
): Promise<ResultRow> {
  await requireAuthenticatedUserId(client)
  const { data, error } = await client.rpc('finalize_capture_result', {
    p_session_id: input.sessionId,
    p_expected_revision: input.expectedRevision,
    p_storage_path: input.storagePath,
    p_width: input.width,
    p_height: input.height,
    p_metadata: input.metadata ?? {},
  })
  if (error) throwPostgrestError(error)
  return data
}
