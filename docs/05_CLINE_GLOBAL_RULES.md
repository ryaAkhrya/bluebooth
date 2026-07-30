# Cline Global Rules for Bluebooth

Apply these rules to every phase.

## Scope discipline

1. Execute only the requested phase.
2. Do not silently start future phases.
3. Do not replace the approved product with a new visual concept.
4. Do not add unrelated features.
5. Do not add audio calling, chat, accounts, social sharing, payments, stickers, emoji, AI features, or marketing sections.

## Visual preservation

- Preserve the soft bright-blue visual language from the standalone mockup.
- Grid and frame controls must remain the most visually prominent editor features.
- No purple-neon gradients, giant blurred blobs, random sparkles, mascots, or generic SaaS layout.
- Use SVG/Lucide icons, not emoji.
- Keep copy concise and functional.
- Preserve responsive behavior and reduced-motion support.

## Engineering rules

- Keep TypeScript strict.
- Remove `typescript.ignoreBuildErrors` rather than hiding errors.
- Do not use `any` unless documented and unavoidable at an external boundary.
- Do not use `dangerouslySetInnerHTML` to port the mockup.
- Do not embed the old HTML in an iframe.
- Do not create a single giant Client Component.
- Do not duplicate grid geometry between preview and canvas output.
- Do not put Supabase secret keys or TURN shared secrets in client code.
- Do not send video frames through Supabase Realtime.
- Do not make the media bucket public.
- Clean up media tracks, object URLs, animation frames, timers, Realtime channels, and peer connections.
- All network mutations must handle loading, success, error, retry, and stale-response cases.
- Use stable ids and typed event payloads.
- Validate file type, file size, and decoded image dimensions.

## Dependency rules

- Use pnpm because the repository contains `pnpm-lock.yaml`.
- Do not upgrade Next.js, React, or Tailwind without a phase requirement and clear reason.
- Prefer built-in React state plus small focused utilities.
- Before adding a dependency, explain the need and confirm existing packages cannot reasonably solve it.
- Pin new dependency versions through the lockfile.

## Change safety

Before coding:

1. Read the current implementation and relevant docs.
2. State the phase plan briefly.
3. Identify files to change.
4. Preserve or archive the standalone mockup as a visual reference.

After coding:

1. Run formatting if configured.
2. Run lint.
3. Run type checking.
4. Run unit/component tests relevant to the phase.
5. Run `pnpm build`.
6. Fix failures instead of suppressing them.
7. Inspect the browser console for runtime errors when possible.

## Required final report from Cline

At the end of every phase, report:

```text
Phase completed:
Files added:
Files changed:
Files removed:
Commands run:
Test/build results:
Manual checks performed:
Known limitations:
Follow-up risks for the next phase:
Recommended commit message:
```

Do not say a feature works unless it was tested or clearly label it as unverified.
