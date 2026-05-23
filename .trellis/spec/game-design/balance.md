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
| Scheme (钻营) | 0 | +5~10 | -3 | -3~5 | 15% exposure risk |

Ranges indicate randomness (uniform distribution within range).

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

```
activation_cost: Fortune -10
effect: erudition_bonus uses (erudition * 2) instead of erudition in the score formula
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

```
exposure_chance = 0.15 - (fortune * 0.001)  // min 5%, max 15%
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
