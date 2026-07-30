# Phase 04: Real Rooms, Presence, and Shared Setup

## Objective

Replace the simulated create/join/waiting-room behavior with a real two-browser Supabase room. Synchronize durable setup state and online presence. Keep partner video as a placeholder until Phase 05.

## Room flow

### Create

- Ensure anonymous auth.
- Call `create_room` RPC.
- Navigate to `/r/<CODE>` or update route state cleanly.
- Show a share link derived from `NEXT_PUBLIC_APP_URL` or the current origin, never a hardcoded production domain.

### Join

- Normalize and validate the code.
- Call `join_room` RPC.
- Handle not found, expired, closed, full, and transient failure separately.
- Make refresh/re-entry idempotent for the same anonymous user.

### Leave

- Untrack Presence.
- Unsubscribe from the channel.
- Call `leave_room` best-effort.
- Clean camera and session resources.
- Handle tab close through expiry/Presence rather than relying only on `beforeunload` network success.

## Private Realtime channel

Use one channel per room and authenticate it.

### Presence payload

Keep it small:

```ts
{
  userId,
  displayName,
  role,
  stage,
  cameraReady,
  joinedAt,
}
```

Use Presence for connected/disconnected UI. Do not update Presence on high-frequency slider movement.

### Shared setup state

Persist the latest shared setup in `rooms.shared_settings` with `settings_revision`.

Use Broadcast for low-latency patches and the RPC/database for durability. Each patch must include a revision and sender id.

Synchronize:

- selected grid
- frame preset
- custom frame metadata/path when available
- frame options
- gap, padding, radius, and canvas background
- camera composition mode and swap
- timer, delay, sound, and flash preferences

Do not synchronize private local camera device ids or local mirror preference unless explicitly needed for composition semantics.

## Authority rules

Recommended version 1:

- Both members may edit setup controls.
- Last accepted revision wins.
- Only the host can start/cancel/finalize a session.
- The partner receives a clear read-only or request state for host-only actions.
- If host leaves, transfer host role deterministically to the remaining active member and reflect it in durable state.

## Reconnect behavior

When the channel reconnects:

1. Re-fetch the room and active session.
2. Reconcile Presence.
3. Replace stale local shared settings with the newest persisted revision.
4. Resume the correct screen/stage.
5. Do not duplicate subscriptions.

## Remove simulations

- Remove `Simulate partner joining` from production UI.
- Demo partner feed may remain available only as a development fallback behind an explicit development flag.
- Room member cards must come from real membership/Presence.

## Acceptance criteria

Test with two separate browser contexts:

- Host creates and partner joins using the code.
- A third context receives `room full`.
- Both member cards update on join/leave.
- Grid and frame changes appear on the other client quickly.
- Refreshing one client restores membership and current setup.
- Host transfer or defined host-disconnect behavior works.
- Invalid/expired codes show useful errors.
- No public room data is readable by a non-member.
- All checks and build pass.

## Stop condition

Do not implement remote video yet. Both browsers may show local video plus a structured remote placeholder.
