# Phase 07: Private Results, History, Custom Frames, and Cleanup

## Objective

Make results persist safely beyond the current tab and provide a simple private history experience without turning Bluebooth into a social platform.

## Result persistence

- Store final PNG files in the private bucket.
- Store metadata in `results`.
- Use authenticated download or short-lived signed URLs.
- Do not store final image base64 in localStorage.
- localStorage may keep harmless preferences such as last selected grid or camera settings, but not private result data.

## History UI

Replace `Open previous result` with a private result history screen/modal sourced from Supabase.

Show:

- thumbnail
- creation date
- grid name and aspect ratio
- room name/code where appropriate
- dimensions
- download action
- delete action with confirmation

Keep it compact. No feed, likes, comments, or sharing metrics.

## Access model

- Only users who were room members may access that room's results.
- Decide and document whether anonymous identity loss means old results become inaccessible. For version 1, that is acceptable if clearly stated.
- Delete must soft-delete metadata first or use a safe transactional workflow.
- Signed URLs must have limited lifetime and be refreshed when expired.

## Custom frame persistence

- Upload custom frame files to a private session path when the user chooses to share them with the partner.
- Broadcast/persist metadata, not a base64 data URL.
- Partner downloads the authorized frame file.
- Validate MIME, file size, dimensions, and transparency compatibility where practical.
- Preserve front/behind, fit, opacity, scale, and offsets in the session settings snapshot.

## Cleanup

Implement or clearly configure:

- deletion of superseded retake raw files
- deletion of raw captures after finalization or after a short retention window
- deletion of abandoned session files after expiry
- deletion of result object when a result is deleted

If automated cleanup requires an Edge Function, cron, or external schedule, include the code/configuration and deployment instructions. Do not claim cleanup exists if only documented.

## Image lifecycle details

- Revoke browser object URLs.
- Cache signed URLs only until near expiry.
- Avoid downloading full-resolution images merely to render tiny history thumbnails when a smaller representation is available.
- Consider creating a private thumbnail alongside the final result.

## Acceptance criteria

- Closing and reopening the app still shows authorized prior results for the same anonymous user.
- A non-member cannot load a result URL after authorization expires.
- Delete removes access and underlying objects according to the documented workflow.
- Custom frame appears on both clients and survives refresh during the room session.
- Raw cleanup is verifiably configured or the exact remaining manual limitation is documented.
- No base64 result is persisted in localStorage.
- Tests and build pass.

## Stop condition

Do not add public sharing or user profiles.
