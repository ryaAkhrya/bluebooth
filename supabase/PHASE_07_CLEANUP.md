# Phase 07 private media cleanup preparation

Phase 07 does not deploy or schedule cleanup automation. The application and
database prepare safe lifecycle boundaries, while a future server-side worker
must perform retention cleanup with server-only credentials.

## Current lifecycle

- Retakes overwrite the same user/shot object path with `upsert`, so superseded
  retake objects do not accumulate under new names.
- Final results remain private and are retained until the result creator deletes
  them.
- Result deletion first calls `soft_delete_result`. Only after `deleted_at` is
  committed may the creator remove the exact final object through Storage.
- If Storage removal fails, the result remains hidden and the object becomes a
  cleanup candidate. Retrying deletion is safe.
- Raw captures and session custom frames are not automatically deleted in this
  phase.

## Recommended retention

- Completed session raw captures and custom frames: delete after 24 hours.
- Cancelled or abandoned session media: delete after the containing room has
  expired and at least 24 hours have passed.
- Soft-deleted final objects: retry removal after 15 minutes.
- Soft-deleted result metadata: retain as a tombstone until object removal is
  verified, then optionally purge after 30 days.

## Future cleanup worker

Use a Supabase Edge Function or another trusted scheduled worker. It must:

1. Use a server-only service-role credential; never expose it to the browser.
2. Select bounded batches of eligible sessions/results.
3. Delete objects through the Storage API, not by deleting `storage.objects`
   rows directly.
4. Delete capture metadata only after Storage confirms object deletion.
5. Keep soft-deleted result metadata when object deletion fails.
6. Record counts and errors without logging signed URLs or private image data.
7. Be idempotent and safe to retry.

Suggested batch order:

1. Soft-deleted final result objects.
2. Raw and frame objects for completed sessions older than the retention window.
3. Raw and frame objects for cancelled or expired abandoned sessions.
4. Orphaned metadata after object deletion is confirmed.

## Deployment status

Not deployed and not scheduled. Applying the Phase 07 migration does not create
cron jobs, Edge Functions, secrets, or external infrastructure.
