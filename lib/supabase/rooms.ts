import type { SupabaseClient } from '@supabase/supabase-js'
import { SupabaseServiceError, throwPostgrestError } from '@/lib/supabase/errors'
import type { Database, Json } from '@/types/database'
import type { RoomAccess, RoomMemberRow, RoomState } from '@/types/supabase'

type RoomAccessRecord = Database['public']['CompositeTypes']['room_access']

function mapRoomAccess(record: RoomAccessRecord | undefined): RoomAccess {
  if (
    !record?.room_id ||
    !record.code ||
    !record.name ||
    !record.role ||
    !record.status ||
    record.settings_revision === null ||
    !record.expires_at
  ) {
    throw new SupabaseServiceError('The room operation returned an invalid payload')
  }
  return {
    roomId: record.room_id,
    code: record.code,
    name: record.name,
    role: record.role,
    status: record.status,
    settingsRevision: record.settings_revision,
    expiresAt: record.expires_at,
  }
}

export async function createRoom(
  client: SupabaseClient<Database>,
  input: { displayName: string; roomName: string },
): Promise<RoomAccess> {
  const { data, error } = await client.rpc('create_room', {
    p_display_name: input.displayName,
    p_room_name: input.roomName,
  })
  if (error) throwPostgrestError(error)
  return mapRoomAccess(data?.[0])
}

export async function joinRoom(
  client: SupabaseClient<Database>,
  input: { code: string; displayName: string },
): Promise<RoomAccess> {
  const { data, error } = await client.rpc('join_room', {
    p_room_code: input.code,
    p_display_name: input.displayName,
  })
  if (error) throwPostgrestError(error)
  return mapRoomAccess(data?.[0])
}

export async function leaveRoom(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('leave_room', { p_room_id: roomId })
  if (error) throwPostgrestError(error)
  return data
}

export async function updateRoomSettings(
  client: SupabaseClient<Database>,
  input: { roomId: string; expectedRevision: number; patch: Json },
): Promise<RoomAccess> {
  const { data, error } = await client.rpc('update_room_settings', {
    p_room_id: input.roomId,
    p_expected_revision: input.expectedRevision,
    p_settings_patch: input.patch,
  })
  if (error) throwPostgrestError(error)
  return mapRoomAccess(data?.[0])
}

export async function fetchRoomState(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<RoomState> {
  const [roomResponse, membersResponse] = await Promise.all([
    client.from('rooms').select('*').eq('id', roomId).single(),
    client
      .from('room_members')
      .select('*')
      .eq('room_id', roomId)
      .is('left_at', null)
      .order('joined_at'),
  ])
  if (roomResponse.error) throwPostgrestError(roomResponse.error)
  if (membersResponse.error) throwPostgrestError(membersResponse.error)
  return { room: roomResponse.data, members: membersResponse.data }
}

export async function fetchCurrentMembership(
  client: SupabaseClient<Database>,
  roomId: string,
  userId: string,
): Promise<RoomMemberRow> {
  const { data, error } = await client
    .from('room_members')
    .select('*')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .is('left_at', null)
    .single()
  if (error) throwPostgrestError(error)
  return data
}
