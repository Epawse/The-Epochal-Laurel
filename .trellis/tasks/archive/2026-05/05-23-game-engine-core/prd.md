# Game Engine Core

## Goal

Implement the deterministic game engine layer (`lib/engine/`) — pure functions that compute all game state transitions. Zero IO, zero LLM calls, zero `Date.now()`/`Math.random()`. All randomness flows through a seeded PRNG for reproducible runs. This is the "dead code" layer that balance.md formulas live in.

## Requirements

### 1. Seeded PRNG (`lib/engine/rng.ts`)

A simple seeded pseudo-random number generator:

- `createRng(seed: number)` → returns an RNG instance
- `rng.next()` → returns float [0, 1)
- `rng.nextInt(min, max)` → returns integer in [min, max]
- `rng.nextFloat(min, max)` → returns float in [min, max)
- Must be deterministic: same seed always produces same sequence
- Algorithm: xoshiro128** or similar (fast, good distribution, small state)
- Export the RNG state so it can be serialized into `GameState.rng_seed`

### 2. Balance Formulas (`lib/engine/balance.ts`)

All numerical formulas from `game-design/balance.md`:

- `applyActionEffects(action, stats, rng)` → StatChanges (with ranges resolved via rng)
- `diminishingReturns(baseGain, currentValue, maxValue)` → effective gain
- `driveLossPerYear(age)` → drive decay amount
- `eventChancePerSeason(fortune)` → probability [0, 1]
- `eventTypeDistribution(fortune)` → weights for opportunity/misfortune/social/political
- `schemeExposureChance(fortune)` → probability [0.05, 0.15]
- `schemeExposurePenalty()` → StatChanges + exam ban chance
- `clampStats(stats)` → stats clamped to STAT_BOUNDARIES

### 3. Exam System (`lib/engine/exam.ts`)

- `examThreshold(level, era, generation, fortune)` → pass threshold number
- `scoreFixedChoice(choiceBaseValue, erudition, courtWhimsAlignment)` → clamped score [0, 100]
- `scoreFreeText(judgeLmScore, erudition)` → clamped score [0, 100]
- `evaluateRiskCondition(risk, courtWhims, choiceAlignment)` → boolean (triggers penalty?)
- `cheatSheetBonus(erudition)` → modified erudition_bonus (erudition * 0.6 instead of * 0.3)
- `mentorPleaThreshold(originalThreshold)` → threshold - 15
- `palaceRanking(playerScore, rivalScores)` → sorted ranking with title assignments (状元/榜眼/探花/进士)
- `courtWhimsAlignment(choice, courtWhims)` → "none" | "partial" | "full" with bonus value (0/10/20)

### 4. Lineage System (`lib/engine/lineage.ts`)

- `rollMaxAge(rng, traitModifier, originModifier, blessingModifier)` → clamped [40, 80]
- `canMarry(fortune, wealth)` → boolean (fortune ≥ 15, wealth ≥ 10)
- `rollFertileUntil(marriedYear, rng)` → married_year + random(14..20)
- `rollSonBirth(rng)` → boolean (0.30 chance)
- `rollChildSurvival(era, rng)` → boolean (era-dependent rate)
- `countHeirs(children)` → clamped [0, 3] surviving sons
- `canAdopt(reputation)` → boolean (reputation ≥ 20)

### 5. Inheritance System (`lib/engine/inheritance.ts`)

- `calculateLegacyTokens(character)` → { books, land, reputation }
- `calculateBlessingPoints(legacyTokens, achievements)` → number
- `heirStartingStats(legacyTokens, blessingBonuses)` → Stats
- `applyGenerationDecay(legacyTokens)` → decayed tokens (books * 0.7, land * 0.9, reputation * 0.4)
- `shouldTransitionEra(generationsSinceChange, rng)` → boolean
- `rollNextEra(currentEra, rng)` → Era (using ERA_TRANSITIONS weights)
- `calculateOriginOptions(previousGenEndState)` → Origin[] (2-3 options based on ending state)

### 6. Reducer (`lib/engine/reducer.ts`)

The single entry point that Server Actions call. Each function takes `(state: GameState, ...args)` and returns a new `GameState`:

- `advanceSeason(state, actionId, rng)` → new state after:
  - Apply action effects (with diminishing returns)
  - Apply drive decay
  - Decrement status_effects turns_remaining
  - Roll for random event trigger
  - Advance season/year
  - Check exam schedule countdown
  - Check drive=0 / max_age death conditions
- `applyEventChoice(state, choiceId)` → new state with choice stat_changes applied
- `resolveExam(state, examLevel, score, passed, riskPenalty?)` → new state with:
  - Title awarded if passed
  - Exam history entry added
  - Stats updated (risk penalty if applicable)
  - Exam schedule updated
- `resolvePalaceExam(state, playerScore, rivalScores)` → new state with ranking + title
- `resolveInheritance(state, heirIndex, purchasedBlessings, rng)` → new state for next generation:
  - Calculate legacy tokens
  - Apply generation decay
  - Create new character from heir
  - Apply blessings
  - Check era transition
  - Reset auxiliary tools

Also includes:
- `createCharacter(familyName, origin, rng)` → initial GameState (generation 1)
- `initExamSchedule(rng)` → ExamSchedule with randomized countdown
- `resetAuxiliaryTools(year)` → fresh AuxiliaryTools state

## Acceptance Criteria

- [ ] All engine functions are pure (no IO, no side effects, no Math.random)
- [ ] `tsc --noEmit` passes
- [ ] Vitest unit tests cover all balance.md formulas
- [ ] RNG produces deterministic sequences (same seed → same output)
- [ ] Origin modifiers applied correctly in createCharacter
- [ ] Exam scoring matches balance.md formulas exactly
- [ ] Drive decay formula matches spec: `max(1, (age - 20) / 10)`
- [ ] Diminishing returns formula: `base_gain * (1 - current_value / (max_value * 1.5))`
- [ ] Era transitions follow constrained Markov chain from balance.md
- [ ] Palace exam has no threshold — ranking only
- [ ] `next build` succeeds

## Definition of Done

- `tsc --noEmit` passes
- `next build` succeeds
- All Vitest tests pass
- No lint errors
- 100% of balance.md formulas implemented with matching test cases

## Technical Approach

- All functions in `lib/engine/` are pure: `(input) => output`
- Import types from `lib/game/schema.ts`, constants from `lib/game/constants.ts`
- RNG is passed as argument, never created internally (except in `createCharacter` which seeds it)
- Use Vitest for unit tests (already in devDependencies or add it)
- Each formula gets at least one test case with known inputs/outputs from balance.md examples
- Reducer functions return new state objects (immutable updates)

## Out of Scope

- No AI/LLM calls (Task 5/6)
- No database access (Task 4)
- No Server Actions (Task 4)
- No UI components (Task 3)
- No Supabase client (Task 4)

## Spec Sources

- `game-design/balance.md` — all numerical formulas (authoritative)
- `game-design/data-model.md` — state shape reference
- `game-design/core-loop.md` — game flow context
- `backend/directory-structure.md` — file layout
