# Target Technical Architecture

## Stack

- Next.js 16 App Router
- React 19
- TypeScript in strict mode
- Tailwind CSS 4 plus ordinary CSS where preserving the mockup is clearer
- Supabase JavaScript client
- Supabase Auth anonymous users
- Supabase Postgres, Realtime, and Storage
- WebRTC `RTCPeerConnection` for peer-to-peer video
- Vitest for unit tests
- React Testing Library for component behavior
- Playwright for two-browser end-to-end tests
- Vercel for the Next.js deployment

## Rendering boundaries

The application is interactive and depends heavily on browser APIs. Keep the outer route as a Server Component where useful, but render the photobooth application through a dedicated Client Component.

Recommended entry points:

```text
app/
  page.tsx
  r/[code]/page.tsx
  layout.tsx
components/
  bluebooth/
    bluebooth-app.tsx
    app-shell.tsx
    screens/
    room/
    camera/
    editor/
    session/
    result/
```

Do not mark the entire root layout as a Client Component. Place client boundaries as deep as practical.

## Recommended source structure

```text
app/
  page.tsx
  r/[code]/page.tsx
  api/turn-credentials/route.ts
components/bluebooth/
  bluebooth-app.tsx
  app-header.tsx
  screens/
    home-screen.tsx
    create-room-screen.tsx
    join-room-screen.tsx
    waiting-room-screen.tsx
    setup-screen.tsx
    session-screen.tsx
    review-screen.tsx
    final-screen.tsx
  editor/
    grid-selector.tsx
    frame-selector.tsx
    custom-frame-upload.tsx
    camera-controls.tsx
    timer-controls.tsx
    composition-preview.tsx
  camera/
    camera-view.tsx
    participant-camera.tsx
  room/
    room-code.tsx
    participant-card.tsx
    connection-status.tsx
  ui/
    toast-provider.tsx
    modal.tsx
hooks/
  use-camera.ts
  use-bluebooth-state.ts
  use-room.ts
  use-room-channel.ts
  use-webrtc-peer.ts
  use-capture-session.ts
lib/bluebooth/
  presets/grids.ts
  presets/frames.ts
  presets/filters.ts
  geometry.ts
  canvas-renderer.ts
  image.ts
  constants.ts
  validation.ts
lib/supabase/
  client.ts
  server.ts
  middleware.ts
  rooms.ts
  sessions.ts
  storage.ts
types/
  bluebooth.ts
supabase/
  migrations/
  seed.sql
reference/mockup/
  index.html
```

The exact file split may vary, but data, geometry, media, realtime, WebRTC, and UI must not collapse into one oversized component.

## State model

Use `useReducer` plus context for application state. Avoid adding a global state dependency unless the reducer becomes demonstrably unmanageable.

Separate state into:

- `localUi`: active screen, open modal, active setup tab, local loading/error state.
- `room`: room id, code, role, members, status, connection state.
- `sharedSetup`: selected grid, frame, frame options, layout, camera mode, timer, shot delay.
- `localCamera`: device id, local stream, mirror and local visual adjustments.
- `remoteCamera`: remote stream and WebRTC connection state.
- `session`: session id, phase, shot index, scheduled timestamps, captures, retakes.
- `result`: final path, signed URL, dimensions, save status.

Do not broadcast local-only UI state.

## Realtime responsibilities

Use Supabase Realtime with a private topic such as:

```text
room:<room_uuid>
```

Use:

- Presence for online state, role, camera-ready status, and current app stage.
- Broadcast for low-latency ephemeral events such as setup patches, start countdown, cancel session, WebRTC offer/answer/ICE, acknowledgements, and reconnect requests.
- Postgres rows for durable room, session, photo, and result state.

Do not send video frames through Supabase Realtime.

## WebRTC responsibilities

- Capture video only, with `audio: false`.
- Exchange SDP offers, answers, and ICE candidates through Supabase Broadcast.
- Attach local tracks to `RTCPeerConnection`.
- Display the received remote stream.
- Use STUN for basic discovery.
- Support TURN credentials for production reliability across restrictive NAT/firewalls.
- Implement teardown and ICE restart.

## Shared capture model

Recommended quality-first model:

1. Host creates a session and schedules a future `captureAt` timestamp.
2. Both clients acknowledge readiness.
3. Both render the same countdown toward `captureAt`.
4. Each client captures its own local video at native available quality.
5. Each client converts the frame to a compressed WebP Blob.
6. Each client uploads its raw capture to a private temporary path.
7. Each client inserts or upserts its `photos` row for the shot.
8. The host waits until all required sources are present.
9. The host composes the final slot according to split/alternate/host-only/partner-only mode.
10. Review and retake state is broadcast and persisted.
11. The host renders and uploads the final PNG.
12. Both clients receive an authorized result URL.

This avoids relying on the lower-quality remote stream for the final output.

## Canvas architecture

Create one pure geometry module that returns slot rectangles from a grid preset and layout options.

The DOM preview and high-resolution canvas renderer must consume the same geometry model. Unit test this module extensively.

The canvas renderer should accept explicit inputs rather than reading global state:

```ts
renderComposition({
  preset,
  frame,
  layout,
  frameOptions,
  customFrame,
  slotImages,
  output,
}): Promise<Blob>
```

## Error and reconnect strategy

- Realtime reconnect must re-fetch durable room/session state.
- WebRTC reconnect must be independent of room membership.
- If WebRTC is down but both users remain in the room, allow retry without destroying setup.
- If a capture upload fails, retry with bounded exponential backoff.
- Host commands carry a monotonic revision or event id to prevent duplicate execution.
- Ignore stale setup patches.
- Every subscription and media track must have deterministic cleanup.
