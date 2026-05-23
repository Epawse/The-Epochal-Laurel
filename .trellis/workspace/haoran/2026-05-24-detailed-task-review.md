# Detailed Task Review - The Epochal Laurel

Date: 2026-05-24  
Scope: roadmap, Trellis specs, archived task PRDs, local Claude design showcase, local Claude prototype, and current implementation.

## Executive Summary

The project has a functional vertical slice: type-check, tests, and production build pass. The design direction, assets, engine tests, AI contract structure, and main UI screens are mostly present.

The implementation is not yet production-ready. The main blockers are lint failure, save/reconnect drift from the latest database spec, broken inheritance continuation after the palace exam, incomplete heir data usage, and several places where server actions reimplement engine behavior instead of using reducer entry points.

No source code was changed during this review.

## Verification Results

- `pnpm typecheck`: passed.
- `pnpm test`: passed, 5 test files / 115 tests.
- `pnpm build`: passed.
- `pnpm lint`: failed with 54 errors / 27 warnings.
- `git diff --name-only HEAD`: empty at review time.
- `git status --short`: untracked `.agents/`, `.codex/`, `supabase/.temp/`, `tsconfig.tsbuildinfo`.
- Asset counts:
  - `public/assets/*.png`: 34 at max depth 1.
  - `public/assets/**/*.png`: 68 total.
  - `local/claude-design-showcase/assets/*.png`: 34.
  - `local/claude-design-prototype/assets/*.png`: 34.
- `local/claude-design-showcase/Art Bible.html` and `local/claude-design-prototype/Art Bible.html` are identical.

## P0 Blockers

### Lint Fails

The lint gate is red. There are two categories:

- Production code issues: React effect synchronous setState errors, hook naming false-positive, unused imports, and `prefer-const`.
- Local prototype issues: `local/claude-design-prototype` is scanned by ESLint and contains standalone JSX fragments with intentionally unresolved globals.

Evidence:

- `eslint.config.mjs:9` only ignores `.next/**`, `out/**`, `build/**`, and `next-env.d.ts`; it does not ignore `local/**`.
- `app/(game)/play/exam/page.tsx:108` calls the server action `useToolAction(...)`; ESLint treats it as a React hook because of the `use` prefix.
- Synchronous setState-in-effect examples:
  - `app/(game)/page.tsx:19`
  - `app/(game)/play/page.tsx:88`
  - `app/(game)/play/exam/page.tsx:45`
  - `app/(game)/inherit/page.tsx:70`
  - `app/(game)/leaderboard/page.tsx:42`
  - `app/(game)/palace/page.tsx:43`
  - `components/game/StatRow.tsx:46`
  - `components/game/ResultOverlay.tsx:52`

Impact:

The project cannot pass the declared quality gate even though type-check/build/tests pass.

Suggested direction:

Ignore archived/local design prototype files in ESLint, rename `useToolAction` to a non-hook server action name, and refactor initial storage reads away from synchronous effect setState patterns.

### Save/Reconnection Flow Does Not Match Current Spec

The latest database spec requires anonymous save reconnection via a DB save id stored in `localStorage["epochal-laurel-save-id"]`, with `?save=<id>` URL override. It explicitly says the server should not use cookies for session tracking.

Current implementation stores full `GameState` blobs in `sessionStorage` and also uses a server cookie named `game_session_id`.

Evidence:

- Spec: `.trellis/spec/backend/database-guidelines.md:84`
- Landing checks `sessionStorage`: `app/(game)/page.tsx:13`
- Create writes full state to `sessionStorage`: `app/(game)/create/page.tsx:107`
- Play loads/saves full state from/to `sessionStorage`: `app/(game)/play/page.tsx:82`, `app/(game)/play/page.tsx:95`
- Inheritance/palace/leaderboard use transient `sessionStorage` handoff keys.
- Cookie session: `lib/db/client.ts:38`
- `loadSave()` exists but is not used by the UI load path: `lib/db/queries.ts:17`; it is imported but unused in `lib/actions/game.ts:9`.

Impact:

Refresh/reconnect/share behavior does not satisfy the current spec. It also splits authority between browser storage and Supabase state.

Suggested direction:

Move to save-id based persistence:

