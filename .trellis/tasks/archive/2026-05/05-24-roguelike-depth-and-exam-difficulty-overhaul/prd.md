# Roguelike Depth and Exam Difficulty Overhaul

## Goal

Deepen the roguelike layer (relics, buffs, run-level randomness), give the
non-study daily actions (socialize / earn / scheme / rest) a real strategic
payoff, and rebalance exam difficulty so that passing — and especially scoring
top marks — is no longer trivial. Today the game's numeric engine only rewards a
single line of play (study → high erudition → pick the highest-base exam choice),
and most of the roguelike scaffolding in the schema is dead code.

## What I already know (diagnosis — verified against code, 2026-05-24)

### Why it is too easy / "always max score"

Exam score (`lib/actions/game.ts` submitExamAnswer + `lib/engine/exam.ts`):
`score = base_score + erudition*0.3 + court_whims_bonus(0/10/20)`.
The highest `base_score` per exam in the question pool is only 65–70.
At each level's *minimum entry erudition*, picking the highest-base choice gives:

| Exam        | Threshold | Entry erudition | Score (best base) | Margin |
|-------------|-----------|-----------------|-------------------|--------|
| 童试 county      | 40        | 20              | 65 + 6 = 71       | +31    |
| 乡试 provincial  | 60        | 50              | 60 + 15 = 75      | +15    |
| 会试 metropolitan| 75        | 80              | 70 + 24 = 94      | +19    |

→ "Always pick the highest-base option" clears every threshold exam with scores
near 90. Court-whims alignment and choice risk are entirely optional. The
`(generation-1)*2` and `fortune/10` modifiers are too small to matter.
殿试 palace: `getRivalStrength` makes gen 1–2 rivals `weak` (40–65), while the
player scores 90+, so a **first-generation 状元 is near-guaranteed**. This is far
off the spec's own balance targets (single-gen 状元 < 2%, metropolitan first-try
pass 15%) in `balance.md` > Balance Targets.

### Why study dominates

Erudition is the only stat that affects winning, and only the Study action
raises it. The court-whims intel system (the intended payoff for socialize /
scheme) is optional because base_score alone clears thresholds. Earn (wealth)
only feeds auxiliary tools that are themselves unnecessary; Rest only refuels
Drive to study more. Optimal play = study/rest spam.

### Roguelike scaffolding that exists but is inert (dead code)

- **Random events are stat-only.** `applyEventChoice` only applies
  `stat_changes`; the V1→CurrentEvent mapping hardcodes `risk: null` and grants
  no items/traits/effects.
- **Inventory is never populated.** `InventoryItemSchema` + `item.effect` exist
  but nothing in the codebase ever pushes to `character.inventory` (grep: 0 hits).
  No relic system exists.
- **Origin traits are cosmetic.** 囊萤映雪 / 宗族荫庇 / 铜臭难洗 / 旧日荣光 are never
  read by any mechanic.
- **5 of 8 dynasty blessings are inert.** Only `starting_erudition_+20`,
  `starting_wealth_+20`, `iron_constitution (max_age+10)` are applied in
  `resolveInheritance`. 过目不忘 / 行贿有方 / 官场人脉 / 夺情特许 / 商道传家 do nothing.
- **status_effects** only ever produces `exam_ban`; mourning / catastrophe_survivor
  are referenced but never created.

## Assumptions (temporary)

- We keep the "dead code controls numbers, AI controls narrative" principle
  (data-model.md) — relics/buffs are deterministic engine effects, AI only
  narrates around them.
- Self-written engine, no new heavy deps (consistent with project conventions).
- Changes must keep existing tests meaningful (engine tests under
  `lib/engine/__tests__`) and stay typecheck/lint clean.

## Decisions (running log)

- **(Q1) Relic/buff lifecycle = hybrid.** Most relics/buffs are per-life (granted
  during a generation, lost at death) → drives per-life build variety and gives
  non-study actions a reason. PLUS a small inheritable "heirloom" slot (≈1 relic)
  that passes to the chosen heir at inheritance → preserves the generational-weight
  fantasy. Dynasty 祖荫祝福 remains the separate permanent meta layer.
- **(Q2) Exam rework = multi-dimensional scoring + mandatory intel.** Rewrite the
  score formula so `base_score` no longer dominates; court-whims alignment moves
  from an optional bonus to a *gating requirement* for high-level exams (会试/殿试),
  obtained via socialize/scheme intel; relic/build bonuses stack on top. Misaligned
  会试/殿试 answers should usually fail. This fixes "too easy" and "study dominates"
  together.

