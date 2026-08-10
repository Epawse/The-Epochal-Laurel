# Restore saves after domain migration

## Goal

Allow an existing anonymous game save to cross from the former `epawse.xyz` host to `laurel.epawse.xyz` by accepting a save ID in the new-host URL, loading the authoritative state from Supabase, restoring the new host's browser session, and continuing the game.

## What I already know

- `newGame` persists the complete state through `createSave`, while the browser stores the returned ID under `epochal-laurel-save-id`.
- The current `/play` page reads the ID but never calls the existing `loadGame` server action when `sessionStorage.game_state` is absent.
- Browser storage is origin-scoped, so changing hostnames drops the old `sessionStorage` view even though the Supabase row remains intact.
- `getSaveId()` already accepts `?save=<id>` and copies that ID into the new host's local storage.
- The user has already approved the fastest maintainable production migration and asked to continue without reopening the hosting decision.

## Requirements

- On the landing page, when there is no current session state and a save ID exists, call the existing `loadGame` action and restore `game_state` into session storage.
- When the save ID arrived through `?save=`, continue directly to `/play` after a successful restore.
- Keep the normal new-game and same-host continue behavior unchanged.
- Treat a missing or temporarily unavailable save as a recoverable UI state; do not delete the stored ID or expose it in logs/UI.
- Reuse the existing database action and storage helpers; do not add a second persistence system or a new API route.

## Acceptance Criteria

- [ ] `/?save=<valid-id>` on `laurel.epawse.xyz` loads the corresponding Supabase state, writes the new-host session state, and reaches `/play`.
- [ ] A returning visitor on the new host can continue from the saved session without the query parameter.
- [ ] No ID or missing row leaves the landing page usable for a new game.
- [ ] Loading and failure states are explicit and do not create duplicate saves.
- [ ] Lint, typecheck, unit tests, and production build pass.
- [ ] The deployed new domain is read back after release.

## Definition of Done

- Tests added or updated for the existing load action and migration-relevant behavior where practical.
- Lint, typecheck, tests, and build are green.
- Production deployment is verified on `laurel.epawse.xyz` before the portfolio root-domain cutover.
- Rollback is the previous Vercel deployment; no database migration is required.

## Technical Approach

Extend the client landing page with a single idempotent hydration effect. It reads the existing save ID helper, calls the existing server action only when session state is absent, writes the validated returned `GameState` through `setSessionJSON`, and routes query-based handoffs to `/play`. This keeps Supabase authoritative and preserves a small seam for future authenticated save selection.

## Decision (ADR-lite)

**Context**: A DNS-only move cannot transfer `sessionStorage` or `localStorage` between hosts, while the server-side save row already contains the state needed for recovery.

**Decision**: Transfer only the opaque save ID in the URL and hydrate from Supabase on the destination landing page.

**Consequences**: The migration URL is short and the database stays authoritative. Anyone who obtains a save ID can already access that anonymous save under the current RLS model; authentication and ownership controls are a separate future concern.

## Out of Scope

- User accounts, save-slot selection, or authentication changes.
- Supabase schema/RLS changes.
- Copying complete game state through the URL or cross-origin messaging.
- Redesigning the landing page beyond the minimal restore status.

## Technical Notes

- Primary files: `app/(game)/page.tsx`, `lib/actions/game.ts`, `lib/client/saveId.ts`, and `hooks/useSessionJSON.ts`.
- Relevant specs: `.trellis/spec/frontend/state-management.md`, `.trellis/spec/frontend/hook-guidelines.md`, `.trellis/spec/frontend/quality-guidelines.md`, `.trellis/spec/backend/database-guidelines.md`, and `.trellis/spec/backend/error-handling.md`.
