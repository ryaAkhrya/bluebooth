// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  setPresence: vi.fn(),
  updateSharedSettings: vi.fn(),
  toast: vi.fn(),
  state: {
    screen: 'home',
    setupStep: 'layout',
    roomCode: 'BLUE42',
    roomName: 'Bluebooth',
    cameraMode: 'user',
    swap: false,
    participants: [],
  },
}))

vi.mock('@/components/bluebooth/state/bluebooth-state', () => ({
  useBluebooth: () => ({ state: mocks.state, dispatch: mocks.dispatch }),
}))
vi.mock('@/components/bluebooth/state/room-state', () => ({
  useRoom: () => ({
    mode: 'local',
    onlineAvailable: false,
    canControlBooth: true,
    presence: [],
    settingsStatus: 'idle',
    createRoom: mocks.createRoom,
    joinRoom: mocks.joinRoom,
    setPresence: mocks.setPresence,
    updateSharedSettings: mocks.updateSharedSettings,
    retrySettings: vi.fn(),
  }),
}))
vi.mock('@/components/bluebooth/state/local-media', () => ({
  useLocalMedia: () => ({
    clearCaptures: vi.fn(),
    clearFinalResult: vi.fn(),
  }),
}))
vi.mock('@/components/bluebooth/ui/toast-provider', () => ({
  useToast: () => mocks.toast,
}))
vi.mock('@/components/bluebooth/camera/connection-status', () => ({
  ConnectionStatus: () => null,
}))
vi.mock('@/components/bluebooth/editor/composition-preview', () => ({
  CompositionPreview: () => <div>Preview</div>,
}))
vi.mock('@/components/bluebooth/editor/camera-controls', () => ({
  CameraControls: () => <div>Camera controls</div>,
}))
vi.mock('@/components/bluebooth/editor/frame-selector', () => ({
  FrameSelector: () => <div>Frame selector</div>,
}))
vi.mock('@/components/bluebooth/editor/grid-selector', () => ({
  GridSelector: () => <div>Grid selector</div>,
}))
vi.mock('@/components/bluebooth/editor/layout-controls', () => ({
  LayoutControls: () => <div>Layout controls</div>,
}))
vi.mock('@/components/bluebooth/editor/timer-controls', () => ({
  TimerControls: () => <div>Timer controls</div>,
}))

import { CreateRoomScreen } from '@/components/bluebooth/screens/create-room-screen'
import { HomeScreen } from '@/components/bluebooth/screens/home-screen'
import { JoinRoomScreen } from '@/components/bluebooth/screens/join-room-screen'
import { SetupScreen } from '@/components/bluebooth/screens/setup-screen'

afterEach(cleanup)

beforeEach(() => {
  vi.clearAllMocks()
  mocks.state.setupStep = 'layout'
  mocks.state.cameraMode = 'user'
  mocks.state.swap = false
})

describe('Phase 08 accessible UI', () => {
  it('removes the result-history entry point from the home screen', () => {
    render(<HomeScreen />)

    expect(screen.queryByText(/result history/i)).toBeNull()
    expect(screen.getByRole('button', { name: /create a room/i })).toBeTruthy()
    expect(screen.getByRole('button', { name: /join with a code/i })).toBeTruthy()
  })

  it('guards create-room Enter submission with a persistent field error', async () => {
    const user = userEvent.setup()
    render(<CreateRoomScreen onStartCamera={vi.fn()} />)

    const form = screen.getByRole('form', { name: /start your photobooth/i })
    fireEvent.submit(form)

    const input = screen.getByRole('textbox', { name: /your name/i })
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText('Enter your name.')).toBeTruthy()
    expect(mocks.createRoom).not.toHaveBeenCalled()

    await user.type(input, 'Alex')
    expect(screen.queryByText('Enter your name.')).toBeNull()
  })

  it('submits a valid join form from the keyboard once', async () => {
    const user = userEvent.setup()
    mocks.joinRoom.mockResolvedValueOnce({ code: 'ABC123' })
    const replaceState = vi
      .spyOn(window.history, 'replaceState')
      .mockImplementation(() => undefined)
    render(<JoinRoomScreen onStartCamera={vi.fn().mockResolvedValue(undefined)} />)

    const codeInput = screen.getByRole('textbox', { name: /room code/i })
    await user.clear(codeInput)
    await user.type(codeInput, 'abc123')
    await user.type(screen.getByRole('textbox', { name: /your name/i }), 'Sam')
    await user.keyboard('{Enter}')

    await waitFor(() => expect(mocks.joinRoom).toHaveBeenCalledTimes(1))
    expect(mocks.joinRoom).toHaveBeenCalledWith(
      { code: 'ABC123', displayName: 'Sam' },
      false,
    )
    replaceState.mockRestore()
  })

  it('supports roving keyboard focus across setup tabs', () => {
    render(
      <SetupScreen
        stream={null}
        cameraStatus="idle"
        devices={[]}
        deviceId=""
        remoteStream={null}
        peerConnectionState="idle"
        onRetryPeer={vi.fn()}
        onRequestCamera={vi.fn().mockResolvedValue(undefined)}
        synchronizedCapture={{
          enabled: false,
          isHost: false,
          state: { operation: 'idle' },
        } as never}
      />,
    )

    const layout = screen.getByRole('tab', { name: /layout/i })
    const frame = screen.getByRole('tab', { name: /frame/i })
    layout.focus()
    fireEvent.keyDown(layout, { key: 'ArrowRight' })

    expect(mocks.dispatch).toHaveBeenCalledWith({
      type: 'set-setup-step',
      step: 'frame',
    })
    expect(document.activeElement).toBe(frame)
    expect(
      screen.getByRole('button', { name: /you/i }).getAttribute('aria-pressed'),
    ).toBe('true')
  })
})
