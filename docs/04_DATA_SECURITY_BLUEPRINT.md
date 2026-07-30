# Data, Realtime, Storage, and Security Blueprint

This file defines the intended contracts. Cline should implement them as versioned Supabase migrations and typed application services rather than copying an unreviewed dashboard-only schema.

## Authentication model

Use Supabase anonymous sign-in. Every browser receives a real authenticated `auth.uid()` without requiring email, password, or personal information.

Important rules:

- Enable anonymous sign-ins in Supabase Auth settings.
- Do not confuse an anonymous user session with the public Supabase publishable key.
- Use the publishable key in the browser.
- Never expose the Supabase secret key.
- Anonymous users must still be constrained by RLS.

## Core tables

### `rooms`

Suggested columns:

```text
id uuid primary key default gen_random_uuid()
code text unique not null
name text not null default 'Bluebooth'
host_user_id uuid not null
status text not null check in ('waiting','setup','capturing','review','completed','closed')
shared_settings jsonb not null default '{}'
settings_revision bigint not null default 0
active_session_id uuid null
expires_at timestamptz not null
created_at timestamptz not null default now()
updated_at timestamptz not null default now()
```

The code must be uppercase and validated. Generate it server-side with collision retry.

### `room_members`

```text
id uuid primary key default gen_random_uuid()
room_id uuid not null references rooms(id) on delete cascade
user_id uuid not null
role text not null check in ('host','partner')
display_name text not null
joined_at timestamptz not null default now()
last_seen_at timestamptz not null default now()
left_at timestamptz null
unique(room_id, user_id)
```

Enforce no more than two active members through an RPC transaction, not only through frontend checks.

### `booth_sessions`

```text
id uuid primary key default gen_random_uuid()
room_id uuid not null references rooms(id) on delete cascade
created_by uuid not null
status text not null check in ('preparing','countdown','capturing','review','completed','cancelled')
settings jsonb not null
shot_count integer not null
current_shot_index integer not null default 0
capture_at timestamptz null
revision bigint not null default 0
created_at timestamptz not null default now()
completed_at timestamptz null
```

### `photos`

```text
id uuid primary key default gen_random_uuid()
session_id uuid not null references booth_sessions(id) on delete cascade
room_id uuid not null references rooms(id) on delete cascade
shot_index integer not null
user_id uuid not null
role text not null check in ('host','partner')
storage_path text not null
width integer not null
height integer not null
mime_type text not null
created_at timestamptz not null default now()
unique(session_id, shot_index, user_id)
```

Use upsert for retry-safe capture submission.

### `results`

```text
id uuid primary key default gen_random_uuid()
session_id uuid unique not null references booth_sessions(id) on delete cascade
room_id uuid not null references rooms(id) on delete cascade
created_by uuid not null
storage_path text not null
width integer not null
height integer not null
metadata jsonb not null default '{}'
created_at timestamptz not null default now()
deleted_at timestamptz null
```

## Required RPC contracts

Use `security definer` carefully, pin `search_path`, validate all input, and return only necessary fields.

### `create_room(display_name, room_name)`

- Requires `auth.uid()`.
- Generates a unique six-character code.
- Creates the room and host membership transactionally.
- Sets a sensible expiry.
- Returns room id, code, name, role, status, and expiry.

### `join_room(room_code, display_name)`

- Requires `auth.uid()`.
- Looks up a non-expired room without exposing all rooms.
- Rejects missing, expired, closed, or full rooms.
- Creates partner membership transactionally.
- Is idempotent for an existing member.
- Returns the same safe room payload.

### `leave_room(room_id)`

- Marks the calling member as left.
- If no active members remain, closes or expires the room.
- If host leaves and partner remains, either transfer host authority or define a clear closed-room behavior. Prefer deterministic host transfer.

### `update_room_settings(room_id, expected_revision, settings_patch)`

- Only an active member may call it.
- Prefer host-only writes for session-critical fields.
- Applies optimistic concurrency using `expected_revision`.
- Increments revision and returns the merged settings.

## RLS principles

Enable RLS on every public table.

- A member may select a room only when an active `room_members` row exists for `auth.uid()`.
- A member may select active members in the same room.
- Direct room inserts should be denied; use `create_room` RPC.
- Direct member inserts should be denied; use `join_room` RPC.
- Only room members may read sessions, photos, and results for that room.
- Only the host or RPCs may mutate authoritative session state.
- A user may upload or upsert only their own raw photo row.
- Result creation is host-authoritative.
- Deletes must be restricted to room members and preferably the host.

Do not create a broad policy that lets every authenticated anonymous user read every room by code.

## Realtime authorization

Use private channels. Disable unrestricted public channels in Supabase Realtime settings when the authorization policies are ready.

Topic format:

```text
room:<room_uuid>
```

Create policies on `realtime.messages` so only active room members can read/write Broadcast and Presence for that topic.

Event names should be namespaced and typed:

```text
room:settings-patch
room:stage-change
room:member-ready
session:prepare
session:ready-ack
session:schedule-shot
session:cancel
session:retake
webrtc:offer
webrtc:answer
webrtc:ice
webrtc:restart
```

Every event should include:

```text
eventId
roomId
senderUserId
sentAt
revision or sessionId when applicable
payload
```

Never trust sender role claims from payload; verify membership/role from authenticated state.

## Storage design

Use one private bucket, for example:

```text
bluebooth-media
```

Path conventions:

```text
rooms/<roomId>/sessions/<sessionId>/raw/<userId>/<shotIndex>.webp
rooms/<roomId>/sessions/<sessionId>/frames/<userId>/<fileId>.png
rooms/<roomId>/sessions/<sessionId>/result/final.png
```

Rules:

- Raw captures are temporary.
- Custom uploaded frames must be PNG or WebP and validated by MIME type, extension, decoded dimensions, and maximum file size.
- Final results are PNG unless a future export option is added.
- Serve private objects with authenticated download or short-lived signed URLs.
- Do not make the entire bucket public.
- Storage object policies must verify room membership through the path's room id.

## Retention

Recommended initial policy:

- Delete abandoned raw captures after 24 hours.
- Delete raw captures after a final result is successfully produced, unless needed for retakes.
- Keep final results until the room owner deletes them.
- Keep only minimal metadata.

Implement cleanup as an explicit later job or Edge Function. Do not silently claim retention exists if no job is configured.

## Environment variables

Client-safe:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Server-only, only when the selected TURN architecture requires them:

```text
TURN_URL=
TURN_SHARED_SECRET=
```

Never prefix server secrets with `NEXT_PUBLIC_`.
