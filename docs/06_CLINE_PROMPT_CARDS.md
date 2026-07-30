# Cline Prompt Cards

Use one prompt at a time.

## Universal phase prompt

```text
Read @docs/05_CLINE_GLOBAL_RULES.md, @docs/01_CURRENT_PROJECT_AUDIT.md, @docs/02_PRODUCT_SPEC.md, and @docs/03_TARGET_ARCHITECTURE.md. Then read the requested phase file completely.

Execute only that phase. Do not begin work from later phase files. Preserve the current Bluebooth visual direction and existing useful mockup behavior. Before editing, inspect the repository and provide a concise implementation plan. After editing, run every required check, fix failures, and provide the exact completion report required by the global rules.
```

## Phase 01

```text
Execute @docs/phases/PHASE_01_MIGRATE_MOCKUP_TO_NEXTJS.md now.
```

## Phase 02

```text
First verify Phase 01 acceptance criteria. Then execute @docs/phases/PHASE_02_LOCAL_PHOTOBOOTH_ENGINE.md. Do not add Supabase yet.
```

## Phase 03

```text
Read @docs/04_DATA_SECURITY_BLUEPRINT.md and execute @docs/phases/PHASE_03_SUPABASE_FOUNDATION.md. Use migrations and RLS, not dashboard-only undocumented changes.
```

## Phase 04

```text
Execute @docs/phases/PHASE_04_REALTIME_ROOMS.md. Replace simulated room behavior with real two-browser room behavior, but do not add WebRTC video yet.
```

## Phase 05

```text
Execute @docs/phases/PHASE_05_WEBRTC_DUAL_CAMERA.md. Supabase Realtime is signaling only. Video must remain peer-to-peer and audio must remain disabled.
```

## Phase 06

```text
Execute @docs/phases/PHASE_06_SYNCHRONIZED_CAPTURE.md. Implement a host-authoritative, retry-safe shared capture state machine and verify it with two browser contexts.
```

## Phase 07

```text
Execute @docs/phases/PHASE_07_RESULTS_AND_HISTORY.md. Keep Storage private and remove base64 image persistence from localStorage.
```

## Phase 08

```text
Execute @docs/phases/PHASE_08_QA_POLISH_HARDENING.md. Do not redesign the product. Focus on tests, accessibility, mobile behavior, reconnects, error states, and security.
```

## Phase 09

```text
Execute @docs/phases/PHASE_09_DEPLOYMENT.md. Prepare and verify production deployment without exposing secrets. Stop if a required external credential or dashboard action cannot be completed, and report the exact manual step rather than inventing success.
```

## Repair prompt

Use this when a phase build fails:

```text
Do not add new features. Diagnose the current failures from first principles, identify the smallest safe fix, apply it, and rerun lint, typecheck, tests, and build. Do not suppress errors or enable ignoreBuildErrors. Report root cause and proof of the fix.
```

## Visual regression prompt

```text
Compare the current Next.js implementation against @reference/mockup/index.html. Preserve layout hierarchy, palette, spacing, typography scale, responsive behavior, and the prominence of grid/frame controls. Fix regressions without adding new visual motifs. Do not use an iframe or copy the entire HTML into one component.
```
