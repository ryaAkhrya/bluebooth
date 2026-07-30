# Bluebooth Supabase foundation

Phase 03 adds schema, authentication, RLS, private Storage, and typed services.
The current product remains local-first and does not call the room services yet.

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

## Current boundaries

- No existing screen reads or writes Supabase room data.
- No Realtime channel is opened.
- No WebRTC behavior is included.
- Raw-capture retention cleanup is not automated in this phase.
- Missing configuration or authentication failure leaves local mode usable.
