import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAuthenticatedUserId } from '@/lib/supabase/auth'
import { throwPostgrestError } from '@/lib/supabase/errors'
import type { Database } from '@/types/database'
import type {
  CaptureReadinessRow,
  CaptureRow,
  CreateSessionInput,
  PhotoboothSessionRow,
  ResultRow,
} from '@/types/supabase'

export interface CaptureSessionSnapshot {
  session: PhotoboothSessionRow
  readiness: CaptureReadinessRow[]
  captures: CaptureRow[]
  result: ResultRow | null
}

export async function createPhotoboothSession(
  client: SupabaseClient<Database>,
  input: CreateSessionInput,
): Promise<PhotoboothSessionRow> {
  await requireAuthenticatedUserId(client)
  const { data, error } = await client.rpc('create_capture_session', {
    p_room_id: input.roomId,
    p_configuration: input.configuration,
    p_shot_count: input.shotCount,
  })
  if (error) throwPostgrestError(error)
  return data
}

export async function acknowledgeCaptureReady(
  client: SupabaseClient<Database>,
  input: {
    sessionId: string
    expectedRevision: number
    cameraReady: boolean
  },
): Promise<CaptureReadinessRow> {
  const { data, error } = await client.rpc('acknowledge_capture_ready', {
    p_session_id: input.sessionId,
    p_expected_revision: input.expectedRevision,
    p_camera_ready: input.cameraReady,
  })
  if (error) throwPostgrestError(error)
  return data
}

export async function attachCaptureCustomFrame(
  client: SupabaseClient<Database>,
  input: {
    sessionId: string
    expectedRevision: number
    storagePath: string
  },
): Promise<PhotoboothSessionRow> {
  const { data, error } = await client.rpc('attach_capture_custom_frame', {
    p_session_id: input.sessionId,
    p_expected_revision: input.expectedRevision,
    p_storage_path: input.storagePath,
  })
  if (error) throwPostgrestError(error)
  return data
}

export async function scheduleCaptureShot(
  client: SupabaseClient<Database>,
  input: { sessionId: string; expectedRevision: number; leadMs: number },
): Promise<PhotoboothSessionRow> {
  const { data, error } = await client.rpc('schedule_capture_shot', {
    p_session_id: input.sessionId,
    p_expected_revision: input.expectedRevision,
    p_lead_ms: input.leadMs,
  })
  if (error) throwPostgrestError(error)
  return data
}

export async function completeCaptureShot(
  client: SupabaseClient<Database>,
  input: { sessionId: string; expectedRevision: number },
): Promise<PhotoboothSessionRow> {
  const { data, error } = await client.rpc('complete_capture_shot', {
    p_session_id: input.sessionId,
    p_expected_revision: input.expectedRevision,
  })
  if (error) throwPostgrestError(error)
  return data
}

export async function prepareCaptureRetake(
  client: SupabaseClient<Database>,
  input: {
    sessionId: string
    expectedRevision: number
    shotIndex: number | null
  },
): Promise<PhotoboothSessionRow> {
  const { data, error } = await client.rpc('prepare_capture_retake', {
    p_session_id: input.sessionId,
    p_expected_revision: input.expectedRevision,
    p_shot_index: input.shotIndex,
  })
  if (error) throwPostgrestError(error)
  return data
}

export async function cancelCaptureSession(
  client: SupabaseClient<Database>,
  input: { sessionId: string; expectedRevision: number },
): Promise<PhotoboothSessionRow> {
  const { data, error } = await client.rpc('cancel_capture_session', {
    p_session_id: input.sessionId,
    p_expected_revision: input.expectedRevision,
  })
  if (error) throwPostgrestError(error)
  return data
}

export async function fetchCaptureSession(
  client: SupabaseClient<Database>,
  sessionId: string,
): Promise<CaptureSessionSnapshot> {
  const [sessionResponse, readinessResponse, capturesResponse, resultResponse] =
    await Promise.all([
      client.from('photobooth_sessions').select('*').eq('id', sessionId).single(),
      client
        .from('capture_session_readiness')
        .select('*')
        .eq('session_id', sessionId),
      client
        .from('captures')
        .select('*')
        .eq('session_id', sessionId)
        .order('shot_index')
        .order('role'),
      client.from('results').select('*').eq('session_id', sessionId).maybeSingle(),
    ])
  if (sessionResponse.error) throwPostgrestError(sessionResponse.error)
  if (readinessResponse.error) throwPostgrestError(readinessResponse.error)
  if (capturesResponse.error) throwPostgrestError(capturesResponse.error)
  if (resultResponse.error) throwPostgrestError(resultResponse.error)
  return {
    session: sessionResponse.data,
    readiness: readinessResponse.data,
    captures: capturesResponse.data,
    result: resultResponse.data,
  }
}

export async function fetchActiveCaptureSession(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<CaptureSessionSnapshot | null> {
  const { data: room, error } = await client
    .from('rooms')
    .select('active_session_id')
    .eq('id', roomId)
    .single()
  if (error) throwPostgrestError(error)
  return room.active_session_id
    ? fetchCaptureSession(client, room.active_session_id)
    : null
}

export async function measureCaptureClockOffset(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<number> {
  const startedAt = Date.now()
  const { data, error } = await client.rpc('get_capture_server_time', {
    p_room_id: roomId,
  })
  const finishedAt = Date.now()
  if (error) throwPostgrestError(error)
  return Date.parse(data) - (startedAt + finishedAt) / 2
}
