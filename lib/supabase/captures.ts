import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAuthenticatedUserId } from '@/lib/supabase/auth'
import { throwPostgrestError } from '@/lib/supabase/errors'
import { fetchCurrentMembership } from '@/lib/supabase/rooms'
import type { Database } from '@/types/database'
import type { CaptureRow } from '@/types/supabase'

export interface UpsertCaptureInput {
  sessionId: string
  roomId: string
  shotIndex: number
  storagePath: string
  width: number
  height: number
  mimeType: 'image/webp' | 'image/jpeg'
}

export async function upsertCapture(
  client: SupabaseClient<Database>,
  input: UpsertCaptureInput,
): Promise<CaptureRow> {
  const userId = await requireAuthenticatedUserId(client)
  const membership = await fetchCurrentMembership(client, input.roomId, userId)
  const { data, error } = await client
    .from('captures')
    .upsert(
      {
        session_id: input.sessionId,
        room_id: input.roomId,
        shot_index: input.shotIndex,
        user_id: userId,
        role: membership.role,
        storage_path: input.storagePath,
        width: input.width,
        height: input.height,
        mime_type: input.mimeType,
      },
      { onConflict: 'session_id,shot_index,user_id' },
    )
    .select()
    .single()
  if (error) throwPostgrestError(error)
  return data
}
