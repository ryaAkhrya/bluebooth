# Bluebooth Product Specification

## Product statement

Bluebooth is a private, browser-based couple photobooth for two people who are physically apart. One person creates a room, the other joins using a code or link, both see each other's camera, configure one shared photobooth, take synchronized photos, review them, and download the final composition.

## Primary user flow

1. Host creates a room.
2. Host receives a six-character room code and a shareable link.
3. Partner joins from another browser or device.
4. Both grant camera access.
5. Both see local and remote camera previews.
6. The host or current editor chooses a grid.
7. Shared grid settings update for both users.
8. The host or current editor chooses a built-in frame or uploads a custom frame.
9. Both select camera readiness.
10. Host starts the session.
11. Both clients receive the same scheduled countdown.
12. Each client captures its own local high-quality frame.
13. Required photos arrive in the session.
14. Both see the same review result.
15. A participant may request a retake.
16. The final canvas is generated and saved.
17. Both participants can download the result.

## Product priorities

### Priority 1: Grid engine

- Keep at least the existing 33 presets.
- Support square, Instagram portrait, story, portrait strip, landscape, print, and editorial arrangements.
- Keep gap, padding, radius, background, and aspect ratio controls.
- Use one geometry engine for thumbnail, live preview, review, and final export.

### Priority 2: Frame system

- Keep all built-in frame types.
- Preserve custom transparent PNG/WebP upload.
- Preserve opacity, position, scale, fit, and front/behind placement.
- Make uploaded frames session-shareable.
- Do not add stickers or novelty decorations.

### Priority 3: Couple room experience

- Exactly two active participants per room.
- Clear local/partner identity.
- Visible online, camera-ready, reconnecting, and disconnected states.
- Shared editor state without excessive UI locks.
- Host authority for starting, cancelling, and finalizing a session.

## Camera modes

- `split`: each slot combines both participants side by side.
- `alternate`: odd/even slots alternate between host and partner.
- `host-only`: every slot uses the host camera.
- `partner-only`: every slot uses the partner camera.
- `swap`: swaps visual order and source assignment.

Use role-based names in code. The UI may display `You` and the partner's chosen display name.

## Non-goals for version 1

- Voice or audio calls.
- Text chat.
- Accounts with email/password.
- Public profiles.
- Friend lists.
- More than two participants.
- Social sharing feed.
- Payments, plans, pricing, analytics dashboards, or commercial landing pages.
- AI filters, face beautification, stickers, AR masks, or generative features.

## Visual direction

- Bright, soft blue palette.
- Modern but not futuristic.
- Simple, calm, and personal.
- No giant marketing hero.
- No purple neon gradients, glass blobs, random sparkles, floating shapes, or fake testimonials.
- No emoji used as UI icons.
- Use inline SVG or Lucide icons consistently.
- Motion should be brief and functional.

## Privacy expectations

- Rooms are private and unlisted.
- Room code is required to join.
- A room accepts at most two active members.
- Raw captures and results live in a private bucket.
- Results are served through authorized downloads or short-lived signed URLs.
- The service must not record audio.
- Camera tracks stop when leaving the room or closing the app.

## Failure states that must be designed

- Camera permission denied.
- No camera device.
- Room not found.
- Room expired.
- Room already full.
- Partner disconnected.
- Realtime channel reconnecting.
- WebRTC failed and retrying.
- TURN unavailable.
- Upload failed.
- One participant did not submit a capture.
- Final canvas failed to export.
- Session cancelled by host.

## Room lifecycle

Recommended default:

- Waiting room expires after 2 hours of inactivity.
- Active sessions remain valid while either member is connected.
- Raw captures are temporary.
- Final results remain until explicitly deleted or until a future retention policy is added.

These defaults must be constants, not magic values scattered through components.
