# Fix palace inheritance handoff

## Goal

Fix the P0 broken route where the palace victory screen's "传之后世" button navigates to `/inherit` without creating the required `inheritance_data` session handoff. The player should be able to continue a victorious dynasty into the existing inheritance selection flow.

## What I already know

- `.trellis/workspace/haoran/2026-05-24-roadmap-completeness-analysis.md` identifies this as P0: `palace/page.tsx` removes `palace_result` then routes to `/inherit`; `/inherit` redirects back to `/play` when `inheritance_data` is missing.
- The daily-loop death path already calls `generateHeirsAction(result.state, deathReason)`, writes `inheritance_data`, and routes to `/inherit`.
- `generateHeirsAction` currently only accepts `deathReason: "drive_zero" | "max_age"`, while palace continuation is voluntary post-victory continuation.
- `InheritanceData.deathReason` and the inherited page copy currently only render `"drive_zero"` vs natural death.

## Assumptions (temporary)

- For this narrow fix, palace continuation should reuse the existing inheritance flow and may represent the transition reason as a new `"victory"`/retirement-style reason.
- If no heir/adoption is available, the button should route to leaderboard with an F/game-over dynasty summary rather than leave the player stuck on `/inherit`.
- Full DB-authoritative persistence is out of scope; use the existing session handoff seam.

## Open Questions

- None blocking; the desired route behavior is explicit in the screen map and review findings.

## Requirements (evolving)

- Add a non-death inheritance trigger for palace continuation without weakening existing death triggers.
- Update `palace/page.tsx` "传之后世" to generate heirs, populate `inheritance_data`, and navigate to `/inherit`.
- Handle no-heir/game-over from palace continuation gracefully.
- Preserve "衣锦还乡" leaderboard behavior.
- Add focused tests for the new inheritance trigger and/or palace handoff behavior.

## Acceptance Criteria (evolving)

- [x] Clicking "传之后世" from palace result writes a valid `inheritance_data` payload before navigating to `/inherit`.
- [x] `/inherit` renders palace continuation as a valid transition reason rather than redirecting.
- [x] No-heir/no-adoption palace continuation reaches leaderboard/game-over instead of a broken inherit page.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` pass.

## Definition of Done

- Quality gates green.
- Spec updated if the inheritance trigger contract changes.
- Task committed on a task branch, fast-forward merged into `main`, archived.

## Out of Scope (explicit)

- Full persistence rewrite (`localStorage` save-id, `?save=`, DB-authoritative page loads).
- Real lineage wiring (`marry`, birth/survival rolls) and selected-heir semantic fixes.
- Palace rival summaries, deterministic E3 fallback, exam gating helper.

## Technical Notes

- Relevant files: `app/(game)/palace/page.tsx`, `app/(game)/inherit/page.tsx`, `lib/actions/game.ts`.
- Relevant specs: `frontend/screen-map.md`, `frontend/hook-guidelines.md`, `frontend/state-management.md`, `game-design/core-loop.md`, `game-design/data-model.md`, `backend/index.md`.
