import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAuthenticatedUserId } from '@/lib/supabase/auth'
import { throwPostgrestError } from '@/lib/supabase/errors'
import { captureStoragePath, uploadPrivateObject } from '@/lib/supabase/storage'
import type { Database } from '@/types/database'
import type { Json } from '@/types/database'
import type { CaptureRow } from '@/types/supabase'

export interface UpsertCaptureInput {
  sessionId: string
  roomId: string
  shotIndex: number
  storagePath: string
  width: number
  height: number
  mimeType: 'image/webp' | 'image/jpeg'
  revision: number
  capturedAt: string
  metadata?: Json
}

export async function upsertCapture(
  client: SupabaseClient<Database>,
  input: UpsertCaptureInput,
): Promise<CaptureRow> {
  await requireAuthenticatedUserId(client)
  const { data, error } = await client.rpc('submit_capture_metadata', {
    p_session_id: input.sessionId,
    p_expected_revision: input.revision,
    p_shot_index: input.shotIndex,
    p_storage_path: input.storagePath,
    p_width: input.width,
    p_height: input.height,
    p_mime_type: input.mimeType,
    p_captured_at: input.capturedAt,
    p_metadata: input.metadata ?? {},
  })
  if (error) throwPostgrestError(error)
  return data
}

export async function uploadCapture(
  client: SupabaseClient<Database>,
  input: {
    sessionId: string
    roomId: string
    shotIndex: number
    revision: number
    blob: Blob
    width: number
    height: number
    capturedAt: string
    metadata?: Json
  },
): Promise<CaptureRow> {
  const userId = await requireAuthenticatedUserId(client)
  const mimeType =
    input.blob.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp'
  const storagePath = captureStoragePath({
    roomId: input.roomId,
    sessionId: input.sessionId,
    userId,
    shotIndex: input.shotIndex,
    mimeType,
  })
  await uploadPrivateObject(client, {
    path: storagePath,
    body: input.blob,
    contentType: mimeType,
    upsert: true,
  })
  return upsertCapture(client, {
    sessionId: input.sessionId,
    roomId: input.roomId,
    shotIndex: input.shotIndex,
    storagePath,
    width: input.width,
    height: input.height,
    mimeType,
    revision: input.revision,
    capturedAt: input.capturedAt,
    metadata: input.metadata,
  })
}
