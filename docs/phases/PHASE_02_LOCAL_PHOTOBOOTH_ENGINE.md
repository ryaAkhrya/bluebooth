# Phase 02: Stabilize the Local Photobooth Engine

## Objective

Turn the migrated local prototype into a reliable, testable photobooth engine before networking is introduced.

## Required work

### Shared geometry

1. Implement a pure grid geometry function that computes slot rectangles from preset areas, dimensions, gap, padding, frame bands, and radius.
2. Make grid thumbnails, live preview, review preview, and final canvas use the same preset and geometry contract.
3. Add unit tests for symmetric and asymmetric presets, including 1×1, 2×2, story strip, editorial portrait, wide-main landscape, and 3×3 contact sheet.

### Canvas renderer

1. Refactor canvas output into a pure-ish async renderer receiving explicit inputs.
2. Correctly support custom frame `front` and `behind` placement in both preview and final output.
3. Respect selected fit behavior where relevant.
4. Preserve frame labels, dates, room name, numbering, borders, padding, gap, background, and corner radius.
5. Export final output using `canvas.toBlob()` rather than storing a giant data URL as the primary representation.
6. Use object URLs with deterministic revocation for previews/downloads.
7. Keep PNG for the final result and compressed WebP/JPEG for temporary slot captures.

### Camera and capture

1. Create a `useCamera` hook with clear states: idle, requesting, ready, denied, unavailable, stopped.
2. Enumerate devices only after permission where required.
3. Correctly switch devices and update the selected device.
4. Apply mirror, brightness, contrast, saturation, warmth, zoom, filter, and fit consistently to live preview and local capture.
5. Stop all tracks on leave/unmount.
6. Avoid duplicate camera requests.
7. Remove demo animation RAF leaks.

### Session state machine

Replace loose timers with explicit states:

```text
idle -> countdown -> capturing -> betweenShots -> completed
                     -> paused
                     -> cancelled
```

- Prevent duplicate capture calls.
- Make cancel and pause deterministic.
- Make individual retake preserve all other slots.
- Keep restart-all behavior.
- Clear all timers on screen change/unmount.

### Security and robustness

- Do not interpolate user text into raw HTML.
- Validate uploaded frame MIME type, maximum size, and decoded dimensions.
- Reject malformed files with a useful error.
- Keep a graceful no-camera generated placeholder.
- Remove duplicate or dead code discovered during migration.

## Suggested limits

Define constants, for example:

```text
CUSTOM_FRAME_MAX_BYTES = 10 MB
CUSTOM_FRAME_MAX_DIMENSION = 6000 px
TEMP_CAPTURE_MAX_DIMENSION = 1920 px
```

Choose sensible values and document them.

## Tests

Add tests for:

- slot count and ordering
- grid rectangle geometry
- split rectangle helper
- frame layer order
- output dimensions for each ratio category
- session transitions
- individual retake behavior
- uploaded file validation
- filename generation

## Acceptance criteria

- Preview and exported output match for tested presets.
- Custom frame front/behind works in the final file.
- Local capture reflects camera settings.
- No unbounded animation/timer/media leaks.
- Retake does not erase unrelated photos.
- Images are not persisted as giant base64 strings in localStorage.
- All tests, lint, typecheck, and build pass.

## Stop condition

Do not add Supabase. The result of this phase must be a polished single-browser photobooth.