- **(Q3) Randomness = all four dimensions.**
  1. Random build variety — relics/events/shop offerings appear randomly; each life
     offers a different pickable set (Slay-the-Spire-style draft / three-choose-one).
  2. Visible stat-roll variance — stat growth and exam performance carry a visible
     random band (超常发挥 / 临场失常); current RNG bands are too narrow.
  3. Player-visible reproducible seed — expose the existing seeded RNG for shareable
     seeds / leaderboard fairness.
  4. Richer random events/encounters — bigger event pool that can change build/path,
     not just stats.

- **(Q5) Dead-code activation = all four.** (1) Origin traits become live engine
  modifiers; (2) the 5 inert blessings get wired; (3) `status_effects` is
  generalized into a typed buff/debuff layer (the same machinery relics/buffs need);
  (4) the referenced-but-missing 守孝 (mourning) and 灾祸 (catastrophe) systems are
  added. Traits + status_effects are near-entailed by the buff system; blessings and
  mourning/catastrophe are additive.

## Requirements

- **Relic/buff system (hybrid).** Per-life relics + one inheritable heirloom slot.
  Engine interprets typed effects (not free strings). Relics carry rarity + effect
  list; acquired via the channels below; offered as a 3-choose-1 draft.
- **Typed effect / buff layer.** Replace the uninterpreted `item.effect` string and
  the ad-hoc `status_effects` with a discriminated-union effect vocabulary the engine
  evaluates (passive stat mods, action-cost mods, exam-score mods, intel grants,
  timed buffs/debuffs, event triggers). Reused by relics, buffs, origin traits, and
  blessings so there is one code path.
- **Exam rework (multi-dimensional + mandatory intel).** New score formula: lower
  `base_score` weight, higher erudition weight, court-whims alignment as a gating
  term at 会试/殿试 (misalignment → usually fail), plus relic/buff modifiers and a
  visible performance-variance term. Rescale palace rival strength so a gen-1 状元 is
  rare. Recalibrate thresholds / generation / era modifiers to hit balance targets.
- **Action differentiation.** Each daily action yields a distinct, exam-relevant
  payoff: Study→erudition(+academic relic chance); Socialize→temperament intel +
  social relics + affinity; Scheme→style intel + high-risk powerful relics + risk;
  Earn→wealth→shop purchasing power; Rest→drive(+灵感 buff chance).
- **Acquisition channels (recommended set — confirm at sign-off).** action-specific
  drops + event rewards (events can now grant relics/buffs/traits) + a wealth-driven
  merchant/shop (gives 营生 a purpose) + exam/milestone rewards.
- **Randomness (4 dims).** (1) random relic/shop/event pools + draft; (2) widened
  stat-gain bands + an exam performance-variance term (超常/失常) surfaced in UI;
  (3) player-visible/enterable seed; (4) larger event pool whose outcomes can shift
  build/path.
- **Dead-code activation.** Origin traits live; 5 blessings wired; status_effects →
  typed buff layer; 守孝/灾祸 systems added (mourning forced by parent-death event,
  skippable by 夺情特许; catastrophe sets `catastrophe_survivor` + relic).
- **Save migration.** New `GameStateSchema` fields must default/migrate so existing
  Supabase saves still parse (the deployed demo must not break on load).
- **Difficulty target = approach the spec's existing balance targets** (county 60% /
  provincial 30% / metropolitan 15% / single-gen 状元 < 2%), verified by a Monte-Carlo
  balance simulation test.

### Round-2 enrichments (playability — added after user review)

- **Per-origin skill kits (not just one trait).** Each origin gets a small distinct
  skill/identity kit so origins play differently from turn one. Extends Q5 "origin
  traits live" into a recognizable per-origin playstyle.
- **Skills as a first-class effect carrier.** A `Skill`/`Talent` is a named bundle of
  `Effect`s (same engine as relics/traits/buffs). Events, relics, mentors, and exams
  can grant skills → gives event choices a build-relevant reason to exist. (See Q7:
  passive-only vs also active abilities.)
- **World / era modifiers.** Low-probability run/era-level modifiers that bias whole
  event *categories* or their outcomes (e.g. 天降祥瑞: opportunity events richer this
  era; 世道艰难: misfortune more frequent/severe). Implemented as world-scoped `Effect`s
  surfaced to the player. (Promoted from "future evolution" into scope.)
