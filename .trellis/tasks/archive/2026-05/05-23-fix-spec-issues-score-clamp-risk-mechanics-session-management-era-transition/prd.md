# Fix Spec Issues: Score Clamp, Risk Mechanics, Session Management, Era Transition

## Goal

Resolve numerical contradictions, undefined behaviors, and architectural gaps in the spec before implementation begins. These are spec-level fixes (editing `.trellis/spec/` documents), not code changes.

## What I already know

* Fixed-choice score formula can exceed 100 (base 70 + erudition*0.3=30 + court_whims=20 = 120). Needs clamp.
* Cheat Sheet doubles erudition for scoring, making overflow worse (erudition 80 → 160 → bonus 48).
* `risk` field in E1 output has no mechanical effect defined in balance.md — purely narrative or should trigger penalty?
* Save reconnection undefined: anonymous play, no auth, but no spec on how player finds their save again.
* Era transition trigger is vague ("every 2-3 generations or triggered by events") — needs deterministic formula per "dead code controls numbers" principle.
* Mobile: not priority but demo will be on local machine (laptop), so responsive design needed but mobile-first not required.

## Requirements

### R1: Score Clamp (P0)

* Add `clamp(0, 100)` to the final score in both fixed-choice and free-text formulas in balance.md
* Document that Cheat Sheet's erudition doubling applies BEFORE the 0.3 multiplier, and the final score is still clamped to 100
* This means Cheat Sheet's real benefit is raising the erudition_bonus ceiling from 30 to 60, but total score still caps at 100

### R2: Risk Mechanics (P0)

* Define what `risk` on E1 choices actually does mechanically
* **Conditional (deterministic) model**: risk triggers a penalty only when a specific state condition is met
* Risk conditions map to court_whims alignment:
  - `risk: "may offend emperor"` → triggers if `court_whims.emperor_temperament` does NOT match choice alignment
  - `risk: "high exposure if court_whims mismatch"` → triggers if NEITHER style nor temperament matches
  - `risk: null` → no risk, no penalty possible
* Penalty when risk triggers: Drive -10, Fortune -5
* Penalty when risk does NOT trigger (condition not met): nothing — the high base_score is earned safely
* This rewards intelligence-gathering: players who reveal court_whims can take risky choices with confidence
* Engine evaluates risk deterministically after scoring, in `resolveExam()`
* E1 output schema: `risk` field becomes `risk: null | { condition: string, penalty: { drive: number, fortune: number } }`
  - AI still generates the narrative string; engine maps it to a condition check
  - Alternative: E1 returns structured risk conditions directly (preferred — avoids NLP parsing)

### R3: Session Management (P1)

* Save ID stored in localStorage under a known key
* On first visit: generate new save, store ID in localStorage
* On return visit: read localStorage, load existing save
* URL param `?save=<id>` as override/sharing mechanism
* No auth, no login, no cookies beyond localStorage
* Multiple save slots not needed for v1

### R4: Era Transition Rules (P1)

* Deterministic formula owned by the engine, evaluated during inheritance phase
* Uses seeded RNG (reproducible)
* Rule:
  - Track `last_era_change_generation` in dynasty state (add to data-model)
  - At inheritance, check: `generations_since_change = current_gen - last_era_change_gen`
  - If < 2: no transition
  - If >= 3: forced transition
  - If == 2: transition if `rng.next() < 0.5`
* Era sequence (constrained, not purely random):
  - prosperity → decline (60%) | invasion (40%)
  - decline → invasion (60%) | restoration (40%)
  - invasion → restoration (100%)
  - restoration → prosperity (100%)
* First era is always `prosperity` (fresh dynasty)
* This produces transitions every 2-3 generations and a narratively coherent cycle (good times → trouble → recovery → good times)

### R5: Mobile Responsiveness (P2)

* Add a note to frontend spec: responsive design required, breakpoints for tablet/desktop
* Demo target is laptop browser, but QR code means some phone access is possible
* Not mobile-first; graceful degradation is sufficient

## Acceptance Criteria

* [ ] balance.md: fixed-choice and free-text score formulas include explicit `clamp(0, 100)`
* [ ] balance.md: Cheat Sheet interaction with clamp is documented
* [ ] balance.md: `risk` field has a defined mechanical effect with formula
* [ ] balance.md or core-loop.md: era transition has a deterministic trigger rule
* [ ] New section in backend/database-guidelines.md or a new doc: session/save reconnection flow
* [ ] frontend/index.md or component-guidelines.md: responsive design note added

## Definition of Done

* All spec documents internally consistent after changes
* Cross-references between docs remain valid
* No new undefined behaviors introduced

## Open Questions

(none — all resolved)

## Decision (ADR-lite)

**Context**: E1 choices have a `risk` field but no mechanical effect defined.

**Decision**: Conditional (deterministic) risk model. Risk triggers a penalty only when a specific state condition is met (e.g., court_whims mismatch). This rewards players who invest in intelligence-gathering (buying examiner's works, socializing with officials) — they can take high-risk/high-reward choices safely.

**Consequences**: 
- High-base_score choices are genuinely risky for uninformed players
- Players who reveal court_whims can exploit risky choices with no downside — this is intentional (information = power)
- The engine evaluates risk conditions deterministically after the exam, not the AI

## Out of Scope

* Code implementation (this task is spec-only)
* Auth/login system
* Mobile-first redesign
* Streaming narration spec (separate task)
* Leaderboard data flow spec (separate task)

## Technical Notes

* Files to modify: `game-design/balance.md`, `game-design/core-loop.md`, `backend/database-guidelines.md`, `frontend/index.md`
* Possibly new file: `backend/session-guidelines.md` or section in database-guidelines
* The "error-handling.md uses 'haiku' tier name" and "V1 temperature inconsistency" are minor — fix opportunistically
