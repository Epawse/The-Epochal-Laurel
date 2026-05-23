# Roadmap Completeness Analysis — The Epochal Laurel (百世流芳)

Date: 2026-05-24 (live re-verification)
Scope: roadmap T1–T10 + pre-roadmap tasks, matched against `.trellis/spec/*` and `local/claude-design-*`.
Method: re-ran all quality gates; read engine, server actions, DB layer, all 8 page routes, AI contracts/schema/providers, migrations, constants/schema; grep-verified wiring claims.

> This document supersedes and extends `2026-05-24-detailed-task-review.md`. It corrects one stale point (RLS is now present) and adds several findings that the earlier pass did not capture. No source code was changed.

---

## 1. Quality Gates (live, this pass)

| Gate | Result | Detail |
|------|--------|--------|
| `pnpm typecheck` | ✅ PASS | `tsc --noEmit` clean |
| `pnpm test` | ✅ PASS | 5 files / 115 tests (engine only) |
| `pnpm build` | ✅ PASS | Next 16.2.6, 8 routes prerendered static |
| `pnpm lint` | ❌ FAIL | **54 errors, 27 warnings** |

### Lint breakdown (the important part)

- **~40 of 54 errors come from `local/claude-design-prototype/*.jsx`** — standalone prototype JSX with intentionally unresolved globals (`react/jsx-no-undef`, `react/no-unescaped-entities`). `eslint.config.mjs` only ignores `.next/out/build/next-env.d.ts`; it does **not** ignore `local/**`.
- **~13 real production errors:**
  - 8× `react-hooks/set-state-in-effect` — synchronous `setState` inside `useEffect` for the sessionStorage-load pattern: `app/(game)/page.tsx:19`, `play/page.tsx:88`, `play/exam/page.tsx:45`, `inherit/page.tsx:70`, `leaderboard/page.tsx:42`, `palace/page.tsx:43`, `components/game/StatRow.tsx:46`, `components/game/ResultOverlay.tsx:52`
  - 1× `react-hooks/rules-of-hooks` — `useToolAction` server action treated as a hook by the `use` prefix: `play/exam/page.tsx:108`
  - 4× `prefer-const` — `lib/engine/balance.ts:41-43`, `lib/engine/reducer.ts:85`
- **Implication:** ignoring `local/**` alone drops lint to ~13 errors; renaming `useToolAction` + the `prefer-const` fixes are trivial; the 8 setState-in-effect are the only ones needing real refactor.

---

## 2. Completion Matrix

Legend: ✅ done · ⚠️ done-with-gaps · ❌ broken/missing-against-spec

### Pre-roadmap tasks

| Task | Status | Evidence / Note |
|------|--------|-----------------|
| Bootstrap guidelines | ✅ | 3 spec layers + guides all present and detailed |
| Art assets + UI prototypes | ⚠️ | 34 `public/assets/*.png` ✓; showcase+prototype 34 each; `public/assets/art-bible/` dir exists; **no `style-guide.md` found**; prototype files pollute lint |
| Fix spec issues | ✅ (spec) | specs internally consistent; implementation has since drifted (§3) |
| LLM multi-provider | ⚠️ | `lib/ai/providers.ts` + `client.ts` + all 8 contracts + `schema.ts` present; **structure complete**; live API not re-probed this pass (`pnpm test:llm` not run) |

### Roadmap T1–T10

