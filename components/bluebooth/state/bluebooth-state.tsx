'use client'

import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import {
  applySharedSetupPatch,
  type SharedSetupPatch,
  type SharedSetupSettings,
} from '@/lib/bluebooth/shared-settings'
import type {
  AppScreen,
  BlueboothState,
  CameraMode,
  CameraSettings,
  CustomFrame,
  FrameOptions,
  LayoutSettings,
  Participant,
  SetupStep,
} from '@/types/bluebooth'

type Action =
  | { type: 'navigate'; screen: AppScreen }
  | { type: 'set-setup-step'; step: SetupStep }
  | { type: 'set-room'; code: string; roomName: string; userName: string; participants: Participant[] }
  | { type: 'set-participants'; participants: Participant[] }
  | { type: 'apply-shared-setup'; settings: SharedSetupSettings }
  | { type: 'apply-shared-setup-patch'; patch: SharedSetupPatch }
  | { type: 'select-grid'; id: string }
  | { type: 'select-frame'; id: string }
  | { type: 'set-custom-frame'; frame: CustomFrame | null }
  | { type: 'patch-custom-frame'; patch: Partial<CustomFrame> }
  | { type: 'patch-frame-options'; patch: Partial<FrameOptions> }
  | { type: 'patch-layout'; patch: Partial<LayoutSettings> }
  | { type: 'set-camera-mode'; mode: CameraMode }
  | { type: 'toggle-swap' }
  | { type: 'patch-camera'; patch: Partial<CameraSettings> }
  | { type: 'set-timer'; timer: 3 | 5 | 10 }
  | { type: 'set-shot-delay'; delay: number }
  | { type: 'set-timer-sound'; enabled: boolean }
  | { type: 'set-flash'; enabled: boolean }
  | { type: 'set-retake'; index: number | null }
  | { type: 'reset-session' }
  | { type: 'reset-room' }

const initialState: BlueboothState = {
  screen: 'home',
  setupStep: 'layout',
  roomCode: '',
  roomName: '',
  userName: 'You',
  participants: [],
  selectedGrid: 'ig-square-4',
  selectedFrame: 'clean-white',
  customFrame: null,
  frameOptions: {
    caption: '',
    borderColor: '#1f5fad',
    borderWidth: 0,
    showDate: false,
    showRoom: false,
  },
  layout: { gap: 8, padding: 16, radius: 8, background: '#ffffff' },
  cameraMode: 'user',
  swap: false,
  cameraSettings: {
    mirror: true,
    brightness: 1,
    contrast: 1,
    saturation: 1,
    warmth: 0,
    zoom: 1,
    fit: 'cover',
    filter: 'original',
  },
  timer: 5,
  shotDelay: 2,
  timerSound: true,
  flash: true,
  retakeIndex: null,
}

function reducer(state: BlueboothState, action: Action): BlueboothState {
  switch (action.type) {
    case 'navigate':
      return { ...state, screen: action.screen }
    case 'set-setup-step':
      return { ...state, setupStep: action.step }
    case 'set-room':
      return {
        ...state,
        roomCode: action.code,
        roomName: action.roomName,
        userName: action.userName,
        participants: action.participants,
      }
    case 'set-participants':
      return { ...state, participants: action.participants }
    case 'apply-shared-setup':
      return {
        ...state,
        selectedGrid: action.settings.selectedGrid,
        selectedFrame: action.settings.selectedFrame,
        timer: action.settings.timer,
        layout: { ...action.settings.layout },
      }
    case 'apply-shared-setup-patch': {
      const shared = applySharedSetupPatch(
        {
          selectedGrid: state.selectedGrid,
          selectedFrame: state.selectedFrame,
          timer: state.timer,
          layout: state.layout,
        },
        action.patch,
      )
      return {
        ...state,
        selectedGrid: shared.selectedGrid,
        selectedFrame: shared.selectedFrame,
        timer: shared.timer,
        layout: shared.layout,
      }
    }
    case 'select-grid':
      return { ...state, selectedGrid: action.id }
    case 'select-frame':
      return { ...state, selectedFrame: action.id }
    case 'set-custom-frame':
      return { ...state, customFrame: action.frame }
    case 'patch-custom-frame':
      return state.customFrame
        ? { ...state, customFrame: { ...state.customFrame, ...action.patch } }
        : state
    case 'patch-frame-options':
      return { ...state, frameOptions: { ...state.frameOptions, ...action.patch } }
    case 'patch-layout':
      return { ...state, layout: { ...state.layout, ...action.patch } }
    case 'set-camera-mode':
      return { ...state, cameraMode: action.mode }
    case 'toggle-swap':
      return { ...state, swap: !state.swap }
    case 'patch-camera':
      return { ...state, cameraSettings: { ...state.cameraSettings, ...action.patch } }
    case 'set-timer':
      return { ...state, timer: action.timer }
    case 'set-shot-delay':
      return { ...state, shotDelay: action.delay }
    case 'set-timer-sound':
      return { ...state, timerSound: action.enabled }
    case 'set-flash':
      return { ...state, flash: action.enabled }
    case 'set-retake':
      return { ...state, retakeIndex: action.index }
    case 'reset-session':
      return { ...state, retakeIndex: null }
    case 'reset-room':
      return { ...initialState }
  }
}

interface BlueboothContextValue {
  state: BlueboothState
  dispatch: Dispatch<Action>
}

const BlueboothContext = createContext<BlueboothContextValue | null>(null)

export function BlueboothProvider({
  children,
  initialJoinCode,
}: {
  children: ReactNode
  initialJoinCode?: string
}) {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    screen: initialJoinCode ? 'join' : 'home',
    roomCode: initialJoinCode ?? '',
  })
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <BlueboothContext.Provider value={value}>{children}</BlueboothContext.Provider>
}

export function useBluebooth() {
  const value = useContext(BlueboothContext)
  if (!value) throw new Error('useBluebooth must be used inside BlueboothProvider')
  return value
}