- `newGame()` creates/returns a save id.
- Client stores only that id in localStorage.
- Screens load authoritative state through server actions using the id.
- Add `?save=` override.
- Remove cookie dependence for save identity.

### Palace To Inheritance Path Is Broken

The Palace page's "传之后世" button routes directly to `/inherit`, but the inheritance page requires `sessionStorage["inheritance_data"]`. The Palace page clears `palace_result` and never generates or stores inheritance data.

Evidence:

- Direct route: `app/(game)/palace/page.tsx:253`
- Inheritance page redirects if `inheritance_data` is missing: `app/(game)/inherit/page.tsx:64`

Impact:

After a palace exam, the player cannot continue the dynasty through that button. They are redirected back to play instead of entering inheritance.

Suggested direction:

Before routing to `/inherit`, call the same heir-generation flow used after death or introduce a dedicated "continue after victory" inheritance action that writes/passes proper inheritance context.

### Heir Selection Does Not Use Generated Heir Data

`generateHeirsAction()` returns I1-generated heirs, but `chooseHeir()` only accepts `heirIndex`; `resolveInheritance()` uses the index to choose an origin option, not the selected heir. The new character name is generated as `${family}氏第${generation}代`.

Evidence:

- I1 result created: `lib/actions/game.ts:861`
- `chooseHeir(currentState, heirIndex, purchasedBlessingIds)`: `lib/actions/game.ts:964`
- `resolveInheritance()` maps `heirIndex` to `originOptions`: `lib/engine/reducer.ts:372`
- New character ignores heir name/traits: `lib/engine/reducer.ts:405`

Impact:

The inheritance UI appears to let the player choose a specific heir, but the game state does not preserve that choice. This is a major T7 spec/UX mismatch.

Suggested direction:

Pass selected heir data into the inheritance resolver or store deterministic heir candidates in state before selection. Use the selected heir's name, flavor/traits, and son/adoption metadata when creating the next character.

## Cross-System Findings

### Engine Functions Are Not Consistently Used By Server Actions

The roadmap and backend spec name `lib/engine/reducer.ts` as the single deterministic rules entry point. Some server actions use it, but exam and palace flows duplicate scoring/title/history behavior inline.

Evidence:

- `resolveExam()` resets exam schedule after an attempt: `lib/engine/reducer.ts:256`
- `submitExamAnswer()` manually updates title/history and never calls `resolveExam()`: `lib/actions/game.ts:588`
- `resolvePalaceExam()` exists: `lib/engine/reducer.ts:281`
- `submitPalaceExam()` manually ranks, awards titles, writes history, and updates dynasty: `lib/actions/game.ts:1141`

Impact:

Logic can drift. The clearest current example is exam schedule reset: engine has it, server action bypasses it.

Suggested direction:

Keep AI orchestration in server actions, but delegate deterministic mutation to reducer functions.

### Exam Schedule And Gating Are Incomplete

The daily page chooses the nearest countdown from county/provincial/metropolitan, not the exam the character is eligible or ready for. It also does not check exam requirements or exam ban in the CTA.

Evidence:

- Nearest countdown helper: `app/(game)/play/page.tsx:54`
- CTA disabled only by countdown/event: `app/(game)/play/page.tsx:332`
- Exam page independently infers level from titles: `app/(game)/play/exam/page.tsx:47`
- Exam requirements exist in constants: `lib/game/constants.ts:102`

Impact:

The UI can offer or label exams inconsistently with player status. Exam bans and stat requirements are not enforced at the entry point.

Suggested direction:

Create a server/engine-derived exam availability helper that returns current target level, requirement status, countdown, and lock reason.

### Marriage/Birth/Children Are Not Wired Into Gameplay

Lineage functions exist, but the daily loop only renders the five base actions. There is no visible "Marry" action or yearly birth roll integration in `advanceSeason()`.

Evidence:

- Spec says heirs come from marriage and surviving sons: `.trellis/spec/game-design/core-loop.md:138`
- Lineage functions exist: `lib/engine/lineage.ts:30`
- Daily loop maps only `ACTIONS`: `app/(game)/play/page.tsx:285`
- `ACTIONS` contains study/socialize/earn/rest/scheme only: `lib/game/constants.ts:134`

Impact:

Normal play rarely creates sons. Inheritance tends toward adoption or family extinction, undermining the generational fantasy.

