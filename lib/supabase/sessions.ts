import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAuthenticatedUserId } from '@/lib/supabase/auth'
import { throwPostgrestError } from '@/lib/supabase/errors'
import type { Database } from '@/types/database'
import type { CreateSessionInput, PhotoboothSessionRow } from '@/types/supabase'

export async function createPhotoboothSession(
  client: SupabaseClient<Database>,
  input: CreateSessionInput,
): Promise<PhotoboothSessionRow> {
  const userId = await requireAuthenticatedUserId(client)
  const { data, error } = await client
    .from('photobooth_sessions')
    .insert({
      room_id: input.roomId,
      created_by: userId,
      configuration: input.configuration,
      shot_count: input.shotCount,
    })
    .select()
    .single()
  if (error) throwPostgrestError(error)
  return data
}
