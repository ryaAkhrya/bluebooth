# Phase 08: QA, Accessibility, Mobile Polish, and Hardening

## Objective

Make the implemented product dependable across real browsers and failure conditions without changing the approved visual identity.

## Automated test stack

Add or complete:

- Vitest
- React Testing Library
- Playwright

Use fake media devices in automated browser tests where supported. Keep a manual real-device checklist for behavior automation cannot prove.

## Required end-to-end scenarios

1. Host creates room, partner joins, third user is rejected.
2. Shared grid/frame changes synchronize.
3. WebRTC connects and both streams display.
4. Host starts split-mode two-shot session.
5. Both clients capture and reach review.
6. Host retakes one shot.
7. Final result saves and downloads.
8. One client refreshes and recovers.
9. Partner disconnects and reconnects.
10. Camera denied uses fallback and useful error state.
11. Upload failure retries.
12. Invalid/expired/full room errors render correctly.

## Accessibility

- Every input has a visible label.
- Icon-only buttons have accessible names.
- Focus order follows visual order.
- Focus is managed when modals/screens change.
- Dialog semantics and Escape behavior are correct.
- Status updates use appropriate live regions without excessive announcements.
- Selected state is not conveyed by color alone.
- Keyboard users can select grids, frames, tabs, and controls.
- Contrast is checked.
- Reduced motion is honored.
- Countdown has a non-visual status representation.

## Responsive testing

Manually verify at minimum:

- 1440×900 desktop
- 1024×768 tablet landscape
- 768×1024 tablet portrait
- 390×844 mobile portrait
- 844×390 mobile landscape

Important mobile checks:

- Camera preview stays visible while editing.
- Grid selector remains usable with two columns where appropriate.
- Bottom action bar does not cover controls.
- Safe-area insets are respected.
- Modals do not exceed viewport.
- iOS video uses `playsInline`.

## Browser matrix

Minimum:

- Current Chrome desktop
- Current Edge desktop
- Current Safari desktop where available
- Chrome Android
- Safari iOS

Document browser-specific limitations rather than hiding them.

## Security hardening

- Review all RLS and Realtime authorization policies.
- Verify private bucket behavior.
- Validate all route/RPC inputs.
- Escape or render user text safely.
- Add sensible RPC rate limiting or abuse controls where available.
- Consider CAPTCHA for anonymous sign-in abuse before a public launch.
- Add security headers appropriate for camera/WebRTC and application needs.
- Restrict `Permissions-Policy` intentionally; do not accidentally disable camera.
- Do not log signed URLs, tokens, SDP, ICE credentials, or private image paths in production.

## Performance and reliability

- Lazy-load heavy editor/result sections where it improves startup.
- Avoid rerendering every grid card for unrelated camera frames.
- Do not put `MediaStream` objects into serializable shared state.
- Keep Realtime payloads small.
- Debounce durable slider writes while preserving immediate local preview.
- Use request cancellation or stale-response guards.
- Ensure reconnect does not multiply channels or event handlers.

## Production error UI

Provide friendly, actionable states for:

- auth unavailable
- Supabase unreachable
- Realtime reconnecting
- peer connection failed
- TURN unavailable
- camera blocked
- storage quota/upload failure
- result generation failure

No raw stack traces in the UI.

## Acceptance criteria

- All automated scenarios pass consistently.
- No known critical accessibility violations.
- No console errors on happy paths.
- No leaked tracks, channels, peer connections, timers, RAF loops, or object URLs after repeated room cycles.
- Mobile editor remains practical.
- Security review finds no cross-room read/write path.
- `pnpm lint`, `pnpm typecheck`, tests, and `pnpm build` pass without ignored errors.

## Stop condition

Do not deploy until this phase is green or remaining exceptions are explicitly documented and accepted.
