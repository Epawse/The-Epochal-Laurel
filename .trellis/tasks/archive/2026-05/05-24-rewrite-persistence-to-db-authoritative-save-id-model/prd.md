# Rewrite persistence to DB-authoritative save-id model

## Goal

Bring persistence into compliance with `backend/database-guidelines.md` and `frontend/state-management.md`: the durable source of truth is a Supabase `saves` row addressed by a UUID `id` stored in `localStorage["epochal-laurel-save-id"]`, with a `?save=<id>` override for QR/share links and no cookies / no server session. This unblocks cross-device reconnection (the QR-code demo premise) and removes the client-authoritative-state divergence risk flagged P0 in the 2026-05-24 completeness analysis.

## What I already know

Current implementation (verified live this session):

- **Cookie identity (spec-violating).** `lib/db/client.ts:38` `getSessionId()` sets httpOnly cookie `game_session_id`. Spec §"Session & Save Reconnection" mandates: no cookies, no server session; reconnect via `localStorage["epochal-laurel-save-id"]` + `?save=<id>`.
- **`saves` keyed by `session_id`, not `id`.** `001_initial.sql`: `saves(id uuid pk, session_id text unique, state jsonb, updated_at)`. Spec target: `saves(id uuid pk, slot text, state jsonb, turn_number int, updated_at)` (no `session_id`; `slot="default"` for v1).
- **`loadSave` is dead on cold start.** `lib/db/queries.ts:17` `loadSave(sessionId)` queries by `session_id`; it is imported but unused in `actions/game.ts` (lint warning). Every page hydrates from `sessionStorage["game_state"]` instead → saves don't survive device/browser change → `?save=` share is impossible.
- **Client is authoritative.** `advanceTurn(currentState, actionId)` (`game.ts:99`) and siblings receive the client's `GameState` and compute on it; `newGame(familyName, origin)` (`game.ts:63`) persists by cookie `session_id` and never returns a save id. `state-management.md` mandates server-held state, replaced wholesale per action.
- **Seam already prepared.** `state-management.md:15-19` (added by the lint-gate task) declares `sessionStorage` a *temporary inter-route handoff cache* read via `useSessionJSON<T>(key)`, and says DB/save-id persistence "should change that hook boundary or the route handoff layer, not every page component." `useSessionJSON` exists and is used at 6 load sites.
- **Leaderboard schema also drifts.** `001_initial.sql` `leaderboard` has `session_id` + `highest_title` + `created_at`; spec wants `leaderboard(id, family_name, tier, score, generations, achieved_at)` (no `session_id`/`highest_title`; `achieved_at`).
- **RLS is in place.** `002_add_rls.sql` enables RLS + anon policies on both tables.

Action surface (`lib/actions/game.ts`): `newGame`, `advanceTurn`, `submitEventChoice`, `submitEventFreeInput`, `getExamQuestion`, `submitExamAnswer`, `applyToolAction`, `generateHeirsAction`, `chooseHeir`, `submitPalaceExam`. Leaderboard (`lib/actions/leaderboard.ts`): `getLeaderboard`, `recordScore`, `getPlayerSessionId`.

## Assumptions (temporary)

- Hackathon demo data is disposable → a clean replacing migration (drop `session_id`, add `slot`/`turn_number`) is acceptable; no data backfill needed.
- The Supabase SSR `createClient()` cookie adapter (for auth-token refresh, unused here) is orthogonal to game identity and can stay; only the game-identity cookie (`game_session_id`) must go.
- `slot` is always `"default"` in v1 (multi-slot reserved).

## Decisions

- **D1 — server-authority level: FULL (Level B).** Game actions take `(saveId, input)`; the server loads `GameState` from DB by id, runs the engine, persists, and returns the new state. The client never passes `GameState` into an action — it only holds the returned snapshot for rendering/handoff. Satisfies `state-management.md` server-authority; protects leaderboard integrity for the public QR demo. Cost: all 10 game-action signatures + their call sites are rewritten; all 8 flows re-tested.
- **D4 — sessionStorage role: keep as transient inter-route handoff** (derived from `state-management.md:15-19`, not asked). DB is the durable truth; `useSessionJSON` remains the read seam for route-to-route payload handoff; cold start hydrates from DB by id. We change the hook/handoff boundary, not every page component. (Implication of D1: the handoff payload is the server-returned state, never client-mutated.)
- **D2/D3 — migration scope: `saves` full realign + `leaderboard` minimal.** Clean replacing migration `003_*` (demo data disposable). `saves` → spec `(id, slot, state, turn_number, updated_at)`. `leaderboard` → drop only `session_id` (forced by removing session identity); **keep `highest_title` + `created_at`** so the existing leaderboard UI is untouched. Full `leaderboard` spec-alignment (remove `highest_title`, `created_at`→`achieved_at`) is deferred to the leaderboard-polish task.

## Open Questions

- (none — all resolved; see Decisions)

## Requirements (evolving)