Suggested direction:

Add a marriage action and integrate yearly birth/survival rolls into the season/year advancement path.

### NPC Relationship Type Bug

Socialize can create a new `friend` NPC but adds a relationship of type `"mentor"`.

Evidence:

- Creates role `"friend"`: `lib/actions/game.ts:190`
- Adds relationship type `"mentor"`: `lib/actions/game.ts:192`

Impact:

The Mentor's Plea tool may become available through ordinary friend creation rather than an actual mentor relationship.

Suggested direction:

Use a relationship type compatible with the schema and design. If friends are relationship-bearing, update schema; otherwise create actual mentor NPCs only when the relationship type is mentor.

### Palace Rival Summary Is Lost

E3 returns `answer_summary`, but palace exam history stores only rival name and score. `getRivalSummary()` then always returns an empty string.

Evidence:

- E3 output has `answer_summary`: `lib/ai/prompts.ts:419`
- History stores only `{ name, score }`: `lib/actions/game.ts:1184`
- Summary helper returns empty string: `app/(game)/palace/page.tsx:267`

Impact:

The palace UI has a designed row for rival answer summaries, but it renders no real content.

Suggested direction:

Extend the palace result DTO and/or history snapshot to include answer summaries.

### E3 Fallback Is Non-Deterministic

The procedural fallback for palace rivals uses wall-clock time and `Math.random()`.

Evidence:

- `Date.now()`: `lib/ai/contracts/palaceRivals.ts:86`
- `Math.random()`: `lib/ai/contracts/palaceRivals.ts:90`

Impact:

This is outside `lib/engine`, so it does not violate engine purity directly, but it makes fallback palace outcomes non-reproducible for the same saved state.

Suggested direction:

Pass a seed or deterministic context into the fallback and use the existing seeded RNG.

### Database Migration Is Behind The Current Spec

The migration creates `saves` and `leaderboard`, but lacks the current spec's RLS policies and uses `session_id` rather than the latest save-id/slot flow.

Evidence:

- Migration: `supabase/migrations/001_initial.sql:1`
- Current spec RLS/save-id flow: `.trellis/spec/backend/database-guidelines.md:37`

Impact:

The DB layer reflects an older task PRD more than the latest database guideline.

Suggested direction:

Add a migration aligning saves/leaderboard with current spec, including RLS policies.

## Design And Prototype Alignment

The visual direction is well-preserved:

- Local showcase and prototype assets are present.
- Art Bible files are identical between showcase and prototype.
- Public assets include the expected 34 direct PNG files.
- Screens broadly use the same assets and palette.

Remaining issues:

- The art-assets PRD still has "7 game page prototypes with clickable navigation" unchecked.
- No `public/assets/art-bible/style-guide.md` was found.
- The prototype files under `local/claude-design-prototype` are not lint-clean standalone modules and should be excluded from app linting.
- Responsive and visual verification at 375px was not performed during review.

## Task-By-Task Review

### 00 Bootstrap Guidelines

Status: mostly complete.

Spec files exist and are useful. Some wording still describes greenfield targets rather than current reality, so future sessions may need to distinguish ideal architecture from implemented behavior.

### Art Assets And UI Prototypes

Status: mostly complete but not fully accepted.

Assets, showcase, and prototype exist. The PRD still leaves the 7 clickable game-page prototypes unchecked. No dedicated public art-bible style-guide Markdown file was found.

### Fix Spec Issues

Status: spec complete; implementation drift remains.

Score clamp, risk, session/save, era transition, and responsive notes are documented. The implementation still uses the older sessionStorage/cookie save approach.

### LLM Multi-Provider

Status: structure present; live validation not re-proven.

AI provider/client/contracts are present. This review did not run `pnpm test:llm` or live API probes.

### T1 Schema, Constants, Design System, Assets

Status: mostly complete.

Schema, constants, Tailwind v4 theme tokens, fonts, and assets are present. Roadmap mentions `tailwind.config.ts`, but the actual Tailwind v4 `@theme inline` approach is acceptable.

### T2 Game Engine Core

Status: strongest task.

Engine modules and tests are in place. Tests pass. Main risk is not inside the engine itself, but that server actions bypass reducer functions in exam/palace flows.