- **Variable event outcomes (no fixed deltas).** Event-choice outcomes resolve via
  ranges / dice rather than fixed `stat_changes` — the same choice can go well or badly.
  (Mechanism depends on Q6 dice fork.)
- **Roll-able, diverse starts.** Character creation produces a randomized starting
  package (stat jitter + a bonus starting trait/skill/relic + initial court-whims /
  short event-history flavor), with a visible seed and a **reroll** affordance → the
  common roguelike "roll 开局" becomes possible. Primarily gen-1; gen-2+ keeps the
  inheritance-driven origin options.
- **Richer event content.** Expand event archetypes, tone (black-humor per design
  pillars), era-specific flavor, and multi-step / branching encounters to fix
  "events feel boring". Touches the V1 contract + prompt library + a curated archetype
  set. Mechanics stay typed/deterministic; only flavor is AI-generated.

## Round-2 decisions

- **(Q6) Dice = events roll + exam performance roll.** Introduce a seeded dice-check
  primitive `roll(dice) + modifier vs DC` with outcome tiers (crit/success/fail/
  crit-fail), shown to the player. Events / scheme / social resolve via this roll
  (modifier from stat + skills/relics/buffs). The exam *core* stays the multi-dimensional
  formula, but gains a bounded "performance roll" (超常/正常/失常, e.g. ±10) layered on
  top — so the boss exam is skill/intel-driven with a luck swing, not pure luck. All
  rolls use the existing seeded `Rng` → reproducible.
- **(Q7) Skills = passive-mostly + a few actives.** Most skills are passive `Effect`
  bundles; a small set are *active* abilities (cost drive/wealth, per-cycle cooldown),
  with **one signature active per origin** (e.g. 寒门 悬梁刺股: this season's study
  doubled). Adds a tactical "use ability" layer and per-origin identity.

## Acceptance Criteria

- [ ] A fresh gen-1 humble-scholar can NOT reliably clear 会试 by study-spam +
      highest-base choice alone (needs intel/relics/alignment).
- [ ] Intel (socialize/scheme) is mechanically required for a strong 会试/殿试 result.
- [ ] Each non-study action has at least one effect that meaningfully changes optimal play.
- [ ] Relics, buffs, origin traits, and the 5 previously-inert blessings all mutate
      state through the shared typed-effect engine; each is covered by a unit test.
- [ ] A Monte-Carlo sim (N≥1000 runs) reports first-try pass rates and single-gen 状元
      rate within a tolerance band of the balance.md targets.
- [ ] Existing saved games load without schema errors after the change.
- [ ] Seed is visible to the player and a given seed reproduces a run.
- [ ] Each origin has a distinct starting skill kit; a sim shows two origins play differently.
- [ ] Character creation supports reroll; the same seed reproduces the same start.
- [ ] At least one world/era modifier can trigger and measurably shifts event outcomes.
- [ ] Event-choice outcomes are non-deterministic (ranged/dice), verified by test.
- [ ] Lint / typecheck / tests green; game-design spec docs updated to match.

## Definition of Done (team quality bar)

- Engine unit tests added/updated for all new numeric rules + the balance sim.
- Lint / typecheck / tests green.
- game-design spec (balance.md / data-model.md / core-loop.md / ai-contracts.md)
  updated to match new mechanics (spec is the contract).
- No dead-code mechanics introduced (every relic/buff/trait/blessing effect is wired).
- Save migration verified against a pre-change save fixture.

## Technical Approach

### 1. Typed effect & buff layer (foundation)
Introduce an `Effect` discriminated union (e.g. `stat_passive`, `action_cost`,
`action_gain`, `exam_score`, `exam_alignment_gate`, `intel_grant`, `shop_unlock`,
`timed_buff`, `event_hook`). Generalize `status_effects` into `modifiers` carrying
`{ source, effect, turns_remaining? }`. A single `collectModifiers(character)` +
effect evaluators feed `applyActionEffects`, exam scoring, and turn ticking. Origin
traits, relics, blessings, and temporary buffs all emit `Effect`s → one code path.

