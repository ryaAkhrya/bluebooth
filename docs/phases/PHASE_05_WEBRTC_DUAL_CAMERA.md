# Phase 05: WebRTC Dual-Camera Connection

## Objective

Allow both room members to see each other's live camera. Use Supabase Broadcast only for signaling. Keep audio disabled.

## WebRTC design

- One `RTCPeerConnection` per two-person room.
- Host is the initial offerer; partner is the answerer.
- Exchange offer, answer, and ICE candidates over the private room channel.
- Include `targetUserId` and ignore messages not addressed to the current user.
- Queue ICE candidates received before the remote description is set.
- Add only video tracks.
- Render local stream muted and remote stream without audio tracks.

## Signaling events

Typed events:

```text
webrtc:ready
webrtc:offer
webrtc:answer
webrtc:ice
webrtc:restart
webrtc:bye
```

Include a connection/session generation id so stale messages from a previous peer connection are ignored.

## Perfect-negotiation and collision safety

Implement either:

- a documented host-offerer deterministic flow with strict restart handling, or
- the WebRTC perfect-negotiation pattern.

Do not leave offer glare behavior undefined.

## ICE configuration

Development may start with STUN. Production must support TURN.

- Do not place TURN shared secrets in the browser.
- Add `/api/turn-credentials` only when short-lived credentials can be generated safely.
- Keep the provider integration behind a typed function.
- If no TURN configuration is available, show a non-scary development warning and document that cross-network reliability is not production-ready.

## Connection states

Expose:

```text
idle
waiting-for-peer
connecting
connected
disconnected
failed
retrying
closed
```

Map `iceConnectionState` and `connectionState` carefully. On recoverable disconnect, wait briefly before restarting ICE. Avoid restart storms.

## Camera behavior

- Keep local camera selection and local filters.
- Remote video is a real `MediaStream`.
- Local mirror affects only the user's intended local presentation/capture, not the encoded track sent to the peer.
- Changing camera device should replace the sender track using `replaceTrack()` when possible instead of rebuilding the whole room.
- Stopping camera should update Presence and replace/remove the track cleanly.

## Cleanup

On leave, unmount, or peer replacement:

- remove event handlers
- stop owned local tracks when appropriate
- close the peer connection
- clear candidate queues
- revoke object URLs if used
- send a best-effort `webrtc:bye`

## UI requirements

- Waiting room shows both real previews.
- Setup preview supports user, partner, split, alternate, and swap with real streams.
- Show concise connection state and retry control.
- Do not add call controls for microphones or speakers.

## Acceptance criteria

Test on:

- two tabs with separate anonymous sessions
- two different browsers on one machine
- two devices on the same network
- two devices on different networks when TURN is configured

Verify:

- both users see local and remote video
- camera switch replaces the outgoing track
- refresh/rejoin reconnects
- leaving closes the remote feed
- no audio permission is requested
- no media data is sent through Supabase Realtime
- connection failures have retry UI
- tests, lint, typecheck, and build pass

## Stop condition

Do not yet implement synchronized multi-device capture. The purpose of this phase is stable dual-camera preview.
