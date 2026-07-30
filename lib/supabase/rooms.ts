import type { SupabaseClient } from '@supabase/supabase-js'
import {
  SupabaseServiceError,
  roomServiceError,
  throwPostgrestError,
} from '@/lib/supabase/errors'
import type { Database, Json } from '@/types/database'
import type {
  RoomAccess,
  RoomMemberRow,
  RoomSettingsState,
  RoomState,
} from '@/types/supabase'

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
  if (error) throw roomServiceError(error)
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
  if (error) throw roomServiceError(error)
  return mapRoomAccess(data?.[0])
}

export async function leaveRoom(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<boolean> {
  const { data, error } = await client.rpc('leave_room', { p_room_id: roomId })
  if (error) throw roomServiceError(error)
  return data
}

export async function updateRoomSettings(
  client: SupabaseClient<Database>,
  input: { roomId: string; expectedRevision: number; patch: Json },
): Promise<RoomSettingsState> {
  const { data, error } = await client.rpc('update_room_settings', {
    p_room_id: input.roomId,
    p_expected_revision: input.expectedRevision,
    p_settings_patch: input.patch,
  })
  if (error) throw roomServiceError(error)
  const record = data?.[0]
  if (
    !record?.room_id ||
    record.shared_settings === null ||
    record.settings_revision === null ||
    !record.updated_at
  ) {
    throw new SupabaseServiceError('The settings operation returned an invalid payload')
  }
  return {
    roomId: record.room_id,
    sharedSettings: record.shared_settings,
    settingsRevision: record.settings_revision,
    updatedAt: record.updated_at,
  }
}

export async function enterRoomSetup(
  client: SupabaseClient<Database>,
  roomId: string,
): Promise<void> {
  const { error } = await client.rpc('enter_room_setup', { p_room_id: roomId })
  if (error) throw roomServiceError(error)
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

export async function fetchRoomStateByCode(
  client: SupabaseClient<Database>,
  code: string,
  userId: string,
): Promise<(RoomState & { membership: RoomMemberRow }) | null> {
  const normalized = normalizeRoomCode(code)
  if (!isValidRoomCode(normalized)) return null
  const { data: room, error } = await client
    .from('rooms')
    .select('*')
    .eq('code', normalized)
    .maybeSingle()
  if (error) throwPostgrestError(error)
  if (!room) return null
  const state = await fetchRoomState(client, room.id)
  const membership = state.members.find((member) => member.user_id === userId)
  return membership ? { ...state, membership } : null
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

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase()
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code)
}
