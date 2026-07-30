# Phase 09: Production Deployment

## Objective

Deploy Bluebooth with a hosted Supabase project and Vercel, then verify the real two-device experience over HTTPS and different networks.

## Pre-deployment gate

Before any production deployment:

- `pnpm install --frozen-lockfile`
- `pnpm lint`
- `pnpm typecheck`
- all unit/component/E2E tests
- `pnpm build`
- no `ignoreBuildErrors`
- no committed `.env` secrets
- no service-role/secret key in client code
- database migrations committed
- RLS and private storage tested

## Supabase production setup

1. Create or select the production project.
2. Enable anonymous sign-ins.
3. Configure allowed redirect/site URLs if auth flow uses them.
4. Link the CLI project.
5. Review migration diff.
6. Run migrations with the documented CLI workflow.
7. Create/configure the private media bucket if not fully migration-managed.
8. Apply Storage policies.
9. Enable Realtime.
10. Enforce private channels after authorization policies are verified.
11. Configure any cleanup Edge Function/cron.
12. Record region and project settings in deployment documentation without committing secrets.

Never use a destructive remote reset on production.

## Vercel setup

1. Push the repository to a private or appropriate Git provider repository.
2. Import the project into Vercel.
3. Confirm pnpm is detected.
4. Add production environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL
```

5. Add server-only TURN variables only if required by the implemented provider.
6. Deploy a preview first.
7. Test preview against a non-production or intentionally selected Supabase environment.
8. Promote/deploy production only after smoke tests.

Environment-variable changes require a new deployment to affect the built application.

## HTTPS and camera

Production camera access requires a secure context. Verify:

- production URL is HTTPS
- no mixed-content assets
- camera permission prompt appears
- camera is not blocked by response headers or iframe policy

## TURN production gate

STUN-only success on one network is not sufficient proof for an online couple app.

Before calling production reliable:

- configure a TURN service or coturn deployment
- obtain short-lived credentials securely
- test from two genuinely different networks, such as home Wi-Fi and mobile data
- verify relay candidate behavior in a restrictive scenario
- verify credentials are not exposed permanently

If TURN is not configured, release must be labeled beta/private with a documented connectivity limitation.

## Production smoke test

Use two real devices and two anonymous sessions:

1. Create a room on device A.
2. Join by code/link on device B.
3. Verify presence.
4. Verify both live videos.
5. Change grid and frame from both sides.
6. Run split mode with at least two shots.
7. Retake one shot.
8. Save final result.
9. Download on both devices.
10. Refresh both and verify expected recovery/history.
11. Leave and verify cleanup.
12. Confirm a third user cannot join or read data.

## Observability

At minimum, add privacy-safe production diagnostics for:

- room create/join failure category
- Realtime channel state
- WebRTC connection state category
- capture/upload failure category
- final render failure

Do not log image data, private URLs, tokens, SDP bodies, ICE credentials, or user-entered captions.

## Rollback plan

- Keep the last known-good Vercel deployment.
- Make database migrations backward-aware.
- Avoid destructive schema changes in the first production release.
- Document how to disable new room creation while preserving existing results if a severe issue occurs.
- Keep Storage objects intact during app rollback.

## Acceptance criteria

- Production deployment builds without ignored errors.
- HTTPS camera works.
- Two devices on different networks can connect using TURN.
- Full couple flow completes.
- RLS isolation is rechecked against production.
- Environment secrets are not exposed.
- Final result download works on desktop and mobile.
- Deployment and rollback steps are documented.

## Final output

Update `README.md` with:

- local setup
- Supabase setup and migrations
- environment variables
- test commands
- deploy steps
- known limitations
- privacy behavior

Then evaluate the project against `docs/15_FINAL_DEFINITION_OF_DONE.md`.
