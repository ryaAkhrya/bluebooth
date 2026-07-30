# Current Project Audit

## Repository snapshot

The uploaded ZIP contains a Next.js project with:

- Next.js `16.2.6`
- React `19`
- TypeScript `5.7.3`
- Tailwind CSS `4.3.3`
- pnpm lockfile
- App Router under `app/`

## What is actually implemented

The complete visual prototype lives in:

- `/index.html`
- `/public/index.html`

Those files are duplicates of the same roughly 2,287-line vanilla prototype. The prototype includes:

- Home, create room, join room, waiting room, setup, session, review, and final-result screens.
- 33 grid presets across Instagram, portrait, landscape, and print categories.
- 12 built-in frame presets.
- 8 camera filters.
- Custom PNG/WebP frame upload with opacity, scale, X/Y position, fit, and front/back controls.
- Local camera access through `getUserMedia()`.
- Mirror, brightness, contrast, saturation, warmth, zoom, and fit controls.
- 3, 5, and 10-second countdown options.
- Local capture, retake, high-resolution canvas composition, PNG download, and localStorage save.
- Simulated create/join room flow and simulated partner feed.

The JavaScript passes `node --check`, so the standalone prototype is syntactically valid.

## What the Next.js app currently renders

`app/page.tsx` only renders the text:

```text
Your v0 generation will show here.
```

Therefore `pnpm dev` does not show the Bluebooth prototype. The mockup is not integrated into React, App Router, or the component system.

## Backend and online gaps

The following are simulations only:

- Room creation and room lookup.
- Partner joining and leaving.
- Online presence.
- Shared grid/frame/timer state.
- Synchronized countdown.
- Remote camera feed.
- WebRTC offer, answer, and ICE signaling.
- Photo exchange between devices.
- Supabase Storage upload.
- Persistent result history.
- Authorization and room privacy.

No Supabase package, client, schema, migration, environment configuration, or RLS policy exists yet.

## Important implementation defects to fix during migration

1. `index.html` and `public/index.html` duplicate the same source of truth.
2. `next.config.mjs` sets `typescript.ignoreBuildErrors: true`. This must be removed before production.
3. The room share URL is hardcoded as `https://bluebooth.app/r/...`.
4. A custom frame marked as behind the photos is still drawn on top in the final canvas renderer.
5. The setup preview can simulate user, partner, split, and alternate modes, but actual capture reads only the local `sessionVideo`.
6. The final photo therefore does not yet represent two real users.
7. The demo canvas animation can create multiple active `requestAnimationFrame` loops without a reliable cleanup owner.
8. The audio context initialization line is duplicated.
9. Large final image data URLs are written to localStorage and may fail due to browser storage limits.
10. Several DOM sections construct `innerHTML`; user-controlled labels must not be inserted unsafely during the React migration.
11. Camera capture uses a fixed 800×600 source and cover-crops even when other fit modes are selected.
12. Preview and final-canvas rendering use separate layout logic, creating a risk that they drift visually.
13. There is no automated test coverage for grid geometry, canvas export, camera fallback, or room flows.
14. Camera and media cleanup are not tied to React route/component lifecycle because the prototype is not React yet.

## Preserve these strengths

- The visual system is already restrained and coherent.
- The grid preset configuration is data-driven.
- The mockup has graceful camera fallback.
- The final result uses a real canvas rather than a screenshot library.
- The UI avoids stickers, emoji, and generic AI-product styling.
- The mockup already treats grid and frame selection as the main editor experience.

## Migration conclusion

Treat the standalone HTML as an approved visual and interaction reference, not as the final architecture. Archive it for comparison, then rebuild its behavior using typed React components and reusable services.
