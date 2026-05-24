# 完整流程 QA 修复

## Background

Production full-flow QA on 2026-05-24 reached a successful palace clear, but exposed several issues that hurt reliability and presentation quality:

- Runtime error during normal play: `nextInt: min (-3) must be <= max (-5)` from season action handling.
- Event choices can be clicked repeatedly while a server action is pending.
- `/play` next-exam display can show `会试` even when the character has `贡士` and the real next step is `殿试`.
- The game UI still contains many visible English labels and stat abbreviations (`eru`, `for`, `dri`, `wea`, `TITLE`, `NEXT EXAM`, etc.).
- Production AI calls are happening and generally returning appropriate Chinese content, but chrome labels should match the Chinese game presentation.

## Goals

1. Fix the runtime action-range bug so negative random ranges cannot crash play.
2. Add regression coverage for reversed/negative action effect ranges.
3. Make event-choice submission pending-safe so users cannot submit the same event choice multiple times.
4. Fix next-exam display for the palace exam path.
5. Localize or remove visible English UI labels across play, exam, result, palace, and leaderboard screens.
6. Keep server-authoritative game state intact; do not move game rules into the client.
7. Re-run local quality gates and perform at least a smoke check of the updated UI.

## Non-Goals

- No balance redesign beyond making the existing constants safe.
- No new AI provider/model changes.
- No broad visual redesign beyond text/localization and small UI-state fixes.
- No persistence architecture rewrite unless required to fix the reported flow issues.

## Acceptance Criteria

- `npm run typecheck`, `npm test`, and `npm run lint` pass or any pre-existing blocker is documented.
- Season actions no longer throw for negative/reversed ranges.
- Event choice buttons disable or show pending state immediately after click.
- A `贡士` character sees `殿试` as the next exam on `/play`.
- Player-facing chrome labels are Chinese or removed where redundant; stat previews use Chinese stat names.
- A browser smoke test confirms key screens render without obvious overlap on desktop and mobile widths.