### 2. Exam scoring rework (illustrative — final constants tuned by sim)
Fixed choice: `raw = base_score*0.4 + erudition*0.4 + alignment_term + relic_mods + variance`.
Free text: `raw = judge*0.55 + erudition*0.4 + relic_mods + variance` (judge already
scores alignment). `alignment_term`: none 0 / partial +12 / full +24. **Gate:** at
会试/殿试, `alignment=none` caps score below the pass threshold (intel mandatory).
Variance: `±N` from a visible roll (super/normal/poor performance). Raise erudition
weight + lower base weight so a single high-base pick no longer dominates. Rescale
`getRivalStrength` upward (gen-1 rivals competitive enough that 状元 is rare).

### 3. Relic system
`Relic { id, name, rarity, slot: 'common'|'heirloom_eligible', effects: Effect[], flavor }`.
Stored in `character.inventory` (repurposed) / a new `character.relics`. Acquisition:
action drops, event rewards, shop, exam rewards — each presents a 3-choose-1 draft.
At inheritance, the player picks ≤1 `heirloom_eligible` relic to pass on.

### 4. Action differentiation & intel
Re-tune `ACTIONS`, add per-action relic/intel/buff rolls. Socialize reveals
temperament intel; Scheme reveals style intel + powerful risky relics; Earn feeds a
merchant shop (spend wealth on relics/tools); Rest can grant a 灵感 timed buff.

### 5. Randomness
Widen stat-gain ranges; add exam variance roll; expose `rng_seed` (show + allow entry
at创建); expand event pool and let V1 events return typed rewards (relic/buff/trait).

### 6. Dead-code activation
Implement 4 origin traits as `Effect`s; wire 5 blessings via the effect layer; add
mourning (forced modifier from parent-death event, blocks some actions, skippable by
夺情特许) and catastrophe (severe misfortune → `catastrophe_survivor` + relic).

### 7. AI contracts & spec
E1: widen/standardize `base_score` guidance + ensure an aligned high-value choice
isn't always present. V1: add optional typed `reward`. E3: rescale rival scores.
Update fallback pools. Update balance.md / data-model.md / core-loop.md / ai-contracts.md.

### 8. Balance verification
Add a headless Monte-Carlo harness (pure engine, no AI/IO) using a greedy/heuristic
auto-player to measure pass rates & 状元 rate over N≥1000 seeds; assert within tolerance
of balance.md targets. This is how the "is it the right difficulty?" question is
answered objectively rather than by feel.

### 9. Dice primitive (resolution model)
A seeded `rollCheck({ modifier, dc, dice })` → `{ roll, total, tier }`, tier ∈
crit_success / success / fail / crit_fail. Events carry a `check` (stat + DC) with
per-tier outcome ranges (replaces fixed `stat_changes`); scheme exposure and social
outcomes route through it too. Exams keep the multi-dimensional score formula and add a
bounded performance roll (e.g. d20 → ±10, nat-low = 失常 / nat-high = 超常) shown beside
the score. All rolls use the existing `Rng` so a seed reproduces every roll; UI surfaces
roll / modifier / DC / tier.

### 10. Skills (passive + active)
`Skill { id, name, kind: 'passive' | 'active', effects: Effect[], cost?, cooldown_cycles? }`.
Passive skills emit Effects via the same `collectModifiers` path. Active skills are
player-triggered in the action/exam UI, consume drive/wealth, and have a per-cycle
cooldown; each origin ships one signature active. Skills are grantable by origins,
events, mentors, relics, and exam milestones — unifying "different origins play
differently" and "events grant abilities".

## Decision (ADR-lite)

**Context**: The numeric engine rewards only study→erudition→highest-base-choice;
relics/buffs/traits/most-blessings are dead code; difficulty is far below the spec's
own targets.
**Decision**: One typed effect/buff engine underpins relics (hybrid per-life +
heirloom), live origin traits, and the 5 inert blessings. Exam scoring becomes
multi-dimensional with court intel as a mandatory gate at high levels. Add all four
randomness dimensions and the missing mourning/catastrophe systems. Tune difficulty
to the spec's balance targets, verified by a Monte-Carlo sim.
**Consequences**: Large surface (engine + AI contracts + schema + UI + spec); requires
save migration; exact constants are tuned against the sim, not guessed. Delivered as
staged PRs so each layer is independently testable. Risk: scope is big — mitigated by
the PR staging and the sim as an objective acceptance gate.

## Implementation Plan (staged PRs / candidate subtasks)

- **PR1 — Effect/buff foundation**: `Effect` union, `modifiers` generalization of
  `status_effects`, `collectModifiers` + evaluators, seeded dice primitive (`rollCheck`),
  save migration + defaults, tests.
