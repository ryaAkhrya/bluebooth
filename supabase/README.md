# Bluebooth Supabase foundation

Phase 03 adds schema, authentication, RLS, private Storage, and typed services.
Phase 04 connects room creation, joining, Presence, and durable shared setup while
preserving the local simulation when Supabase is unavailable.
Phase 05 adds private-channel WebRTC signaling. Phase 06 adds host-authoritative,
timestamp-synchronized capture sessions, private raw uploads, shared review, and
private final results.

## Prerequisites

- Docker Desktop or another Docker-compatible runtime
- Node.js and pnpm
- A Supabase project only when testing against a hosted development environment

## Local setup

1. Start the local stack:

   ```powershell
   npx supabase start
   ```

2. Copy the local API URL and publishable/anonymous key reported by:

   ```powershell
   npx supabase status
   ```

3. Create `.env.local`:

   ```text
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<local publishable or anon key>
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. Recreate the database and run the pgTAP security suite:

   ```powershell
   npx supabase db reset
   npx supabase test db
   ```

5. Regenerate database types after every migration:

   ```powershell
   npx supabase gen types --lang typescript --local
   ```

   Compare the generated output with `types/database.ts` before committing.

## Hosted development project

1. Enable anonymous sign-ins in Authentication settings.
2. Keep `bluebooth-media` private. The migration creates or repairs this bucket.
3. Apply migrations with `npx supabase db push` to a linked development project.
4. In Realtime settings, disable unrestricted public channel access before Phase 04.
5. Use the project's publishable key in the browser. Never add a secret/service-role
   key to a `NEXT_PUBLIC_` variable or commit it.

## Phase 04 hosted checklist

1. Enable anonymous sign-ins in Authentication settings.
2. In Realtime settings, allow only private channels.
3. Apply every migration in order with `npx supabase db push`.
4. Configure the public URL and publishable key in `.env.local`.
5. Test create/join with two separate browser profiles. A third profile must
   receive the room-full error.

## Phase 06 hosted checklist

1. Apply `20260730200000_phase_06_synchronized_capture.sql` after all earlier
   migrations.
2. Confirm the `bluebooth-media` bucket remains private.
3. Run `npx supabase test db` against a local Docker-backed Supabase stack.
4. Start the app with two isolated browser profiles and real or fake cameras.
5. Confirm the host cannot start before both readiness acknowledgements.
6. Confirm each participant creates one object under their own raw path and that
   both devices reach the same shared review.
7. For the development-only two-context Playwright check, install Chromium and
   run:

   ```powershell
   npx playwright install chromium
   $env:PLAYWRIGHT_PHASE06='1'
   pnpm test:e2e
   ```

   Playwright is not part of the production build or deployment command.

## Current boundaries

- Missing or invalid Supabase configuration uses the local room simulation.
- Online rooms use one private `room:<uuid>` Presence/Broadcast channel.
- Realtime synchronizes small typed room, WebRTC signaling, and capture command
  payloads. Images, blobs, camera frames, captures, and results are never sent
  through Realtime.
- Each browser captures only its local camera. The remote WebRTC stream remains
  preview-only.
- Raw captures and final results use signed access from the private media bucket.
- Raw-capture retention cleanup is not automated in this phase.
