# Phase 01: Migrate the Approved Mockup into Next.js

## Objective

Make `pnpm dev` render the complete Bluebooth mockup through typed React components in the Next.js App Router. Preserve visual and functional parity. Do not add Supabase or WebRTC in this phase.

## Required work

1. Create `reference/mockup/index.html` from the root standalone mockup and treat it as read-only visual reference.
2. Remove the duplicate runtime use of `/index.html` and `/public/index.html`. Keep only the archived reference copy unless a deliberate static demo route is documented.
3. Replace the placeholder in `app/page.tsx` with the Bluebooth application.
4. Add `app/r/[code]/page.tsx` so a future room link can prefill the join code. It may still use mock room behavior in this phase.
5. Break the prototype into focused React components and modules.
6. Mark only browser-dependent entry points with `'use client'`.
7. Move all preset data into typed files:
   - grids
   - frames
   - camera filters
8. Create TypeScript types for app screens, presets, frame options, layout settings, camera settings, participants, captures, and results.
9. Replace DOM query mutation with React state and props.
10. Use a reducer/context or equivalent small internal state layer.
11. Port the current CSS without redesigning it. Tailwind may be used selectively, but visual fidelity matters more than rewriting every class.
12. Preserve all current local mock flows:
   - create room
   - join room
   - simulated partner join
   - setup tabs
   - all grid choices
   - all frames
   - custom frame upload
   - camera controls
   - timer controls
   - capture
   - review/retake
   - final export
13. Create reusable toast and modal components.
14. Tie camera and timer cleanup to React effects.
15. Remove `typescript.ignoreBuildErrors` from `next.config.mjs`.
16. Update package scripts so type checking can be run explicitly, for example `typecheck`.

## Required architecture outcomes

At minimum, do not leave all code in `app/page.tsx`. Separate:

- app state
- screen components
- presets
- camera hook
- composition preview
- canvas renderer
- file upload
- session flow

## Do not do

- No Supabase packages.
- No database schema.
- No Realtime.
- No WebRTC.
- No new visual concept.
- No iframe.
- No `dangerouslySetInnerHTML` port.
- No giant component containing the entire old script.

## Acceptance criteria

- `pnpm dev` opens Bluebooth, not the placeholder.
- Home through final-result flow works without page reload.
- Every existing grid appears and can be selected.
- Every existing frame appears and can be selected.
- PNG/WebP custom frame upload works.
- Camera permission denial leaves a usable fallback.
- Timer options work.
- A local result can be downloaded.
- `/r/ABC123` opens the join flow with `ABC123` prefilled.
- No console errors during the local happy path.
- TypeScript strict checks pass.
- `pnpm lint`, `pnpm typecheck`, and `pnpm build` pass.

## Manual checks

Test at desktop width, around 900px, and mobile width around 390px. Compare against `reference/mockup/index.html`.

## Stop condition

Stop after local React parity is achieved. Do not begin backend work.
