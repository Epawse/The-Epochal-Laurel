# Core Loop

## Game States

```
[Character Creation] → [Daily Life Loop] → [Examination] → [Result]
                              ↑                                 |
                              |                                 v
                              ←──── [Continue] ←──── [Pass/Fail]
                                                         |
                                                         v (心气=0 or death)
                                                   [Inheritance]
                                                         |
                                                         v
                                                [Next Generation]
                                                         |
                                                         v
                                              [Character Creation]
```

---

## Time Unit: Season (季)

Each generation progresses in **seasons** (Spring/Summer/Autumn/Winter). One year = 4 seasons. A typical generation spans 10-40 years (40-160 turns) depending on lifespan and events.

Each season, the player selects **1-2 actions** from available options. Actions consume time and affect stats.

---

## Daily Life Loop (Main Gameplay)

This is the primary gameplay. Light, quick decisions with cumulative weight.

### Action Categories

| Category | Examples | Primary Stat Affected |
|----------|---------|----------------------|
| Study (读书) | Read classics, practice calligraphy, study exam essays | Erudition ↑, Drive ↓ |
| Socialize (交游) | Visit mentor, attend poetry gathering, befriend officials | Fortune ↑, Erudition ↑ (small) |
| Earn (营生) | Tutor children, manage family shop, sell calligraphy | Family Wealth ↑, Erudition ↓ |
| Rest (休养) | Recuperate, travel, enjoy family | Drive ↑, nothing else |
| Scheme (钻营) | Buy examiner's works, bribe gatekeepers, seek patron | Fortune ↑↑, Risk of exposure |

### Action Availability

Not all actions are always available. Conditions:
- Some require minimum stats (e.g., "Attend poetry gathering" needs Erudition ≥ 30)
- Some require items or relationships (e.g., "Visit mentor" needs an established mentor NPC)
- Some are era-dependent (e.g., "Sell calligraphy" unavailable during wartime)
- Some are one-time per generation (e.g., "Marry")

### Random Events

After each action, there is a chance (base 20%, modified by Fortune) of triggering a **random event**. Events are AI-generated based on current state. Categories:

| Type | Examples | Frequency |
|------|---------|-----------|
| Opportunity | Imperial grace exam, patron offers sponsorship | Rare |
| Misfortune | Parent dies (forced mourning), flood destroys books | Uncommon |
| Social | Marriage proposal, rival scholar challenges you | Common |
| Political | Court faction shift, new emperor ascends | Rare, era-changing |

Events present 2-3 choices (AI-generated) plus an optional free-text input slot for creative solutions.

---

## Examination Phase (Boss Battle)

Triggered when the player chooses to sit for an exam AND meets minimum requirements.

### Exam Levels

| Level | Requirement | Difficulty | Reward |
|-------|------------|-----------|--------|
| 童试 (County) | Age ≥ 15, Erudition ≥ 20 | Low | Title: 秀才 |
| 乡试 (Provincial) | Title: 秀才, Erudition ≥ 50 | Medium | Title: 举人 |
| 会试 (Metropolitan) | Title: 举人, Erudition ≥ 80 | High | Title: 贡士 |
| 殿试 (Palace) | Title: 贡士 | Very High | Title: 进士/状元 |

### Exam Flow

1. **AI generates exam question** based on era + court whims + exam level
2. **Player responds** via:
   - Option A/B/C (pre-generated strategic choices with different risk/reward)
   - Free-text input (player writes their own answer — evaluated by Judge LM)
3. **Judge LM evaluates** → returns structured score
4. **Score compared to threshold** (modified by Fortune, Court Whims alignment)
5. **Result narrated** by AI with dramatic flair

### Exam Frequency

Exams happen on fixed intervals (every 3 years historically). The player can choose to skip an exam cycle to prepare more, but this costs Drive (心气 -10 per skip due to aging anxiety).

---

## Inheritance Phase

Triggered when:
- Drive (心气) reaches 0 (burnout/despair/old age)
- A death event occurs (illness, war, execution)
- Player voluntarily retires (rare, requires high Fortune)

### Inheritance Flow

1. **Legacy calculation**: Convert current stats/items into inheritance tokens
2. **Heir selection**: Choose from 1-3 available heirs (AI-generated with traits)
3. **Ancestral Blessing spending**: Use accumulated tokens to unlock permanent upgrades
4. **Era check**: Determine if era shifts (every 2-3 generations)
5. **New generation begins** with inherited baseline + chosen starting conditions

### What Inherits

| Asset | Inheritance Rate | Notes |
|-------|-----------------|-------|
| Books/Library | 80% | Core knowledge base |
| Land/Wealth | 60% | Can be lost to events |
| Reputation/Connections | 30% | Decays fast |
| Titles (秀才/举人) | 0% | Must re-earn each generation |
| Ancestral Blessings | 100% | Permanent meta-progression |

---

## Win/End Conditions

- **Victory**: Any descendant achieves 进士 or 状元 rank
- **Extended play**: Continue after victory for higher achievements (院士 equivalent, legendary dynasty)
- **Failure**: Family line dies out (no heirs) or 10 generations pass without achieving 举人+

---

## Pacing Target

| Phase | Target Duration | Feel |
|-------|----------------|------|
| One season turn | 15-30 seconds | Quick, snappy |
| One exam | 2-3 minutes | Tense, high-stakes |
| One generation | 15-25 minutes | Complete arc |
| Full run (to victory) | 60-90 minutes | Satisfying session |
