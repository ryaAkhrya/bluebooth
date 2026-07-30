import type { SharedSetupPatch, SharedSetupSettings } from '@/lib/bluebooth/shared-settings'
import type { RoomMemberRow, RoomRow } from '@/types/supabase'

export type RoomMode = 'local' | 'online'
export type RoomConnectionStatus =
  | 'offline'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'

export type RoomPresenceStage = 'waiting' | 'setup'

export interface RoomPresence {
  userId: string
  displayName: string
  role: 'host' | 'partner'
  stage: RoomPresenceStage
  cameraReady: boolean
  joinedAt: string
}

export interface OnlineRoomState {
  room: RoomRow
  membership: RoomMemberRow
  members: RoomMemberRow[]
  settings: SharedSetupSettings
  settingsRevision: number
}

export interface RoomSettingsEvent {
  eventId: string
  roomId: string
  senderUserId: string
  sentAt: string
  revision: number
  payload: SharedSetupPatch
}

export interface RoomLifecycleEvent {
  eventId: string
  roomId: string
  senderUserId: string
  sentAt: string
  event: 'setup-entered' | 'member-left'
}
