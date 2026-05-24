# Fix Failed Save Creation

## Goal

New game creation and follow-up save mutations must not crash with a generic runtime error. Save creation should persist a valid Supabase save and return its ID when Supabase is healthy; local development may use a clearly logged volatile fallback when Supabase is stopped; production must fail honestly with a friendly UI message and actionable server diagnostics.

## What I Already Know

- The runtime error is thrown from `lib/db/queries.ts:createSave()` after a Supabase insert returns `error` or no selected `id`.
- `newGame()` in `lib/actions/game.ts` creates the initial `GameState`, then calls `createSave()`.
- Supabase JS v2 requires explicit `.select()` after insert/update/upsert to return rows; the current code already uses `.select("id").single()`.
- Current persistence spec expects `saves(id uuid default gen_random_uuid(), slot, state, turn_number, updated_at)` with anon RLS allowing all save operations.
- The repo contains an earlier migration shape where `saves.session_id` was required, so a database missing `003_persistence_realign.sql` would reject the current insert.
- Local `.env.local` points at `http://localhost:54321`, and no service is listening there, so the local Supabase failure is `fetch failed / ECONNREFUSED`.
- Vercel Production has Supabase variable names configured, but public deployment access is protected by Vercel SSO/Deployment Protection (`401`), so anonymous browser verification cannot reach the app from this session.
- `"use server"` files must not re-export types; Turbopack can materialize the type export as a runtime export and crash module evaluation.
- Several core screens used fixed desktop grids that overflowed or cramped on narrow/mobile viewports.

## Assumptions

- The immediate failure is an expected infrastructure/schema/RLS problem, not an engine invariant problem.
- The fix should preserve the Supabase-backed UUID save flow required by the backend spec.
- UI write paths should catch persistence failures and show retryable, user-friendly messages instead of surfacing Next.js runtime errors.

## Requirements

- Keep `GameState` validation before persistence.
- Preserve new save creation as a Supabase insert returning the generated UUID.
- Include the Supabase error code/message/details/hint in server logs when create/update/read/leaderboard persistence fails.
- Throw sanitized application errors to the client; do not expose raw Supabase messages through Server Action return values.
- Do not use volatile in-memory saves in production unless explicitly enabled by `SUPABASE_MEMORY_FALLBACK=true`.
- Avoid type re-exports from `"use server"` modules.
- Make `/create`, `/play`, `/play/exam`, `/inherit`, and `/leaderboard` usable without horizontal page overflow on mobile widths.
- Cover the create-save failure behavior with focused tests where practical.

## Acceptance Criteria

- [x] `createSave()` logs actionable Supabase diagnostics before fallback/throw.
- [x] `newGame()` still returns `{ id, state }` on successful persistence.
- [x] Tests cover a successful `newGame()`, local fallback, and production persistence failure.
- [x] Key mobile routes have no document-level horizontal overflow in browser checks.
- [x] Lint and typecheck pass.

## Out of Scope

- Replacing Supabase persistence with local-only saves.
- Reworking the full game UI visual design beyond responsive sizing/layout fixes.
- Applying remote Supabase migrations from this task.

## Technical Notes

- Relevant files inspected: `lib/db/queries.ts`, `lib/db/client.ts`, `lib/actions/game.ts`, `supabase/migrations/001_initial.sql`, `supabase/migrations/002_add_rls.sql`, `supabase/migrations/003_persistence_realign.sql`, `.trellis/spec/backend/database-guidelines.md`, `.trellis/spec/backend/error-handling.md`.
- Context7 Supabase docs confirmed that Supabase JS v2 write operations return no rows unless `.select()` is chained, and RLS errors surface as Postgres/Supabase errors such as `42501`.
- Context7 Vercel docs confirmed Deployment Protection can guard deployments and `vercel curl` can bypass protection when a bypass secret is available.
