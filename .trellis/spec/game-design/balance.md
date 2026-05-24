# Balance Formulas

> All numerical rules that govern game progression. These are **dead code** — implemented as deterministic functions, never delegated to AI. AI generates narrative around these numbers but cannot override them.

---

## Origin Definitions

Each origin provides starting stat modifiers and a unique trait. First generation uses dynasty blessing points to "buy" an origin; subsequent generations inherit based on legacy.

| Origin | Erudition | Fortune | Drive | Wealth | Innate Trait | Flavor |
|--------|-----------|---------|-------|--------|-------------|--------|
| 寒门孤儿 (Humble Scholar) | +5 | -20 | +10 | 0 | 囊萤映雪: Study action costs 0 Drive | Hardship breeds resilience |
| 耕读之家 (Farming Family) | +15 | +10 | 0 | +5 | 宗族荫庇: Provincial exam threshold -5 | Stable foundation |
| 盐商庶子 (Merchant Son) | 0 | +5 | 0 | +30 | 铜臭难洗: Socialize with scholars has 20% chance of rejection | Rich but scorned |
| 没落官宦 (Fallen Official) | +10 | -10 | -10 | +10 | 旧日荣光: Start with 1 random NPC connection (patron or mentor) | Past glory, present shame |

### Origin Availability

- **Generation 1**: Player chooses freely from all origins
- **Generation 2+**: Origin is determined by previous generation's ending state:
  - Ended with 举人+ title → 耕读之家 or 没落官宦
  - Ended with high wealth (≥ 50) → 盐商庶子 or 耕读之家
  - Ended with low wealth (< 10) and no title → 寒门孤儿
  - Player always gets 2-3 options (never forced into exactly one)

---

## Generation 1 Baseline

Before origin modifiers, a first-generation character starts from a fixed base:

| Stat | Base |
|------|------|
| Erudition | 15 |
| Fortune | 30 |
| Drive | 100 (always full at the start of any generation) |
| Wealth | 5 |

The chosen origin's modifiers are then added. Example — 寒门孤儿 (Humble Scholar: +5 / −20 / +10 / 0) → Erudition 20, Fortune 10, Drive 100 (the +10 is capped), Wealth 5 — matching the Character State example in data-model.md. Positive Drive bonuses from an origin are capped by the full-Drive start (so they only act as a buffer); negative ones (没落官宦 −10) lower the starting Drive to 90.

Generation 2+ does NOT use this base — starting stats come from the Heir Starting Stats formula below, with that generation's inherited-origin modifiers applied on top.

---

## Stat Change Rules

### Action Effects (Per Season)

| Action | Erudition | Fortune | Drive | Wealth | Notes |
|--------|-----------|---------|-------|--------|-------|
| Study (读书) | +3~5 | 0 | -2 | 0 | Diminishing returns above 80 |
| Socialize (交游) | +1 | +3~5 | -1 | -1 | Requires Erudition ≥ 20 |
| Earn (营生) | -1 | 0 | -1 | +5~10 | |
| Rest (休养) | 0 | +1 | +5~8 | -1 | |
| Scheme (钻营) | 0 | +5~10 | -3 | -5~-3 | 15% exposure risk |

Ranges indicate randomness (uniform distribution within range).

Implementation contract: action-effect ranges are authored as `[min, max]`,
including negative ranges (`[-5, -3]`, not `[-3, -5]`). The engine's range
resolver must still normalize reversed tuples defensively before calling
`rng.nextInt(min, max)` so a bad constant cannot crash a production turn.

### Diminishing Returns Formula

```
effective_gain = base_gain * (1 - current_value / (max_value * 1.5))
```

Example: At Erudition 80, studying gives `5 * (1 - 80/150) = 2.3` instead of 5.

### Drive Decay (Aging)

```
drive_loss_per_year = max(1, (age - 20) / 10)
```

- Age 16-30: -1/year (0.25/season)
- Age 40: -2/year
- Age 60: -4/year

