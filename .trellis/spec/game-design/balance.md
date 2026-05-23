# Balance Formulas

> All numerical rules that govern game progression. These are **dead code** — implemented as deterministic functions, never delegated to AI. AI generates narrative around these numbers but cannot override them.

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
drive_loss_per_year = max(1, (age - 30) / 10)
```

- Age 16-30: -1/year (0.25/season)
- Age 40: -2/year
- Age 60: -4/year

This creates natural generational pressure without arbitrary death timers.

---

## Exam Scoring

### Pass Threshold Formula

```
threshold = base_threshold + (attempt_number * 5) - fortune_bonus

fortune_bonus = fortune / 10
```

| Exam Level | Base Threshold | Max Score |
|-----------|---------------|-----------|
| 童试 (County) | 40 | 100 |
| 乡试 (Provincial) | 60 | 100 |
| 会试 (Metropolitan) | 75 | 100 |
| 殿试 (Palace) | 85 | 100 |

### Player Score Calculation

For **fixed choices** (A/B/C):
```
score = choice_base_value + erudition_bonus + court_whims_alignment

erudition_bonus = erudition * 0.3
court_whims_alignment = 0 | 10 | 20  (none / partial / full match)
```

For **free-text input**:
```
score = judge_lm_score * 0.6 + erudition * 0.3 + court_whims_alignment * 0.1

judge_lm_score: 0-100 (returned by Judge LM)
```

### Court Whims Alignment

The player can discover court whims through:
- Buying examiner's works (reveals style preference)
- Socializing with officials (reveals emperor temperament)
- Random events (partial reveals)

Alignment scoring:
- Style match: +10
- Temperament match: +10
- Both match: +20 (not +25, capped)

---

## Inheritance Formulas

### Legacy Token Calculation

On generation end:
```
books_inherited = character.erudition * 0.8
land_inherited = character.wealth * 0.6
reputation_inherited = max(character.fortune * 0.3, highest_title_value * 10)
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
- Had 3+ children: +10

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
difficulty_modifier = generation_number * 2
```

Later generations face slightly harder exams but have more accumulated blessings to compensate.

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
