# Frontend Quality Guidelines

---

## Forbidden

- ❌ Recomputing any game number client-side (scores, deltas, thresholds, RNG).
- ❌ Hardcoded Chinese gameplay narrative in components (it comes from the server/AI).
- ❌ `any` / `as` on domain or server data.
- ❌ Animations with no `prefers-reduced-motion` path.
- ❌ Whole-page `"use client"` to satisfy one interactive child.

## Required

- ✅ Types imported from `lib/game/schema.ts`.
- ✅ Server Actions for all mutations; a pending state on every submit.
- ✅ Each core-loop.md visual moment is its own component, reduced-motion aware.
- ✅ Keyboard-operable controls; labeled inputs.

## Testing

- **Vitest + React Testing Library** for components with logic (exam input, event choices, heir selection): assert that server-provided state renders and that the right intent fires on interaction (with mocked Server Actions).
- Snapshot only stable presentational primitives.
- **Playwright (optional, recommended):** one happy-path e2e — new game → season → exam → result — to catch cross-layer serialization breaks.

## Accessibility (the dramatic moments must not exclude players)

- Respect `prefers-reduced-motion`; provide non-animated equivalents.
- Sufficient contrast for the dimmed "落第" and gold "中举" states.
- Never convey outcome by color or sound alone — always include text (捷报 / 落第).

## Code review checklist

- [ ] No game number computed client-side
- [ ] Types from the shared schema, no `any`
- [ ] Mutations via Server Actions with pending UI
- [ ] Animations have a reduced-motion fallback
- [ ] Displayed narrative sourced from the server, not hardcoded
