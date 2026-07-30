# Phase 03: Supabase Foundation, Auth, Schema, RLS, and Storage

## Objective

Add a secure Supabase foundation without yet replacing the simulated room UI with full realtime behavior.

Read `04_DATA_SECURITY_BLUEPRINT.md` before implementation.

## Required packages and setup

- Add `@supabase/supabase-js`.
- Add `@supabase/ssr` only if the chosen Next.js session architecture uses cookie-backed server access.
- Use current publishable-key conventions.
- Add `.env.example` with client-safe variables only.
- Add typed browser/server Supabase clients in separate modules.
- Never expose a secret key.

## Anonymous authentication

1. Enable a boot flow that obtains or restores an anonymous authenticated session.
2. Do not create a new anonymous user on every render.
3. Expose clear auth states to the UI.
4. Use dynamic rendering where needed to avoid cross-user caching.
5. Handle cleared browser storage as a new anonymous identity.

## Supabase local project

- Initialize `supabase/` using the CLI.
- Create versioned migrations.
- Create the tables, constraints, indexes, helper functions, and RPCs from the blueprint.
- Add updated-at handling.
- Add expiry indexes.
- Add RLS policies.
- Add Realtime authorization policies for private room topics.
- Create or document creation of the private `bluebooth-media` bucket.
- Add Storage object policies scoped to active room membership and path ownership.

## Required RPCs

Implement and test:

- `create_room`
- `join_room`
- `leave_room`
- `update_room_settings`

The RPCs must be transactional, idempotent where appropriate, and safe against room over-capacity.

## Typed data services

Create small typed functions for:

- ensuring anonymous auth
- creating a room
- joining a room
- leaving a room
- fetching member-visible room state
- updating room settings
- creating a session
- uploading a private object
- creating a signed URL

Do not call raw Supabase queries from many UI components.

## Local testing

- Add SQL tests or Supabase CLI database tests where practical.
- Verify a third anonymous user cannot join a full room.
- Verify a non-member cannot read a room, session, photo, result, or storage object.
- Verify a member cannot write another user's raw capture path.
- Verify direct table inserts blocked by policy do not bypass RPC constraints.

## UI behavior in this phase

The UI may still use its simulated partner and local flow, but it should initialize Supabase safely and include an internal development-only connection status. Do not expose raw project ids or keys.

## Acceptance criteria

- Fresh local Supabase can be recreated from migrations.
- Anonymous auth works and persists appropriately.
- RPC contracts work from two separate anonymous sessions.
- RLS tests demonstrate isolation.
- Private Storage upload/download policy works.
- No secret is present in client bundles or committed files.
- Lint, typecheck, tests, database tests, and build pass.

## Stop condition

Do not yet implement live Presence, shared settings, or WebRTC.