- Save identity is a UUID `saves.id`, stored client-side in `localStorage["epochal-laurel-save-id"]`; no `game_session_id` cookie.
- `newGame()` inserts a `saves` row and returns its `id`; client writes the id to localStorage.
- Return visit hydrates `GameState` from DB by id (via `loadSave(id)`), not from sessionStorage.
- `?save=<id>` overrides localStorage and updates it to the shared id.
- Missing/expired save id → treat as first visit (new game), no crash. Malformed stored blob → same fallback (never a permanent loading/crash state).
- `saves` schema matches spec `(id, slot, state, turn_number, updated_at)`; writes go through `GameState.parse` at the boundary.
- **Server-authoritative (D1):** every mutating game action takes `(saveId, …input)`, loads `GameState` from DB by id, runs the engine, persists the result, and returns the new state. No action accepts a client-supplied `GameState`. A forged/tampered client cannot inject arbitrary state.
- `leaderboard` writes no longer reference `session_id`; `recordScore`/`recordVictory` lose the session param. `getPlayerSessionId` is removed (cookie identity gone).
- Quality gates stay green (lint/typecheck/test/build).

## Acceptance Criteria (evolving)

- [ ] No `game_session_id` cookie is ever set; `getSessionId()` removed/replaced.
- [ ] First visit creates a DB save row and persists its id to `localStorage["epochal-laurel-save-id"]`.
- [ ] Reload in a fresh browser/device with the same id (or `?save=<id>`) restores the same dynasty from DB.
- [ ] `loadSave` is actually used on cold start; no page treats sessionStorage as durable truth.
- [ ] `saves` table matches the spec schema; saved blobs validate via `GameState.parse`.
- [ ] No game action accepts a client `GameState` param; signatures take `saveId` and mutations are computed from DB-loaded state.
- [ ] Tests cover save create → reload → continue, `?save=` override, missing-id fallback, and malformed-blob fallback.

## Definition of Done

- All four gates green (lint/typecheck/test/build).
- `database-guidelines.md` §Session & Save Reconnection satisfied; spec updated if the contract is refined during work.
- Task committed on a task branch, fast-forward merged to `main`, archived.

## Out of Scope (explicit)

- Lineage wiring, selected-heir semantics, reducer reuse, exam gating helper (later repair-order tasks).
- Palace rival summary, deterministic E3 fallback (later polish task).
- **Full `leaderboard` schema realignment** (remove `highest_title`, `created_at`→`achieved_at`) — deferred to leaderboard-polish task; this task only drops `leaderboard.session_id`.
- Zustand adoption beyond what authority changes require.
- Visual/responsive QA.

## Technical Approach

- **DB layer.** Migration `003_persistence_realign.sql`: recreate `saves` as `(id uuid pk default gen_random_uuid(), slot text not null default 'default', state jsonb not null, turn_number int not null, updated_at timestamptz default now())`; drop `leaderboard.session_id`. Re-apply RLS if recreate drops it. Rewrite `lib/db/queries.ts`: `loadSave(id)` by PK (`GameState.parse`), `createSave(state): Promise<string>` (insert, return `id`), `upsertSave(id, state)` (writes `slot="default"` + `turn_number`); `recordVictory` drops `session_id`. Delete `getSessionId` from `lib/db/client.ts`.
- **Actions (server-authoritative).** `newGame(familyName, origin): Promise<{ id, state }>`. Every other game action: `(saveId, …input)` → `loadSave(saveId)` (missing/invalid → typed error the client maps to new-game) → run engine → `upsertSave` → return result. Drop all client `GameState` params + call-site state passing. `leaderboard.ts`: drop `getPlayerSessionId`, drop session param from `recordScore`.
- **Client save-id + hydration.** Small `lib/client/saveId.ts` (read/write `localStorage["epochal-laurel-save-id"]`, apply `?save=` override). Cold-start: resolve id (url > localStorage) → call a load action → seed the `useSessionJSON` handoff → render; no id or load-null → route to create/new game. Create flow stores returned `id`. All action call sites pass `saveId`.
- **Edge/fallback.** Missing/expired/malformed → new game, never a stuck loading or crash.

## Implementation Plan (phased)

- **Phase 1 — DB foundation:** migration `003_*`, rewrite `queries.ts`, remove `getSessionId`; query-level tests (create→load→upsert→reload). No app behavior change yet.
- **Phase 2 — server-authoritative actions:** rewrite all 10 game actions + `leaderboard.ts` to `(saveId, …input)` loading from DB; update action unit tests for new signatures.
- **Phase 3 — client save-id + hydration:** `saveId.ts`, `?save=` override, cold-start hydration via the handoff seam, update create + all call sites; integration tests for reload/`?save=`/missing-id/malformed-blob fallback. Full gate run.

## Technical Notes

- Spec: `backend/database-guidelines.md` (target schema + reconnection flow), `frontend/state-management.md:13-19` (server authority + handoff seam).
- Current code: `lib/db/client.ts`, `lib/db/queries.ts`, `lib/actions/game.ts`, `lib/actions/leaderboard.ts`, `supabase/migrations/001_initial.sql`+`002_add_rls.sql`, `useSessionJSON` hook + 6 load-site pages.
- Source analysis: `.trellis/workspace/haoran/2026-05-24-roadmap-completeness-analysis.md` §3.2.