This creates natural generational pressure without arbitrary death timers.

---

## Lifespan (max_age)

Every character is assigned a `max_age` at creation. Reaching it ends the generation by natural death (core-loop.md > Inheritance triggers). It is the hard ceiling — most generations end earlier when Drive hits 0, so max_age mainly grants extra late-life turns to players who manage Drive well.

```
max_age = 55 + random(-8 .. +12)   // base spread ≈ 47–67
        + trait_modifier           // 体弱 −8, 命硬/长寿 +10
        + origin_modifier          // 没落官宦 −2, others 0
        + blessing_modifier        // e.g., 命硬 blessing +5
clamped to [40, 80]
```

Grounding: in Ming–Qing clan genealogies, gentry males who survived to adulthood lived ~57 years on average, and jinshi degree-holders outlived commoners by ~7 years — so letting status / blessings raise max_age is historically faithful. The keju exams had no age limit (men sat them into their 70s–80s), which is why a long-lived, high-Drive character can keep attempting cycles for decades.

---

## Exam Scoring

### Pass Threshold Formula

```
threshold = base_threshold + era_modifier + generation_modifier - fortune_bonus

fortune_bonus = fortune / 10
generation_modifier = (generation_number - 1) * 2   // gen 1 = +0; see Generation Scaling
```

Note: threshold does NOT increase with repeated attempts. Failing an exam is already punishing (Drive loss, time spent). The game encourages trying different strategies (free-text, scheming for court_whims info) rather than grinding the same approach.

| Exam Level | Base Threshold | Max Score |
|-----------|---------------|-----------|
| 童试 (County) | 40 | 100 |
| 乡试 (Provincial) | 60 | 100 |
| 会试 (Metropolitan) | 75 | 100 |
| 殿试 (Palace) | — (ranking only, see note) | 100 |

> **殿试 has no pass/fail threshold.** Entry is gated by the 贡士 title (earned by passing 会试 at threshold 75). All four finalists receive a title; rank is determined competitively by score (E3 generates rivals, the engine ranks them). The challenge here is not passing but out-scoring strong rivals for 状元/榜眼/探花 — rival strength scales with dynasty generation. Reaching 殿试 therefore guarantees at least 进士 (Standard Victory), matching the historical reality that 贡士 were essentially never failed at the palace stage.

### Player Score Calculation

For **fixed choices** (A/B/C):
```
raw_score = choice_base_value + erudition_bonus + court_whims_bonus
score = clamp(raw_score, 0, 100)

erudition_bonus = erudition * 0.3
court_whims_bonus = 0 | 10 | 20  (none / partial / full match)
```

For **free-text input**:
```
raw_score = judge_lm_score * 0.7 + erudition_bonus
score = clamp(raw_score, 0, 100)

erudition_bonus = erudition * 0.3
judge_lm_score: 0-100 (returned by Judge LM, includes the alignment rubric dimension)
```

> **Clamp rationale**: Without clamping, a high-erudition character picking a high-base_score choice with full court_whims alignment could exceed 100 (e.g., 70 + 30 + 20 = 120). The clamp ensures scores stay within [0, 100] for threshold comparison and palace ranking.

**Why free-text omits the explicit court_whims_bonus:** the Judge (E2) already scores court alignment as one of its rubric dimensions (迎合, 0-25), folded into `judge_lm_score`. Adding the engine's 0/10/20 bonus on top would double-count alignment. For fixed choices the engine owns alignment (each choice carries a discrete full/partial/none label), so it applies the 0/10/20 bonus directly; for free prose only the Judge can assess alignment, so it lives inside `judge_lm_score`. The 0.7 multiplier (raised from 0.6) makes a perfect free-text answer (judge 100 → 70) reach the same answer-component ceiling as the strongest fixed choice (base 70), so the creative path is not mathematically dominated by picking option C.

### Court Whims Alignment

Alignment scoring:
- Style match: +10
- Temperament match: +10
- Both match: +20 (not +25, capped)

