# Fix lint gate and consistency bugs

## Goal

Make `pnpm lint` green and remove a few small consistency drifts surfaced by the 2026-05-24 completeness analysis — **without** changing persistence, gameplay, or UX behavior. This is the fast, low-risk task that unblocks the quality gate before the larger gameplay/persistence/UI tasks land.

## What I already know

Live lint result: **54 errors / 27 warnings**, in two buckets:

- **~40 errors from `local/claude-design-prototype/*.jsx`** — standalone prototype JSX with intentionally unresolved globals (`react/jsx-no-undef`, `react/no-unescaped-entities`). `eslint.config.mjs` only ignores `.next/out/build/next-env.d.ts`, not `local/**`. These are not app code.
- **~13 real production errors:**
  - 8× `react-hooks/set-state-in-effect`. Two sub-kinds:
    - 6× "read sessionStorage on mount → setState": `app/(game)/page.tsx:19`, `play/page.tsx:88`, `play/exam/page.tsx:45`, `inherit/page.tsx:70`, `leaderboard/page.tsx:42`, `palace/page.tsx:43`. **These load paths are slated for rewrite by the future persistence task.**
    - 2× "animation trigger on prop change": `components/game/StatRow.tsx:46` (delta chip), `components/game/ResultOverlay.tsx:52` (shake/confetti). **Likely touched by the future UI/UX task.**
  - 1× `react-hooks/rules-of-hooks`: server action `useToolAction` treated as a hook by its `use` prefix (`play/exam/page.tsx:108`). Rename off the `use` prefix; fix import in `exam/page.tsx`; drop the unused import in `play/page.tsx:14`.
  - 4× `prefer-const`: `lib/engine/balance.ts:41-43` (`fortune/drive/wealth`), `lib/engine/reducer.ts:85` (`newState`). (`balance.ts:40 erudition` is correctly `let` — it is reassigned.)

Consistency drifts (P2):

- **榜眼/探花 title ordering is inconsistent in 3 places.** Canonical (status order) is `lib/engine/exam.ts:165` `PALACE_TITLES = ["状元","榜眼","探花","进士"]` (状元>榜眼>探花>进士). Wrong: `lib/engine/reducer.ts:316` `titleOrder` (puts 探花 above 榜眼) and `app/(game)/play/page.tsx:47` `getHighestTitle` (探花 above 榜眼). Display/`highest_title_ever` only; no gameplay number depends on it.
- **NPC friend→mentor relationship type bug.** `lib/actions/game.ts:190-196`: socialize creates a `friend` NPC then pushes a relationship with `type: "mentor"`. `RelationshipSchema.type` enum (`schema.ts:37`) = `["mentor","rival","spouse","patron"]` — **no "friend"**. The fabricated `mentor` relationship can later satisfy 恩师引荐 (`game.ts:780` requires `type==="mentor" && affinity>=60`), an unintended exploit.

## Assumptions (temporary)

- Renaming `useToolAction` is purely internal (server action; only two import sites). No external/runtime contract depends on the name.
- Excluding `local/**` from ESLint is acceptable (those are reference prototypes, not shipped code).

## Open Questions

- None — all resolved (see Decisions).

## Decisions

- **Q1 — setState-in-effect (DECIDED):** shared hook + idiomatic fixes. Add a client `useSessionJSON<T>(key)` hook built on `useSyncExternalStore` (with a `getServerSnapshot` returning `null` so static prerender is safe), use it at the 6 sessionStorage-load sites; fix the 2 animation sites idiomatically (StatRow delta, ResultOverlay shake/confetti). The hook is the seam the persistence task swaps internally without touching call sites.
- **Q2 — NPC friend (DECIDED):** do **not** create a relationship entry for socialize-created `friend` NPCs. Only affinity-bearing roles (patron/mentor/…) get `relationships` entries. No schema enum change. This closes the 恩师引荐 exploit; `friend` affinity is consumed by no mechanic.
- **Q3 — title ordering (DECIDED):** extract a single shared `TITLE_RANK` constant in `lib/game/constants.ts` (aligned with `exam.ts` `PALACE_TITLES` status order) and consume it in `reducer.ts:316` and `play getHighestTitle`. Single source of truth.

## Requirements

- Add `local/**` to ESLint `globalIgnores` so prototype files are not linted.
- Rename the `useToolAction` server action off the `use` prefix (e.g. `applyToolAction`); update its real caller in `exam/page.tsx`; remove the dead import in `play/page.tsx:14` (and the unused `toolMessage`/`setToolMessage` there).
- Convert the 4 `prefer-const` sites to `const` (`balance.ts:41-43`, `reducer.ts:85`).
- Add `useSessionJSON<T>(key)` (useSyncExternalStore-based) and use it at the 6 sessionStorage-load sites; fix StatRow + ResultOverlay animation effects idiomatically.
- Extract a shared `TITLE_RANK` constant; consume it in `reducer.ts` and `play getHighestTitle` so 榜眼/探花 rank consistently.
- Stop attaching a `mentor` relationship to socialize-created `friend` NPCs (drop the entry).
- Only the 54 **errors** must be cleared (ESLint exits non-zero on errors, not warnings). Clear unused-var **warnings** only when they sit in code already being edited and are unambiguously dead (e.g. the dead `useToolAction` import + `toolMessage`/`setToolMessage` in `play/page.tsx`). **Do NOT delete** `loadSave` (persistence task will use it) or `scoreFixedChoice`/`scoreFreeText` (reducer-reuse task will use them) — leaving those warnings is intentional.

## Acceptance Criteria (evolving)

- [x] `pnpm lint` exits 0 (0 errors). Warnings minimized; remaining ones justified.
- [x] `pnpm typecheck`, `pnpm test` (117), `pnpm build` all still green.
- [x] No change to gameplay numbers, persistence behavior, or rendered UX (pure correctness/lint).
- [x] 恩师引荐 can no longer be unlocked by an ordinary socialize-created friend.
- [x] 榜眼/探花 rank consistently everywhere (single source of truth).

## Definition of Done

- All four gates green (lint/typecheck/test/build).
- Diff limited to lint/consistency; no persistence/gameplay/UX scope creep.
- Changed files re-verified; no new warnings introduced.

## Out of Scope (explicit)

- Persistence rewrite (save-id/localStorage/DB-authoritative) — separate task.
- Gameplay correctness (lineage wiring, heir data, palace→inherit, reducer reuse, exam gating) — separate task.
- UI/UX + responsive/mobile polish, animation moments, a11y — separate task.
- Palace rival summary, E3 fallback determinism — separate task.

## Technical Notes

- `eslint.config.mjs` uses flat config `globalIgnores([...])`; add `"local/**"`.
- Relationship `type` enum has no `friend` (`schema.ts:37`); NPC `role` enum does (`schema.ts:193`). Roles ≠ relationship types.
- The 6 sessionStorage-load effects are the seam the persistence task will swap; a small shared hook here would let that task change internals without touching call sites.
- Source analysis: `.trellis/workspace/haoran/2026-05-24-roadmap-completeness-analysis.md`.