### T3 UI Component Library, Landing, Create

Status: visible and usable; lint not clean.

UI primitives and game components exist. Landing/create are implemented. Zustand exists as a skeleton but is not the central overlay/transient state mechanism described by spec.

### T4 Server Actions, Database, Daily Loop

Status: playable but persistence architecture is not aligned.

Daily loop works through client-held state. DB query functions and migrations exist. The server-authoritative save/reconnect flow is not implemented according to the latest spec.

### T5 Exam Flow And Auxiliary Tools

Status: mostly implemented with gaps.

Exam questions, free-text judging, result overlay, and two tools are present. Mentor's Plea exists in server action but has no UI entry. `useToolAction` naming breaks lint. Exam resolution bypasses reducer schedule reset.

### T6 Random Event System And NPC

Status: implemented but with relationship bug.

Events, free input, NPC dialogue, memory cap, and basic court-whims reveal exist. Socialize-created friends are recorded as mentor relationships.

### T7 Inheritance And Generational Transition

Status: visually present but semantically incomplete.

Inheritance page, I1 contract, era transition, and chooseHeir exist. Selected heir data is not used to create the next character. Marriage/birth is not wired into gameplay. Palace-to-inheritance route is broken.

### T8 Palace Exam And Ranking

Status: mostly present with continuation and summary issues.

Palace ranking, R1 narration, victory tiers, and leaderboard routing exist. Rival summaries are dropped. Procedural fallback is non-deterministic. "传之后世" does not prepare inheritance data.

### T9 Leaderboard And Save System Polish

Status: leaderboard exists; save system not current-spec compliant.

Leaderboard UI and score recording are present. "继续旧梦" checks `sessionStorage`, not the DB/localStorage save-id system. Game over cleanup is also tied to sessionStorage.

### T10 Animation, Responsive, Edge Cases

Status: partially implemented.

Some animations, reduced-motion hooks, responsive CSS, shimmer, error/loading components exist. Not all motion paths use reduced-motion consistently. 375px/browser verification and accessibility pass were not completed in this review.

## Recommended Repair Order

1. Make lint actionable:
   - Ignore `local/**` prototype files.
   - Rename `useToolAction`.
   - Fix production React lint errors.
2. Align persistence:
   - Save id in localStorage.
   - DB authoritative load/update.
   - URL `?save=` override.
   - Remove cookie-based save identity.
3. Reuse reducer functions:
   - `submitExamAnswer()` delegates mutation to `resolveExam()`.
   - `submitPalaceExam()` delegates deterministic state mutation to `resolvePalaceExam()`.
4. Fix exam availability:
   - Central helper for target level, requirements, ban status, countdown, and lock reason.
5. Fix inheritance semantics:
   - Preserve generated heir candidates.
   - Use selected heir data in new character creation.
   - Connect Palace "传之后世" to real inheritance setup.
6. Wire lineage:
   - Add marriage action.
   - Add yearly birth/survival rolls.
7. Finish palace/leaderboard polish:
   - Preserve rival answer summaries.
   - Deterministic E3 fallback.
   - Ensure final score/save cleanup follows the new persistence model.
8. Perform visual QA:
   - Browser-check key screens at desktop and 375px.
   - Check reduced-motion and keyboard/focus behavior.

## Useful File References

- Roadmap: `.trellis/roadmap.md`
- Database spec: `.trellis/spec/backend/database-guidelines.md`
- Backend structure spec: `.trellis/spec/backend/directory-structure.md`
- Frontend state spec: `.trellis/spec/frontend/state-management.md`
- Core loop spec: `.trellis/spec/game-design/core-loop.md`
- Balance spec: `.trellis/spec/game-design/balance.md`
- Screen map: `.trellis/spec/frontend/screen-map.md`
- Main server actions: `lib/actions/game.ts`
- Engine reducer: `lib/engine/reducer.ts`
- DB client/queries: `lib/db/client.ts`, `lib/db/queries.ts`
- Daily page: `app/(game)/play/page.tsx`
- Exam page: `app/(game)/play/exam/page.tsx`
- Inheritance page: `app/(game)/inherit/page.tsx`
- Palace page: `app/(game)/palace/page.tsx`
- Leaderboard page: `app/(game)/leaderboard/page.tsx`
