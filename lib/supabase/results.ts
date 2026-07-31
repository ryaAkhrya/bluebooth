import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAuthenticatedUserId } from '@/lib/supabase/auth'
import { throwPostgrestError } from '@/lib/supabase/errors'
import { removePrivateObjects } from '@/lib/supabase/storage'
import type { Database, Json } from '@/types/database'
import type { ResultHistoryRow, ResultRow } from '@/types/supabase'

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

export interface ResultHistoryCursor {
  createdAt: string
  resultId: string
}

export interface ResultHistoryItem {
  id: string
  sessionId: string
  roomId: string
  roomCode: string
  roomName: string
  storagePath: string
  width: number
  height: number
  metadata: Json
  createdAt: string
  canDelete: boolean
}

export interface ResultHistoryPage {
  items: ResultHistoryItem[]
  nextCursor: ResultHistoryCursor | null
}

function mapHistoryRow(row: ResultHistoryRow): ResultHistoryItem {
  return {
    id: row.result_id,
    sessionId: row.session_id,
    roomId: row.room_id,
    roomCode: row.room_code,
    roomName: row.room_name,
    storagePath: row.storage_path,
    width: row.width,
    height: row.height,
    metadata: row.metadata,
    createdAt: row.created_at,
    canDelete: row.can_delete,
  }
}

export async function listResultHistory(
  client: SupabaseClient<Database>,
  input: {
    limit?: number
    cursor?: ResultHistoryCursor | null
  } = {},
): Promise<ResultHistoryPage> {
  await requireAuthenticatedUserId(client)
  const limit = Math.min(49, Math.max(1, Math.round(input.limit ?? 12)))
  const { data, error } = await client.rpc('list_result_history', {
    p_limit: limit + 1,
    p_before_created_at: input.cursor?.createdAt ?? null,
    p_before_id: input.cursor?.resultId ?? null,
  })
  if (error) throwPostgrestError(error)
  const hasMore = data.length > limit
  const items = data.slice(0, limit).map(mapHistoryRow)
  const last = items.at(-1)
  return {
    items,
    nextCursor:
      hasMore && last
        ? { createdAt: last.createdAt, resultId: last.id }
        : null,
  }
}

export async function deleteResult(
  client: SupabaseClient<Database>,
  resultId: string,
): Promise<{ result: ResultRow; objectRemoved: boolean }> {
  await requireAuthenticatedUserId(client)
  const { data, error } = await client.rpc('soft_delete_result', {
    p_result_id: resultId,
  })
  if (error) throwPostgrestError(error)
  try {
    await removePrivateObjects(client, [data.storage_path])
    return { result: data, objectRemoved: true }
  } catch {
    return { result: data, objectRemoved: false }
  }
}