- **PR2 — Relic system**: relic data + rarity, acquisition plumbing, 3-choose-1 draft,
  merchant shop, heirloom inheritance, tests.
- **PR3 — Exam rework + balance sim**: new scoring formula, alignment gate, palace
  rescale, threshold recalibration, Monte-Carlo harness, tune to targets.
- **PR4 — Actions / skills / traits / blessings / randomness / mourning+catastrophe**:
  action differentiation, per-origin skill kits (passive + 1 signature active), 4 origin
  traits, 5 blessings, world/era modifiers, dice-resolved variable event outcomes,
  roll-able diverse starts (creation reroll) + exposed seed, mourning + catastrophe.
- **PR5 — AI contracts + spec + UI**: E1/V1/E3 updates + fallbacks, spec doc updates,
  UI surfacing (relics/buffs/shop/seed/variance/draft).

## Expansion Sweep notes

- **Future evolution**: relic synergies/sets, more origins, unlockable actions, daily
  modifiers — the typed-effect layer keeps these cheap to add later.
- **Related scenarios**: leaderboard scoring should reflect the harder curve; create
  vs inherit must both seed relics/heirloom consistently.
- **Edge/failure**: save migration (old saves), relic effect stacking/conflicts,
  heirloom on sonless/adoption path, variance must not make 童试 unwinnable nor 状元
  luck-trivial, AI output schema changes need fallbacks.

## Out of Scope (explicit)

- New art/animation beyond surfacing the new systems in existing UI patterns.
- Multiplayer / online features beyond the existing leaderboard.
- Audio work for the new moments (reuse existing sound cue hooks).
- A full relic "set bonus" / synergy meta-system (kept as future evolution).
- Rewriting the AI provider/LLM layer (only contract input/output shapes change).

## Technical Notes

Key files:
- `lib/game/constants.ts` — ORIGINS, ACTIONS, EXAM_THRESHOLDS, BLESSINGS, ERA_MODIFIERS
- `lib/engine/exam.ts` — examThreshold, scoreFixedChoice, scoreFreeText, risk, palaceRanking
- `lib/engine/balance.ts` — applyActionEffects, diminishingReturns, event chance
- `lib/engine/reducer.ts` — advanceSeason, applyEventChoice, resolveExam, resolveInheritance, createCharacter
- `lib/actions/game.ts` — server actions orchestrating turns/exams/tools/events
- `lib/ai/contracts/*` — E1 exam question (base_score), E3 palace rivals, V1 events
- `lib/game/schema.ts` — GameState zod schema (inventory, status_effects, traits, blessings)
- spec: `.trellis/spec/game-design/{core-loop,balance,data-model,ai-contracts}.md`

Balance targets already in spec (balance.md > Balance Targets):
county first-try 60% / provincial 30% / metropolitan 15% / single-gen 状元 < 2%.

### Baseline & concurrency (updated 2026-05-24)

- Diagnosis above was read at commit `74e9528`; **current baseline is `f4651d8`**. A
  parallel Codex task (`05-24-full-flow-qa-fixes`) landed two linear commits
  (`f156dc1` UI stabilization + display module; `f4651d8` narration constraints) that
  do NOT change the diagnosis or plan. Implement against `f4651d8` and read live code
  (a few line numbers / snippets quoted above shifted slightly).
- **Preserve (do not revert)**: (a) `balance.ts resolveRange` reversed-tuple
  normalization + the balance.md "action ranges authored `[min,max]` + engine
  normalizes defensively" contract; (b) the R1 narration constraints in
  `game.ts submitExamAnswer` + `prompts.ts` — no fabricated rankings for
  童试/乡试/会试; ranking language only for 殿试 (consistent with our exam rework where
  殿试 is the only competitive/ranked exam).
- **Reuse in PR5 (UI)**: extend `lib/game/display.ts` (centralized labels —
  才学/运势/心力/银两 + era/court/exam-level enums) for new relic/buff/skill/dice/
  world-modifier labels; do not duplicate. Note display terms differ from this PRD's
  prose (才学=erudition, 心力=drive) — internal stat keys are unchanged, but new UI
  copy should match the codebase. Route session handoffs through
  `setSessionJSON`/`removeSessionJSON` (`hooks/useSessionJSON.ts`) per the updated
  `frontend/state-management.md`; never call `sessionStorage` directly from pages.
