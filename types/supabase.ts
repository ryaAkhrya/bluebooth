import type { Database, Json } from '@/types/database'

export type RoomRow = Database['public']['Tables']['rooms']['Row']
export type RoomMemberRow = Database['public']['Tables']['room_members']['Row']
export type PhotoboothSessionRow =
  Database['public']['Tables']['photobooth_sessions']['Row']
export type CaptureRow = Database['public']['Tables']['captures']['Row']
export type ResultRow = Database['public']['Tables']['results']['Row']

export interface RoomAccess {
  roomId: string
  code: string
  name: string
  role: 'host' | 'partner'
  status: RoomRow['status']
  settingsRevision: number
  expiresAt: string
}

export interface RoomState {
  room: RoomRow
  members: RoomMemberRow[]
}

export interface RoomSettingsState {
  roomId: string
  sharedSettings: Json
  settingsRevision: number
  updatedAt: string
}

export interface CreateSessionInput {
  roomId: string
  configuration: Json
  shotCount: number
}