### Court Whims Reveal Mechanism

Court whims have two hidden dimensions: `style` and `emperor_temperament`. Each is independently revealed.

| Discovery Method | What It Reveals | Cost/Requirement |
|-----------------|----------------|-----------------|
| Buy examiner's works (Scheme action) | `style` fully revealed | Wealth -5 |
| Socialize with officials (Fortune ≥ 30) | `emperor_temperament` partially revealed (2 of 4 options eliminated) | Fortune ≥ 30 required |
| Patron NPC gossip (affinity ≥ 40) | `emperor_temperament` fully revealed | Patron relationship |
| Political random event | Either dimension partially revealed | Luck-based |
| 榜眼引路 tool | Reveals which fixed choice (A/B/C) aligns best | Wealth -15 |

**Reveal persistence**: Once revealed, court whims stay visible for the remainder of the current era. On era change, all reveals reset (new court, new preferences).

**UI representation**: Unrevealed dimensions show as "???" in the exam preparation screen. Partially revealed shows as "非X非Y" (not X, not Y). Fully revealed shows the actual value.

### Choice Risk Mechanics

Fixed choices (A/B/C) from E1 may carry a `risk` field. Risk is **conditional and deterministic** — it triggers a penalty only when a specific state condition is met. This rewards players who invest in intelligence-gathering: if you know the court_whims, you can take risky choices safely.

#### Risk Condition Types

| Risk Condition | Triggers When | Penalty |
|---------------|---------------|---------|
| `temperament_mismatch` | Choice alignment ≠ `court_whims.emperor_temperament` | Drive -10, Fortune -5 |
| `style_mismatch` | Choice alignment ≠ `court_whims.style` | Drive -5, Fortune -10 |
| `full_mismatch` | NEITHER style nor temperament matches | Drive -15, Fortune -10 |

#### Evaluation Rules

```
// Evaluated by the engine in resolveExam(), AFTER scoring
if choice.risk is null:
    no penalty possible
else:
    condition = choice.risk.condition
    if evaluateRiskCondition(condition, court_whims, choice.alignment):
        apply choice.risk.penalty to character stats
```

- Risk is evaluated **after** the exam score is calculated — it does not affect the score itself
- Risk penalties apply regardless of pass/fail (you can pass the exam AND suffer the penalty)
- If court_whims are fully revealed and the player picks a risky choice that aligns: no penalty (the condition is not met)
- Risk penalties are applied once, immediately after exam resolution
- Free-text answers have no risk field (the Judge evaluates alignment holistically via the rubric)

#### Design Intent

High-base_score choices are genuinely dangerous for uninformed players but safe for those who invested in court_whims intelligence. This creates a meaningful decision loop:
- Spend time/resources revealing court_whims → safely exploit high-reward choices
- Skip intelligence → gamble on risky choices or settle for safe/low-reward ones
- The 榜眼引路 tool directly reveals which choice aligns best, making it a risk-mitigation purchase

---

## Fertility & Lineage

Heirs are the sons born during a character's life. This system sets `num_heirs` (input to AI Contract I1) and drives the family-extinction failure condition.

### Marriage

`Marry` is a one-time action per generation. It requires Fortune ≥ 15 and Wealth ≥ 10 (betrothal cost). On marriage a spouse NPC is created and a fertility window opens:

```
fertile_until_year = married_year + random(14 .. 20)
```

An unmarried character produces no heirs (the line ends unless adoption applies).

### Births

While married and within the fertility window, each **year** rolls once:

```
son_birth_chance_per_year = 0.30
```

Daughters are abstracted away for the exam line (they may appear as Social-event flavor, but only sons are heir candidates — consistent with the gender design decision). Each son born must survive childhood to become an heir candidate; survival is rolled at birth:

```
child_survival_rate = era_survival[era]
  prosperity 0.70 | decline 0.60 | invasion 0.45 | restoration 0.65
```

