# Phase 06: Synchronized Couple Capture and Review

## Objective

Implement the defining Bluebooth experience: a host starts one session, both devices count down together, both capture high-quality local frames, and both review the same final arrangement.

## Authoritative session model

Use a durable `booth_sessions` row plus typed Realtime events. The host is authoritative for session transitions.

Recommended states:

```text
preparing
waiting-for-ready
countdown
capturing
waiting-for-uploads
review
retake-countdown
completed
cancelled
```

Every command includes `sessionId`, `revision`, and `eventId`. Ignore stale or duplicate commands.

## Preparation handshake

1. Host creates a session with the frozen shared settings snapshot.
2. Host broadcasts `session:prepare`.
3. Each participant validates camera readiness and replies with `session:ready-ack`.
4. UI shows which participant is not ready.
5. Host may cancel or continue only according to a clearly defined fallback rule.

## Synchronized countdown

- Host chooses a future `captureAt` timestamp with enough lead time for both clients.
- Both clients derive countdown display from `captureAt - Date.now()` rather than decrementing independent counters.
- Handle background-tab timer throttling by checking the timestamp on every tick.
- Capture at or immediately after the target timestamp once.
- Record actual local capture timestamp for diagnostics.

## Capture quality

Each device captures its own local stream, not the remote video element.

- Use the selected local filter/mirror/crop semantics.
- Encode temporary frames as WebP Blob at documented quality and dimensions.
- Upload to the user's permitted raw path.
- Upsert one `photos` row per session, shot index, and user.
- Retry safely without duplicate rows.

## Composition modes

### Split

For each shot index, wait for both host and partner raw captures. Combine them side by side in the selected order.

### Alternate

Both users may capture on every countdown for simplicity and resilience, but the renderer selects the role assigned to that slot. If optimizing later, capture only the required participant after correctness is proven.

### Host-only / Partner-only

Require the selected source. If that participant disconnects, pause and show a recovery choice instead of silently substituting the other camera.

## Progression

- Do not move to the next shot until required uploads for the current shot are confirmed or a timeout decision is made.
- Broadcast progress updates.
- Persist current shot index and state so refresh can recover.
- Keep a bounded timeout and explicit retry/cancel UI.

## Review and retake

- Both participants see the same slot images and final preview.
- Host can trigger individual retake or restart all.
- Partner may send a retake request; host accepts/starts it.
- Retake replaces only the targeted shot records.
- Old replaced raw objects should be deleted or superseded safely.
- Frozen session settings remain unchanged during review unless the host returns to setup and starts a new session revision.

## Final rendering

- Host renders the high-resolution final canvas from authorized raw captures and the frozen settings snapshot.
- Upload final PNG to the private result path.
- Insert/upsert one `results` row.
- Broadcast completion.
- Both participants obtain an authorized download URL.

## Disconnect behavior

- If partner disconnects before countdown, pause preparation.
- If disconnect occurs during countdown, let the current scheduled capture resolve, then evaluate required uploads.
- Allow a reconnect grace period.
- Do not discard already uploaded captures.
- Make host refresh recover the session from database state.

## Acceptance criteria

Using two browser contexts:

- One host start triggers the same visible countdown on both clients.
- Each client submits exactly one raw frame per required shot.
- Split mode uses both local-quality captures.
- Alternate mode assigns correct roles to slots.
- Individual retake replaces only one shot.
- Refresh during review restores the session.
- Duplicate events do not duplicate captures or rows.
- Upload failure has retry and does not advance incorrectly.
- Both users can download the same final result.
- All tests and build pass.

## Required tests

- reducer/state-machine transition tests
- duplicate event id tests
- stale revision tests
- timestamp countdown tests with fake timers
- role-to-slot assignment tests
- upload retry/idempotency tests
- two-context Playwright happy path

## Stop condition

Do not add a broad gallery or redesign. Finish the shared photobooth loop first.
