export type AppScreen =
  | 'home'
  | 'create'
  | 'join'
  | 'waiting'
  | 'setup'
  | 'session'
  | 'review'
  | 'final'

export type SetupStep = 'layout' | 'frame' | 'camera' | 'timer'
export type GridCategory = 'instagram' | 'portrait' | 'landscape' | 'print'
export type CameraMode = 'user' | 'partner' | 'split' | 'alternate'
export type CameraFit = 'cover' | 'contain' | 'fill'
export type CameraStatus = 'idle' | 'requesting' | 'ready' | 'denied' | 'unavailable' | 'stopped'

export interface GridPreset {
  id: string
  name: string
  category: GridCategory
  ratio: string
  output: readonly [number, number]
  columns: number
  rows: number
  areas: readonly (readonly string[])[]
}

export interface FramePreset {
  id: string
  name: string
  background: string
  border: number
  borderColor: string
  padding: number
  inner?: boolean
  film?: boolean
  captionArea?: boolean
  dateArea?: boolean
  topLabel?: boolean
  roundExtra?: boolean
  check?: boolean
  numbering?: boolean
}

export interface CameraFilter {
  id: string
  name: string
  css: string
}

export interface Participant {
  id: 'self' | 'partner'
  name: string
  connected: boolean
  isSelf: boolean
}

export interface LayoutSettings {
  gap: number
  padding: number
  radius: number
  background: string
}

export interface FrameOptions {
  caption: string
  borderColor: string
  borderWidth: number
  showDate: boolean
  showRoom: boolean
}

export interface CustomFrame {
  id: string
  name: string
  width: number
  height: number
  opacity: number
  scale: number
  x: number
  y: number
  fit: CameraFit
  front: boolean
}

export interface CameraSettings {
  mirror: boolean
  brightness: number
  contrast: number
  saturation: number
  warmth: number
  zoom: number
  fit: CameraFit
  filter: string
}

export interface SavedResult {
  image: string
  code: string
  roomName: string
  gridName: string
  dimensions: readonly [number, number]
  createdAt: string
}

export interface BlueboothState {
  screen: AppScreen
  setupStep: SetupStep
  roomCode: string
  roomName: string
  userName: string
  participants: Participant[]
  selectedGrid: string
  selectedFrame: string
  customFrame: CustomFrame | null
  frameOptions: FrameOptions
  layout: LayoutSettings
  cameraMode: CameraMode
  swap: boolean
  cameraSettings: CameraSettings
  timer: 3 | 5 | 10
  shotDelay: number
  timerSound: boolean
  flash: boolean
  retakeIndex: number | null
}
