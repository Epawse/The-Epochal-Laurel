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

## Auxiliary Tools (改命道具)

Players can activate special tools that provide tactical advantages at a cost. These give the "cheating thrill" and sense of agency over fate.

### Tool List

| Tool | Cost | Effect | Risk |
|------|------|--------|------|
| 小抄/夹带 (Cheat Sheet) | Fortune -10 | Next exam: Erudition counted as doubled for score calculation | 15% chance of exposure → exam ban 1 cycle + Drive -20 |
| 榜眼引路 (Insider Tip) | Wealth -15 | Reveals which fixed choice (A/B/C) best matches current Court Whims | None (pure information purchase) |
| 恩师引荐 (Mentor's Plea) | Requires mentor NPC with affinity ≥ 60 | After exam failure: triggers a "re-review" with threshold reduced by 15 | Mentor affinity -20 (burned social capital); one-time per exam cycle |

### Activation Rules

- Each tool can only be used **once per exam cycle** (3-year period)
- 小抄 must be activated BEFORE the exam (during preparation season)
- 榜眼引路 can be activated anytime court_whims is partially or fully hidden
- 恩师引荐 can only be activated AFTER a failed exam result, before the next season advances
- Tools are NOT available in 殿试 (Palace Exam) — that's the emperor's domain, no shortcuts

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

### Palace Exam Special Mechanic (殿试对战)

The Palace Exam (殿试) is unique — it's a **competitive** exam, not just a threshold check.

Flow:
1. AI generates the exam question (E1, same as other levels)
2. Player submits their answer (fixed choice → scored by formula; free-text → scored by the E2 Judge)
3. **3 AI rival candidates** are generated with their own answers and scores (E3), independently of the player's score to avoid anchoring bias
4. The **engine ranks all 4 candidates strictly by score** (dead code, not AI) and assigns titles: 状元 (1st), 榜眼 (2nd), 探花 (3rd), 进士 (4th)
5. The result narrator (R1) produces the emperor's comment on the winning answer

**No pass/fail threshold:** unlike lower exams, 殿试 has no threshold — entry is gated by holding the 贡士 title (from passing 会试). All four finalists receive a title, so reaching 殿试 guarantees at least 进士 (Standard Victory); historically, 贡士 were essentially never failed at the palace stage. The tension is competitive: out-scoring rivals for 状元/榜眼/探花. Rival strength scales with dynasty generation, so a late-game 状元 is genuinely hard-won.

The AI rivals have varying "strength" based on the dynasty's current generation:
- Early generations: rivals are mediocre (player advantage from accumulated blessings)
- Late generations: rivals are formidable (representing increased competition)

This creates direct competitive tension — you're not just passing a bar, you're beating opponents.

### Exam Frequency

Exams happen on fixed intervals (every 3 years historically). The player can choose to skip an exam cycle to prepare more, but this costs Drive (心气 -10 per skip due to aging anxiety).

---

## Children & Lineage

Heirs come from the player's own life, not thin air.

- **Marriage**: `Marry` is a one-time action (requires Fortune ≥ 15, Wealth ≥ 10). Once married, sons may be born over the following years. The spouse NPC can also surface in events.
- **Sons**: only sons continue the exam line (see Design Decisions > Gender). Each son born must survive childhood; historically about half did not, so a large brood is never guaranteed.
- **At inheritance**, surviving sons (capped at 3) become the heir candidates you choose from. Their traits blend inheritance (nature) and the family's accumulated blessings (nurture).
- **Sonless lines**: a character who never married, or whose sons all died, reaches inheritance with no heir. A dynasty with enough standing (Reputation ≥ 20) may **adopt** a kinsman's son (reduced inheritance); otherwise the **family line dies out** and the run ends.

Numerical rules (birth chance, child survival by era, heir count, adoption threshold) live in balance.md > Fertility & Lineage.

---

## Inheritance Phase

Triggered when:
- Drive (心气) reaches 0 (burnout/despair/old age)
- Age reaches `max_age` (natural death — the hard lifespan ceiling; see balance.md > Lifespan)
- A death event occurs (illness, war, execution)
- Player voluntarily retires (rare, requires high Fortune)

### Inheritance Flow

1. **Legacy calculation**: Convert current stats/items into inheritance tokens
2. **Heir selection**: Choose from your surviving sons (1-3 candidates, fleshed out by AI Contract I1 with traits). If sonless, an adopted heir may be offered, or the line ends — see Children & Lineage above
3. **Ancestral Blessing spending**: Use accumulated tokens to unlock permanent upgrades
4. **Era check**: Engine evaluates era transition (deterministic formula in balance.md > Era Transition Rules; transitions every 2-3 generations via seeded RNG)
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

- **Standard Victory**: Any descendant achieves 进士 rank (4th place in Palace Exam)
- **Perfect Victory**: Any descendant achieves 状元 rank (1st place in Palace Exam)
- **Extended play**: After any victory, player can continue for legendary dynasty achievements (连中三元, 父子同榜, etc.)
- **Failure**: Family line dies out (no surviving sons and no adoption available at inheritance) or 10 generations pass without achieving 举人+

When the player chooses extended play after a palace-exam victory, route through
the same inheritance handoff as death-triggered transitions using an
`InheritanceTrigger` of `"victory"`. The handoff must populate
`inheritance_data` before navigating to `/inherit`; if no heir/adoption is
available, preserve the already-earned victory tier for leaderboard scoring
rather than converting the run to an F-tier failure.

### Victory Tiers (for scoring/leaderboard)

| Tier | Condition | Score Multiplier |
|------|-----------|-----------------|
| S | 状元 in ≤ 3 generations | x3.0 |
| A | 状元 in any generation | x2.0 |
| B | 进士 in ≤ 3 generations | x1.5 |
| C | 进士 in any generation | x1.0 |
| D | 举人 but never 进士 (10 gen limit) | x0.5 |
| F | Family line dies out | x0.0 |

---

## Key Visual/Animation Moments

These are the high-impact moments that need dedicated visual treatment (not just text). They drive the emotional payoff.

| Moment | Visual Treatment | Sound | Priority |
|--------|-----------------|-------|----------|
| Exam pass (中举) | Full-screen "捷报" banner, screen shake, confetti particles | Drums + firecrackers | P0 |
| Exam fail (落第) | Screen dims, rain effect, text fades to grey | Somber string | P0 |
| Inheritance (传承) | Slow fade to black, ancestor portrait added to family tree | Bell toll | P0 |
| Era change | Dramatic wipe transition, new color palette loads | Thunder/wind | P1 |
| Scheme exposure | Red flash, "东窗事发" stamp | Gavel slam | P1 |
| Palace exam ranking | Scroll unrolling animation revealing names top-to-bottom | Tension → triumph/defeat | P1 |
| Blessing unlock | Golden glow on family tree, new node appears | Chime | P2 |
| Drive reaches 0 | Gradual desaturation over last 3 turns, final collapse | Silence → heartbeat fade | P2 |

---

## Design Decisions

### Gender

All playable characters are male. This is a deliberate design choice reflecting the historical constraint that only men could sit for imperial examinations. The game does NOT claim historical accuracy in other areas, but this specific constraint is load-bearing for the core fantasy (the weight of patrilineal expectation, "光宗耀祖").

Female NPCs exist as spouses, mothers, and patrons — they influence the dynasty's fate through events and relationship mechanics, but are not playable exam candidates.

If future versions want to explore female scholars (historically rare but documented), this would be a distinct game mode or DLC, not a toggle.

---

## Pacing Target

| Phase | Target Duration | Feel |
|-------|----------------|------|
| One season turn | 15-30 seconds | Quick, snappy |
| One exam | 2-3 minutes | Tense, high-stakes |
| One generation | 15-25 minutes | Complete arc |
| Full run (to victory) | 60-90 minutes | Satisfying session |