| Task | Status | Key evidence |
|------|--------|--------------|
| T1 Schema/Constants/Design/Assets | ✅ | `constants.ts` origins/base/thresholds/requirements/rewards/blessings/era-mods/transitions all match `balance.md`; assets present; Tailwind v4 `@theme` (roadmap's `tailwind.config.ts` is moot) |
| T2 Game Engine | ✅ (strongest) | `rng/balance/exam/lineage/inheritance/reducer` present; formulas match `balance.md`; 115 tests pass. Caveats in §3.1 |
| T3 UI lib + Landing + Create | ⚠️ | components + landing + create good; **Zustand `useUiStore` defined but has zero consumers** (violates `state-management.md`); lint-dirty |
| T4 Server actions + DB + Daily loop | ❌ (arch) | loop is playable, but persistence diverges hard from spec (§3.2 P0); exam-availability logic broken (§3.1) |
| T5 Exam flow + Tools | ⚠️ | E1/E2/R1 wired; 小抄 + 榜眼引路 have UI; **恩师引荐 server-only, no UI**; scoring re-inlined (engine `scoreFixedChoice/scoreFreeText` unused); requirements/ban not enforced at entry |
| T6 Events + NPC | ⚠️ | V1/V2/N1 + EventModal + memory cap + patron reveal work; **friend NPC gets `mentor` relationship** bug |
| T7 Inheritance + Transition | ❌ (semantic) | page/I1/era-transition/chooseHeir present but **selected heir discarded**, **marriage/birth never wired → always sonless**, **palace→inherit broken** (§3.3) |
| T8 Palace + Ranking | ⚠️ | page/E3/ranking/victory-tiers/御评 present; **rival summary always empty**, **E3 fallback non-deterministic**, **传之后世 broken**, 榜眼/探花 never written to `titles` |
| T9 Leaderboard + Save polish | ⚠️ | leaderboard UI + record/fetch work; **"继续旧梦" reads sessionStorage not DB**; save system not spec-compliant |
| T10 Animation/Responsive/Edge | ⚠️ | ResultOverlay confetti/shake, era-wipe, scheme-exposure overlay, reduced-motion hooks, error/loading components, `md:` responsive present; not all P0/P1 moments done; **375px not verified this pass** |

---

## 3. Spec-Match Findings (with file:line)

### 3.1 game-design (engine is faithful; gameplay wiring + a few paths are not)

- **Engine formulas match `balance.md`.** Threshold, diminishing returns, drive decay, scheme exposure, fertility numbers, inheritance tokens/decay, era Markov chain, palace ranking all correct in `lib/engine/*`. `palaceRanking` uses the canonical order `["状元","榜眼","探花","进士"]` (`exam.ts:165`).
- **Server actions bypass reducer entry points** (roadmap says `reducer.ts` is the single deterministic entry):
  - `submitExamAnswer()` (`actions/game.ts:485`) inlines scoring + title + history and **never calls `resolveExam()`** (`reducer.ts:221`). Consequence: `resolveExam`'s **exam-schedule reset** (`reducer.ts:256-263`) is skipped → after a level's countdown hits 0 it is never reset.
  - `submitPalaceExam()` (`actions/game.ts:1078`) duplicates `resolvePalaceExam()` (`reducer.ts:281`).
  - `scoreFixedChoice/scoreFreeText` (`exam.ts:39,53`) are dead (lint flags them) because game.ts re-implements the math (`game.ts:518-541`).
- **Exam availability/gating is incoherent** (`play/page.tsx:54-69,332-340`): `getNextExamCountdown` filters out any level at `seasons === 0`, so a county exam that just came due is hidden and the CTA stays disabled until *all three* counters reach 0. `EXAM_REQUIREMENTS` (`constants.ts:102`) and `exam_ban` status are **not checked** at the entry CTA; the exam page picks level purely from titles (`play/exam/page.tsx:48-52`).
- **Lineage is built but unwired (root-cause of broken generational loop):** `canMarry/rollFertileUntil/rollSonBirth/rollChildSurvival/getHeirCandidates` (`lineage.ts`) are implemented and unit-tested but **grep confirms zero callers** in `app/`+`lib/` outside `lineage.ts`/tests. No `marry` action in `ACTIONS` (`constants.ts:134`); `advanceSeason` (`reducer.ts:75`) never touches `family`. `character.family.children` is therefore always empty → `countHeirs` always 0 → every inheritance is adoption-or-extinction.
- **Title-order inconsistency for 榜眼/探花** (3 different orderings): canonical `exam.ts:165` (榜眼>探花, correct) vs `reducer.ts:316` `titleOrder` (探花>榜眼, wrong) vs `play/page.tsx:47` `getHighestTitle` (探花>榜眼, wrong). Display/`highest_title_ever` only, but it is real drift.

### 3.2 backend — `database-guidelines.md` is materially violated (P0)

- **Cookie session instead of localStorage save-id.** `getSessionId()` sets an httpOnly cookie `game_session_id` (`db/client.ts:38-55`). Spec §"Session & Save Reconnection" explicitly: *no cookies, no server session* — reconnect via `localStorage["epochal-laurel-save-id"]` + `?save=<id>` override.
- **DB is effectively write-only; sessionStorage is the runtime source of truth.** Every page loads/saves the full `GameState` blob from/to `sessionStorage["game_state"]` (`page.tsx:15`, `create/page.tsx:108`, `play/page.tsx:84,98`, `exam`, `palace`, `inherit`). `loadSave()` (`queries.ts:17`) is **imported but never used** (lint: `game.ts:9`). So saves don't survive a browser/device change and the QR `?save=` share is impossible.
- **Server is not authoritative** (violates `state-management.md`): the client passes its own `gameState` *into* every action (`advanceTurn(gameState, …)`), and the action computes on client-supplied state. The spec mandates server-held state replaced wholesale per action.
- **Schema drift:** `saves(id, session_id unique, state, updated_at)` (`001_initial.sql`) vs spec `saves(id, slot, state, turn_number, updated_at)`. `leaderboard` adds `session_id`/`highest_title`, uses `created_at` not `achieved_at`.
- **RLS — FIXED since the prior review.** `002_add_rls.sql` (commit 416ee62) enables RLS on both tables with `anon` policies. The earlier doc's "RLS missing" is now stale.
- Single-actions-file convention ✓ (`lib/actions/game.ts`). Logging: contracts use `lib/log`; actions use `console.warn` (minor).

### 3.3 frontend — flow breaks + state-arch deviation

- **Palace → Inheritance is broken (P0 path).** `palace/page.tsx:251-260` "传之后世" does `removeItem("palace_result"); push("/inherit")` but **never sets `inheritance_data`**; `inherit/page.tsx:65-77` redirects to `/play` when `inheritance_data` is absent. So the post-victory "continue dynasty" path always bounces back to play.
- **Selected heir is discarded.** `inherit/page.tsx` renders rich I1 heirs (name/traits/hint/bonus) and calls `chooseHeir(state, heirIndex, …)`; `resolveInheritance` (`reducer.ts:338`) uses `heirIndex` to pick an **origin option** (`:377`), names the child `${family}氏第N代` (`:409`), and sets traits to `[originDef.trait]` (`:421`). Heir name/traits/`starting_bonus` are never applied.
- **Zustand unused.** `useUiStore` (`stores/uiStore.ts`) has zero consumers; overlays are driven by local `useState` + sessionStorage instead. `state-management.md` requires Zustand for transient UI and forbids mirroring `GameState` client-side.
- **Palace rival summary always empty.** `getRivalSummary` (`palace/page.tsx:268-276`) `return rival ? "" : "";` — dead both branches; E3 `answer_summary` never surfaces.
- 8 page routes match `screen-map.md`; overlays (event/result/era) render as portals as specified.

### 3.4 AI layer

- `schema.ts` defines all contracts (V1, V2, N1, E1, E2, R1, I1, E3) with Zod; header comment ("E1…land here later") is stale — they are all present.
- `providers.ts` — clean self-written multi-provider (DeepSeek primary / Gemini fallback), per-provider thinking-disable handling; matches the verified DeepSeek-V4 + Gemini-3.5-Flash notes.
- **E3 procedural fallback is non-deterministic:** `Date.now()` (`palaceRivals.ts:86`) + `Math.random()` (`:90`). Outside `lib/engine` so engine purity holds, but identical saved state can yield different fallback rivals.

---

## 4. Claude Design Alignment

- Visual direction well-preserved: 34 `public/assets/*.png` (matches roadmap), showcase/prototype 34 each, `art-bible` dir present, palette/fonts wired in landing/create/play.
- All 8 screens implemented in the prototype's spirit (verified by reading each page).
- Gaps: `local/claude-design-prototype` is linted (should be excluded) → ~40 lint errors; no `style-guide.md`; 375px/browser visual QA not performed this pass.

---

## 5. Blockers, Ranked

**P0 (gate / fundamental):**
1. Lint red — exclude `local/**`, rename `useToolAction`, fix 8 setState-in-effect + 4 prefer-const.
2. Persistence vs `database-guidelines.md` — move to DB-authoritative save-id in `localStorage` + `?save=` override; remove cookie identity; actually use `loadSave`; stop treating sessionStorage as truth.
3. Palace → Inheritance dead path — populate `inheritance_data` (or a victory-continue action) before routing to `/inherit`.

**P1 (core fantasy / correctness):**
4. Lineage unwired — add `marry` action + yearly birth/survival rolls in `advanceSeason`, so sons exist and the 3-heir choice is real.
5. Selected heir discarded — apply chosen heir's name/traits/bonus in `resolveInheritance`.
6. Reducer bypass — route `submitExamAnswer`/`submitPalaceExam` mutations through `resolveExam`/`resolvePalaceExam` (restores schedule reset, removes duplication).
7. Exam gating — central helper for eligible level + requirement/ban status + countdown + lock reason.

**P2 (polish / consistency):**
8. NPC friend→mentor relationship type (`game.ts:190-196`).
9. Palace rival summary dropped; E3 fallback non-determinism; 榜眼/探花 not written to `titles`.
10. Title-order inconsistency across `reducer.ts:316` / `play getHighestTitle` vs canonical.
11. Zustand: either adopt per spec or delete the dead store.
12. Visual QA at desktop + 375px; remaining P0/P1 animation moments; `style-guide.md`.

---

## 6. Recommended Repair Order

1. **Lint actionable** (cheap, unblocks the gate): ignore `local/**`; rename `useToolAction`; fix setState-in-effect + prefer-const.
2. **Persistence rewrite** (unblocks everything else's correctness): save-id model, DB-authoritative loads, `?save=`, drop cookie, use `loadSave`.
3. **Reducer reuse**: delegate exam/palace mutation to engine functions.
4. **Lineage wiring**: marry action + birth rolls → real heirs.
5. **Inheritance semantics**: use selected heir; connect palace "传之后世".
6. **Exam availability helper**.
7. **Palace/leaderboard polish**: rival summaries, deterministic E3, title writes, save cleanup.
8. **Visual QA** desktop + 375px + reduced-motion + focus.