Surviving sons are stored in `character.family.children`; a non-survivor may surface as a 夭折 Misfortune event.

> Expected outcome: ~0.30 × ~16 fertile years × ~0.6 survival ≈ **2–3 surviving sons** on average — close to the ~2 surviving sons per gentry male in Ming–Qing genealogies — but bad luck (or a short life / wartime survival rates) can leave a character sonless, creating genuine lineage tension.

### Heir Count

```
num_heirs = clamp(count(surviving_sons), 0, 3)
```

If more than 3 sons survive, the 3 with the best birth-year/era rolls are offered. I1 fleshes out these sons into full candidates (names, traits, hints).

### Sonless: Adoption or Extinction

If `num_heirs == 0` at inheritance:
- **Adoption** is offered when `dynasty.legacy.reputation ≥ 20` (a clan with standing adopts a kinsman's son). The adopted heir starts with inheritance assets reduced by 30% and one random trait; I1 generates a single candidate with `is_adoption: true`.
- If reputation < 20 or adoption is declined, the **family line dies out** → game over (F tier).

This mirrors the documented practice of sonless gentry couples adopting male heirs to continue the lineage.

---

## Inheritance Formulas

### Legacy Token Calculation

On generation end:
```
books_inherited = character.erudition * 0.8
land_inherited = character.wealth * 0.6
reputation_inherited = max(character.fortune * 0.3, highest_title_value)
```

Title values: 秀才=10, 举人=30, 贡士=50, 进士=80, 状元=100

### Blessing Point Accumulation

```
blessing_points_earned = books_inherited + land_inherited + reputation_inherited + achievement_bonus
```

Achievement bonuses:
- First exam pass in family: +20
- Survived a catastrophic event: +10
- Reached age 70+: +15
- Raised 3+ sons to adulthood: +10

### Heir Starting Stats

```
starting_erudition = 10 + (books_inherited / 10) + blessing_bonuses
starting_fortune = 5 + (reputation_inherited / 20) + blessing_bonuses
starting_drive = 100  (always full for new generation)
starting_wealth = land_inherited * 0.5 + blessing_bonuses
```

### Decay Between Generations

Each generation without exam progress:
```
books_inherited *= 0.7  (knowledge fades)
land_inherited *= 0.9   (land is stable)
reputation_inherited *= 0.4  (reputation fades fast)
```

---

## Difficulty Curve

### Era Difficulty Multiplier

| Era | Exam Threshold Modifier | Event Danger | Opportunity Frequency |
|-----|------------------------|--------------|----------------------|
| Prosperity (盛世) | +0 | Low | High |
| Decline (衰世) | +5 | Medium | Medium |
| Invasion (乱世) | +15 | High | Low |
| Restoration (中兴) | +10 | Medium | High |

### Generation Scaling

```
generation_modifier = (generation_number - 1) * 2   // gen 1 = +0
```

This term feeds directly into the exam Pass Threshold Formula above. Later generations face slightly harder exams but have more accumulated blessings to compensate; generation 1 gets no penalty so base thresholds stay calibrated for a fresh dynasty.

### Era Transition Rules

Era transitions are evaluated by the engine during the inheritance phase (after a generation ends, before the next begins). The dynasty state tracks `last_era_change_generation` to determine timing.

```
generations_since_change = dynasty.total_generations - dynasty.last_era_change_generation

if generations_since_change < 2:
    no transition
elif generations_since_change >= 3:
    forced transition
elif generations_since_change == 2:
    transition if rng.next() < 0.5
```

**Era sequence** (constrained Markov chain — narratively coherent, not purely random):

| Current Era | Next Era Options |
|-------------|-----------------|
| Prosperity (盛世) | Decline (60%) \| Invasion (40%) |
| Decline (衰世) | Invasion (60%) \| Restoration (40%) |
| Invasion (乱世) | Restoration (100%) |
| Restoration (中兴) | Prosperity (100%) |

- First era of a new dynasty is always `prosperity`
- `dynasty.last_era_change_generation` starts at 0 (era set at dynasty creation)
- On transition: update `world.era`, reset `court_whims` (reroll), reset all `court_whims_revealed` flags, apply NPC era-change rules (data-model.md)
- The seeded RNG ensures era transitions are reproducible given the same seed

---

## Random Event Probability

### Base Trigger Rate

```
event_chance_per_season = 0.20 + (fortune / 500)  // fortune affects frequency
```

### Event Type Distribution

| Fortune Range | Opportunity | Misfortune | Social | Political |
|--------------|-------------|------------|--------|-----------|
| < 0 | 5% | 40% | 40% | 15% |
| 0-30 | 15% | 25% | 45% | 15% |
| 31-60 | 25% | 15% | 40% | 20% |
| > 60 | 35% | 10% | 35% | 20% |

---

## Auxiliary Tools Balance

### 小抄/夹带 (Cheat Sheet)

> **SUPERSEDED**: The erudition multiplier below (×0.6) applies to the OLD formula.
> Under the new formula (This Iteration > Cheat Sheet interaction), the effect is
> `erudition * W_ERUDITION * 2` = `erudition * 0.8` (W_ERUDITION=0.4).

```
activation_cost: Fortune -10
effect (OLD formula): erudition_bonus uses (erudition * 2) instead of erudition in the score formula
         i.e., erudition_bonus = (erudition * 2) * 0.3 = erudition * 0.6
         final score is still clamp(raw_score, 0, 100)
exposure_chance: 0.15
exposure_penalty:
  - exam_ban: 1 cycle (3 years)
  - drive: -20
  - fortune: -15
  - reputation_event: "作弊丑闻" triggers in next season
```

> **Clamp interaction**: With Cheat Sheet active, erudition_bonus ceiling rises from 30 (erudition 100 × 0.3) to 60 (erudition 100 × 0.6). Combined with a high base_score choice (70) + court_whims (20), raw_score can reach 150 — but the final `clamp(0, 100)` caps it. The real benefit is that mid-erudition characters (40-60) get a meaningful boost without needing to also align with court_whims.

### 榜眼引路 (Insider Tip)

```
activation_cost: Wealth -15
effect: reveals best-aligned choice (A/B/C) for current court_whims
risk: none (pure information purchase)
availability: only when court_whims is partially or fully hidden
```

### 恩师引荐 (Mentor's Plea)

```
activation_requirement: mentor NPC with affinity >= 60
activation_cost: mentor.affinity -20
effect: after exam failure, threshold reduced by 15 for a "re-review"
re_review_pass_chance: recalculate with new threshold
limit: once per exam cycle per mentor
availability: only after exam failure, before next season advances
not_available_in: palace_exam
```

---

### Scheme Exposure Risk

> **SUPERSEDED**: Under the new system (This Iteration > Action Differentiation),
> scheme exposure resolves via a dice check (`rollCheck` with modifier = `fortune/10 +
> dice_modifier("scheme")`, DC tuned in PR3). The flat probability below is kept for
> reference only.

```
exposure_chance (OLD) = 0.15 - (fortune * 0.001)  // min 5%, max 15%
```

On exposure:
- Erudition -10
- Fortune -20
- 30% chance of exam ban for 1 cycle
- Drive -15

---

## Balance Targets

These are design goals for playtesting:

| Metric | Target |
|--------|--------|
| Average generations to first 进士 | 3-5 |
| Single-generation 状元 probability | < 2% (requires perfect luck + skill) |
| Generation survival (not drive=0 before age 40) | 80% |
| Exam pass rate (county, first attempt) | 60% |
| Exam pass rate (provincial, first attempt) | 30% |
| Exam pass rate (metropolitan, first attempt) | 15% |
| Average run length to victory | 60-90 minutes |

---

## Dice Primitive (This Iteration)

A seeded resolution mechanic for events, scheme/social outcomes, and exam performance
variance. All rolls use the existing `Rng` (seeded, reproducible). The UI surfaces
roll / modifier / DC / tier.

### rollCheck

```
rollCheck({ modifier, dc, rng }) → { roll, total, tier }

roll   = rng.nextInt(1, 20)          // d20
total  = roll + modifier
tier   =
  roll == 20           → "crit_success"
  total >= dc + 5      → "crit_success"
  total >= dc          → "success"
  roll == 1            → "crit_fail"
  total < dc - 5       → "crit_fail"
  otherwise            → "fail"
```

### Modifier sources

| Context | Modifier formula |
|---------|-----------------|
| Event choice with `check.stat` | `stat_value / 10` (rounded) + sum of `dice_modifier` Effects matching category |
| Scheme exposure | `fortune / 10` + dice_modifier("scheme") |
| Social outcome | `fortune / 10` + dice_modifier("social") |
| Exam performance roll | `(erudition + fortune) / 20` + dice_modifier("exam") |

### Exam Performance Roll

Layered on top of the multi-dimensional score formula (not replacing it). Bounded
so it swings the result but doesn't dominate:

```
performance_roll = rng.nextInt(1, 20)
performance_modifier = (erudition + fortune) / 20 + dice_modifier("exam")
performance_total = performance_roll + performance_modifier

variance =
  performance_roll == 20  → +PR3_CRIT_BONUS   // 超常发挥 (tuned in PR3, target ≈ +12)
  performance_total >= 15 → +PR3_HIGH_BONUS    // 发挥良好 (tuned in PR3, target ≈ +6)
  performance_total >= 8  → 0                  // 正常发挥
  performance_total < 8   → -PR3_LOW_PENALTY   // 发挥失常 (tuned in PR3, target ≈ -8)
  performance_roll == 1   → -PR3_CRIT_PENALTY  // 严重失常 (tuned in PR3, target ≈ -15)
```

The variance is added to the final exam score AFTER the multi-dimensional formula.
Clamped to [0, 100] as before.

---

## Exam Scoring (This Iteration — supersedes "Player Score Calculation" above)

The old formula (`base_score + erudition*0.3 + court_whims_bonus`) is replaced.
The old section is kept for reference; the engine MUST use the new formula below.

### New Fixed-Choice Score Formula

```
raw_score = base_score * W_BASE
          + erudition * W_ERUDITION
          + alignment_term
          + relic_exam_bonus
          + variance

score = clamp(raw_score, 0, 100)
```

Weight constants (tuned in PR3 — targets below):

| Constant | Target | Rationale |
|----------|--------|-----------|
| W_BASE | 0.4 | Lowers base_score dominance; a 70-base choice contributes 28, not 70 |
| W_ERUDITION | 0.4 | Erudition 80 → 32; still important but not sufficient alone |

### relic_exam_bonus

```
relic_exam_bonus = sum of all exam_score Effect values from collectModifiers(character, world)
                  where the Effect's `levels` field includes the current exam level
                  (or `levels` is absent/undefined, meaning "applies to all levels")
```

Example: a relic with `{ kind: "exam_score", value: 5 }` (no `levels`) adds +5 to all
exams. A relic with `{ kind: "exam_score", value: 8, levels: ["metropolitan","palace"] }`
adds +8 only to 会试 and 殿试.

### Alignment Term (intel gate)

| Level | alignment_term | Gate behavior |
|-------|---------------|---------------|
| 童试/乡试 | none 0 / partial +8 / full +16 | No gate — alignment is a bonus only |
| 会试 | none → **score capped at PR3_MET_CAP** / partial +12 / full +24 | Misalignment caps score below threshold |
| 殿试 | none → **score capped at PR3_PAL_CAP** / partial +12 / full +24 | Same gate; competitive ranking makes it even more punishing |

PR3_MET_CAP target ≈ 55 (below the 75 threshold). PR3_PAL_CAP target ≈ 50.

**This makes court-intel (socialize/scheme) mechanically required for 会试/殿试.**

### New Free-Text Score Formula

```
raw_score = judge_lm_score * 0.55
          + erudition * W_ERUDITION
          + relic_exam_bonus
          + variance

score = clamp(raw_score, 0, 100)
```

The Judge (E2) already evaluates alignment in its rubric, so no explicit alignment
term. The alignment gate still applies: if the Judge's alignment dimension score is
below a threshold (PR3-tuned), the engine caps the final score the same way.

### Cheat Sheet interaction (updated)

With cheat sheet active: `erudition * W_ERUDITION` becomes `erudition * W_ERUDITION * 2`.
All other terms unchanged. Exposure chance/penalty unchanged.

### Palace Rival Rescale

`getRivalStrength` is recalibrated so gen-1 rivals are competitive:

| dynasty_generation | rival_strength | score range |
|-------------------|---------------|-------------|
| 1 | moderate | 55–80 |
| 2 | moderate | 55–80 |
| 3–4 | strong | 65–90 |
| ≥5 | elite | 75–95 |

(Old: gen 1–2 = weak 40–65. New: gen 1 rivals already score in the 55–80 band,
making a first-gen 状元 require near-perfect play + luck.)

---

## Origin Skill Kits (This Iteration)

Each origin ships a small skill kit (passives + 1 signature active). These replace
the old single-trait description and are implemented as `Skill` objects (see
data-model.md). The old trait names are preserved as the passive skill name.

| Origin | Passive skill(s) | Signature active | Active cost | Cooldown |
|--------|-----------------|------------------|-------------|----------|
| 寒门孤儿 | 囊萤映雪: `action_cost(study, drive, 0)` — study costs 0 drive | 悬梁刺股: this season's study erudition gain ×2 | Drive -8 | 1 exam cycle |
| 耕读之家 | 宗族荫庇: `exam_threshold(provincial, -5)` | 族中相助: next event check gets +5 modifier | Wealth -5 | 1 exam cycle |
| 盐商庶子 | 铜臭难洗: `dice_modifier(social, -2)` (social checks harder) | 挥金如土: immediately gain 3 random shop relics to pick from | Wealth -20 | 1 exam cycle |
| 没落官宦 | 旧日荣光: start with 1 patron NPC (affinity 30) | 故交旧识: reveal one court_whims dimension fully | Fortune -10 | 1 exam cycle |

### Skill acquisition beyond origin

Skills can also be granted by:
- Events (reward field)
- Mentor NPC (affinity ≥ 70 → teaches a skill)
- Exam milestones (first 秀才 → a passive; first 举人 → a passive)
- Rare relics (some relics grant a skill on pickup)

Max skills per character: 6 (prevents unbounded stacking).

---

## Action Differentiation (This Iteration)

Each action now has a distinct strategic payoff beyond raw stat changes. The stat
ranges in the table above remain (with the `[min, max]` authoring contract preserved);
these are the **additional** per-action mechanics:

| Action | Additional mechanic | Why it matters for exams |
|--------|-------------------|------------------------|
| Study (读书) | 10% chance per season to trigger an academic relic draft (3-choose-1) | Relics with `exam_score` effects |
| Socialize (交游) | Reveals `emperor_temperament` (partial/full per existing rules) + 15% social relic draft | Intel for alignment gate + social relics |
| Scheme (钻营) | Reveals `style` (per existing rules) + 20% powerful-but-risky relic draft; dice check for exposure | Intel for alignment gate + high-risk relics |
| Earn (营生) | Accumulates wealth → unlocks **merchant shop** (spend wealth on relics/tools) | Wealth = purchasing power for build |
| Rest (休养) | 15% chance to gain 灵感 timed buff (+5 exam_score for 4 turns) | Timed exam boost |

### Merchant Shop

Available when `wealth ≥ 15`. Presents 3 relics (seeded from a pool, refreshed each
exam cycle). Costs wealth to purchase. Gives 营生 a concrete exam-relevant payoff.

---

## World / Era Modifiers (This Iteration)

Low-probability run/era-level modifiers that bias event categories or outcomes.
Implemented as `Modifier` objects in `world.world_modifiers` (source.type = "world").

### Trigger

At era start (including game start), roll:
```
world_modifier_chance = 0.30   // 30% chance an era has a world modifier
```

If triggered, pick one from the era's pool (seeded RNG):

| Era | Possible modifiers |
|-----|-------------------|
| Prosperity | 天降祥瑞 (opportunity weight ×1.5) · 文风鼎盛 (study gain +1) |
| Decline | 世道艰难 (misfortune weight ×1.5) · 党争激烈 (scheme exposure +5%) |
| Invasion | 兵燹四起 (misfortune weight ×1.8, danger ×1.5) · 流离相护 (event dice +2) |
| Restoration | 百业渐兴 (earn wealth +3) · 中兴求贤 (county/provincial/metropolitan threshold −3) |

Surfaced to the player at era start. Persists until next era change.

---

## Mourning & Catastrophe (This Iteration)

### Mourning (守孝 / 丁忧)

Triggered by a "parent death" misfortune event (generated by V1 when character
age ≥ 30 and no prior mourning this generation; ~15% of misfortune events for
eligible characters).

Effect: `Modifier { id: "mourning", effect: action_block(["socialize","scheme"]), turns_remaining: 12 }`

- Blocks socialize and scheme for 12 turns (3 years)
- Can study, earn, rest
- **夺情特许 blessing** (if unlocked): skips mourning entirely (modifier not applied)

### Catastrophe (灾祸)

Triggered by severe misfortune events (flood, war, plague — V1 generates these in
decline/invasion eras with ~10% of misfortune events).

Effect:
- Immediate stat penalty (Erudition -5, Fortune -12, Drive -10, Wealth -10)
- Grants `catastrophe_survivor` modifier (permanent, no effect — used for blessing-point achievement check)
- Grants a **rare relic** (thematic: 劫后余生 — survival-themed effect)

---

## Blessing Wiring (This Iteration — fixes 5 inert blessings)

All 8 blessings now emit typed Effects via the effect engine. The 3 that already
worked are noted; the 5 newly wired ones are marked.

| Blessing | Effect(s) | Status |
|----------|----------|--------|
| 家学渊源 | `meta(starting_erudition, +20)` | was working |
| 过目不忘 | `action_gain(study, erudition, +2)` | **newly wired** |
| 行贿有方 | `meta(scheme_exposure, -0.05)` + `dice_modifier(scheme, +3)` | **newly wired** |
| 官场人脉 | `action_gain(socialize, fortune, +3)` + `dice_modifier(social, +2)` | **newly wired** |
| 夺情特许 | `meta(skip_mourning, 1)` — engine checks this before applying mourning | **newly wired** |
| 命硬 | `meta(max_age, +10)` | was working |
| 祖产丰厚 | `meta(starting_wealth, +20)` | was working |
| 商道传家 | `action_gain(earn, wealth, +5)` | **newly wired** |

---

## Roll-able Diverse Starts (This Iteration)

Generation 1 character creation produces a randomized starting package:

```
1. Player chooses origin (as before)
2. Engine applies origin modifiers + origin skill kit
3. Engine rolls a "starting package" (seeded):
   - Stat jitter: Erudition -2..+4, Fortune -5..+8, Drive -6..+4, Wealth +0..+8
   - One bonus starting relic (common rarity, from a gen-1 pool of ~10)
   - One bonus skill from the generic skill catalog
   - One bonus trait from the starting-trait pool (`早慧`, `胆大`, `谨慎`, `善记`, `耐劳`)
   - Initial court_whims are rolled (as before)
4. Player sees the full package + seed number
5. Player may REROLL (re-seeds, re-rolls everything in step 3)
6. Same seed always produces the same package (deterministic)
```

Generation 2+ keeps the inheritance-driven flow (no reroll — the heir IS the reroll).
