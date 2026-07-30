# Final Definition of Done

Bluebooth is complete only when all applicable items below are true.

## Product

- Two users can create/join one private room online.
- Maximum active room capacity is enforced server-side at two.
- Both see local and remote video.
- No audio permission is requested.
- Both see shared grid/frame/timer settings.
- Host can start a synchronized session.
- Both capture local-quality frames.
- Split, alternate, host-only, partner-only, and swap behave correctly.
- Individual retake and restart-all work.
- Both see and can download the same final result.
- Result history persists privately.

## Grid and frame quality

- Existing 33 grid presets remain available unless an intentional change is documented.
- Existing built-in frames remain available.
- Preview and final canvas use the same geometry logic.
- Custom PNG/WebP frames work on both clients.
- Custom frame front/behind placement works in export.
- Export dimensions match the selected preset.

## Realtime and WebRTC

- Presence accurately reflects join, leave, reconnect, and camera-ready state.
- Shared changes are revision-safe.
- Duplicate/stale events do not corrupt sessions.
- Video travels through WebRTC, not Supabase Realtime.
- TURN is configured for production reliability or the limitation is explicitly labeled.
- Peer connection, channel, and media cleanup are deterministic.

## Security and privacy

- Anonymous users are authenticated and constrained by RLS.
- Non-members cannot read rooms, sessions, captures, results, or media.
- Private Realtime authorization is active.
- Storage bucket is private.
- Secret/service keys are absent from client code and repository.
- Room code lookup does not expose room listings.
- Raw captures have a documented cleanup lifecycle.
- No audio is recorded.

## Engineering

- Next.js renders the real app.
- Standalone mockup is archived only as reference.
- TypeScript strict passes.
- `ignoreBuildErrors` is absent.
- Lint passes.
- Unit, component, and E2E tests pass.
- Production build passes.
- No giant all-in-one component.
- No duplicated preview/final geometry.
- No known resource leaks.
- No production console errors on happy paths.

## UX and design

- Visual direction remains soft blue, modern, restrained, and simple.
- No emoji icons, stickers, mascots, marketing sections, or AI-style decoration.
- Grid and frame remain the editor focus.
- Desktop, tablet, and mobile are usable.
- Keyboard and screen-reader basics work.
- Reduced motion is respected.
- Every failure state gives a useful next action.

## Deployment

- Supabase migrations reproduce the database.
- Production environment variables are documented.
- Vercel deployment is HTTPS.
- Two-device cross-network smoke test passes.
- Rollback procedure exists.
- README is complete.

## Final release label

Use one of these honestly:

- `Local prototype`: no real room/backend.
- `Online alpha`: real rooms, incomplete reliability/security/testing.
- `Private beta`: full flow works, some documented browser/TURN limitations.
- `Production-ready private app`: every critical item above is green.
