# AI Contracts

> Defines every point where the game engine calls an LLM. Each contract specifies: purpose, input schema, output schema, model tier, fallback behavior, and constraints.

---

## Design Principle

**AI is a service, not a controller.** The game engine calls AI like a function — structured input in, structured output out. AI never sees raw game state without the engine choosing what to expose. AI never mutates state directly.

---

## Call Points Overview

| ID | Purpose | Frequency | Model Tier | Latency Budget |
|----|---------|-----------|-----------|----------------|
| E1 | Exam question generation | Per exam | Mid | 3s |
| E2 | Free-text answer evaluation (Judge) | Per free-text submission | High (thinking) | 5s |
| E3 | Palace exam rival candidate generation (engine ranks) | Per palace exam only | High | 5s |
| V1 | Random event generation | Per season (20% chance) | Low | 1.5s |
| V2 | Event free-input evaluation | Per free-input choice | Mid | 3s |
| N1 | NPC dialogue generation | Per NPC interaction | Low | 1.5s |
| R1 | Result narration | Per exam/event resolution | Low | 1.5s |
| I1 | Heir generation | Per inheritance | Mid | 3s |

### Model Tier Mapping (configured in `lib/ai/providers.ts`)

The game uses three abstract tiers. The concrete provider/model is configured in one place and can be switched without touching contract code.

| Tier | Default Model | Thinking | Use Case | Fallback |
|------|--------------|----------|----------|----------|
| Low | `deepseek-v4-flash` | off | Fast generation: events, NPC dialogue, narration | `gemini-3.5-flash` |
| Mid | `deepseek-v4-pro` | off | Structured generation: exam questions, evaluations, heirs | `gemini-3.5-flash` |
| High | `deepseek-v4-pro` | on (E2 only) | Critical evaluation requiring reasoning depth | `gemini-3.5-flash` |

**Switching providers**: change `lib/ai/providers.ts`. All providers expose OpenAI-compatible endpoints — the `openai` npm package with `baseURL` swap handles the wire protocol. Contracts call a unified `callLLM()` wrapper regardless of which provider backs the tier. Environment variables (`DEEPSEEK_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`) select credentials.

**E2 thinking mode caveat**: DeepSeek V4's thinking mode can interfere with JSON output. For E2 (Judge), enable thinking mode but instruct the model to output JSON after its reasoning, then post-process to extract and Zod-parse the JSON from the response content. All other contracts use non-thinking mode + `response_format: { type: "json_object" }` for reliable structured output, with Zod validation + retry on parse failure.

**Known issue**: DeepSeek has quirks with system prompt handling (observed in pcg_contest_10 project). If system prompts cause unexpected behavior, merge system instructions into the first user message as a workaround. This is handled inside `lib/ai/client.ts` per-provider.

---

## E1: Exam Question Generation

### Purpose
Generate a contextually appropriate exam question based on era, court whims, and exam level.

### Input
```json
{
  "exam_level": "county | provincial | metropolitan | palace",
  "era": "prosperity | decline | invasion | restoration",
  "court_whims": {
    "style": "pragmatic | ornate | orthodox | radical",
    "emperor_temperament": "ambitious | lazy | paranoid | benevolent"
  },
  "year": 1042,
  "character_erudition": 45,
  "previous_questions_this_run": ["..."]
}
```

### Output Schema
```json
{
  "question_text": "string (the exam prompt, in classical Chinese style)",
  "topic_category": "governance | ethics | military | economics | philosophy",
  "difficulty_hint": "string (internal note for choice generation)",
  "choices": [
    {
      "id": "a",
      "label": "string (choice description)",
      "alignment": "full | partial | none",
      "base_score": 40,
      "risk": null
    },
    {
      "id": "b",
      "label": "string",
      "alignment": "partial | none | full",
      "base_score": 55,
      "risk": {
        "condition": "temperament_mismatch",
        "description": "may offend emperor",
        "penalty": { "drive": -10, "fortune": -5 }
      }
    },
    {
      "id": "c",
      "label": "string",
      "alignment": "none | partial | full",
      "base_score": 70,
      "risk": {
        "condition": "full_mismatch",
        "description": "high exposure if court_whims mismatch",
        "penalty": { "drive": -15, "fortune": -10 }
      }
    }
  ],
  "free_input_hint": "string (subtle hint about what a creative answer could address)"
}
```

#### Risk Field Schema

`risk` is either `null` (safe choice) or a structured object:

```json
{
  "condition": "temperament_mismatch | style_mismatch | full_mismatch",
  "description": "string (player-facing narrative hint, ≤ 30 chars)",
  "penalty": { "drive": -15 to 0, "fortune": -10 to 0 }
}
```

- `condition`: evaluated deterministically by the engine after scoring (see balance.md > Choice Risk Mechanics)
- `description`: shown to the player as a warning — narrative only, the engine uses `condition`
- `penalty`: applied only if the condition triggers; values must be negative or zero

### Constraints
- Question MUST relate to the current era context
- Choices MUST have different risk/reward profiles (not all safe or all risky)
- At least one choice MUST have `risk: null` (a safe option always exists)
- `base_score` range: 40-70 (higher base_score choices should carry risk; safe choices have lower base_score)
- MUST NOT repeat questions from `previous_questions_this_run`
- Language: Classical Chinese style but readable to modern Chinese speakers

### Fallback
If AI call fails: use a pre-written question from a static pool (10 questions per era/level combination).

---

## E2: Free-Text Answer Evaluation (Judge)

### Purpose
Evaluate a player's free-text exam answer against the question context. This is the most critical AI call — it determines exam outcomes.

### Input
```json
{
  "question_text": "string",
  "player_answer": "string (player's free-text input)",
  "court_whims": { "style": "...", "emperor_temperament": "..." },
  "exam_level": "string",
  "character_erudition": 45,
  "character_items": ["考官文集"],
  "rubric": {
    "relevance": "Does the answer address the question? (0-25)",
    "cleverness": "Is the approach creative or strategic? (0-25)",
    "alignment": "Does it match court_whims style/temperament? (0-25)",
    "audacity": "Does it take bold risks that could pay off? (0-25)"
  }
}
```

### Output Schema
```json
{
  "scores": {
    "relevance": 18,
    "cleverness": 22,
    "alignment": 15,
    "audacity": 20
  },
  "total_score": 75,
  "judge_narrative": "string (1-2 sentences describing the examiner's reaction)",
  "special_flags": {
    "offended_emperor": false,
    "impressed_examiner": true,
    "plagiarism_detected": false
  }
}
```

### Constraints
- `total_score` MUST equal sum of individual scores
- Each dimension score MUST be 0-25
- `judge_narrative` MUST be under 100 characters
- MUST NOT give score 0 unless answer is completely empty or gibberish
- MUST NOT give score 100 unless answer is genuinely exceptional
- If `player_answer` is empty/gibberish/off-topic: total_score ≤ 10

### Model Selection
Use the **High** tier with thinking mode enabled. Accuracy here directly impacts player experience. Temperature: 0.3 (low variance for fairness). Because thinking + JSON can be unreliable on DeepSeek V4, E2 enables thinking but extracts JSON from the response content via post-processing + Zod-parse (see Model Tier Mapping caveat above).

### Fallback
If AI call fails: score = character_erudition * 0.5 (safe middle ground).

---

## E3: Palace Exam Rival Answers + Ranking

### Purpose
Generate 3 AI rival candidate answers and rank all 4 candidates (player + 3 rivals) for the Palace Exam competitive mechanic. Only used for 殿试.

### Input
```json
{
  "question_text": "string (the palace exam question)",
  "court_whims": { "style": "...", "emperor_temperament": "..." },
  "dynasty_generation": 3,
  "era": "prosperity | decline | invasion | restoration",
  "rival_strength": "weak | moderate | strong"
}
```

> E3 deliberately does NOT receive the player's answer or score. The engine holds the player's score separately and performs ranking after E3 returns; keeping the player's score out of the model's context structurally prevents rival scores from being anchored to the player's result.

### Output Schema
```json
{
  "rivals": [
    {
      "name": "string (generated rival name)",
      "answer_summary": "string (1 sentence describing their approach)",
      "score": 72,
      "style": "conservative | bold | sycophantic | scholarly"
    },
    { "name": "...", "answer_summary": "...", "score": 68, "style": "..." },
    { "name": "...", "answer_summary": "...", "score": 80, "style": "..." }
  ]
}
```

The engine then computes the final ranking (dead code): it appends the player's score to the three rival scores, sorts descending, and assigns 状元/榜眼/探花/进士 to ranks 1–4. The resulting ranking is stored in save state (not returned by AI). The emperor's comment on the champion's answer is generated by R1 once the winner is known.

### Constraints
- E3 does NOT receive the player's answer or score — this structurally prevents the model from anchoring rival scores to the player's result
- MUST generate exactly 3 rivals
- `rival_strength` determines score ranges:
  - weak: rivals score 40-65
  - moderate: rivals score 55-80
  - strong: rivals score 70-95
- Rival scores MUST be integers
- Rival names MUST be distinct and era-appropriate
- Ranking and title assignment are performed by the engine (see Output Schema note), NOT by the model

### Rival Strength Determination

> **SUPERSEDED**: See "Contract Changes (This Iteration) > E3 Changes" below for the
> updated tiers (weak removed; moderate/strong/elite). The old formula is kept for reference.

```
rival_strength (OLD) = "weak" if dynasty_generation <= 2
                     = "moderate" if dynasty_generation <= 4
                     = "strong" if dynasty_generation >= 5
```

### Model Selection
Use the **High** tier (non-thinking). Temperature: 0.5 (some variety in rivals but fair ranking).

### Fallback
If AI call fails: generate 3 rivals procedurally — generic era-appropriate names plus scores at the midpoint of the `rival_strength` band (weak ≈ 52, moderate ≈ 67, strong ≈ 82) with small ±5 jitter. The engine ranks them against the real player score as usual, so the outcome still reflects the player's performance.

---

## V1: Random Event Generation

### Purpose
Generate a contextual life event for the current season.

### Input
```json
{
  "character": {
    "name": "string",
    "age": 35,
    "erudition": 45,
    "fortune": 20,
    "drive": 60,
    "titles": ["秀才"],
    "traits": ["勤勉"]
  },
  "world": {
    "era": "prosperity",
    "season": "autumn",
    "year": 1042
  },
  "event_type": "opportunity | misfortune | social | political",
  "recent_events": ["string (last 3 event titles to avoid repetition)"],
  "available_npcs": [{ "name": "...", "role": "..." }]
}
```

### Output Schema
```json
{
  "title": "string (≤ 10 chars)",
  "description": "string (2-3 sentences, vivid and specific)",
  "choices": [
    {
      "id": "a",
      "label": "string (≤ 20 chars)",
      "stat_changes": { "erudition": 0, "fortune": 5, "drive": -5, "wealth": 0 },
      "narrative_preview": "string (1 sentence hint of consequence)"
    },
    {
      "id": "b",
      "label": "string",
      "stat_changes": { "erudition": 5, "fortune": -5, "drive": -3, "wealth": 0 },
      "narrative_preview": "string"
    }
  ],
  "allows_free_input": true,
  "free_input_context": "string (what kind of creative solution might work here)"
}
```

### Constraints
- MUST generate exactly 2-3 choices
- stat_changes per choice: no single stat change > ±15
- MUST NOT generate events that instantly kill the character or end the run
- MUST NOT repeat titles from `recent_events`
- `description` MUST reference character name and current season/era

### Fallback
If AI call fails: draw deterministically from a static category pool using the
character name + world year + season + event type. The fallback must still satisfy
the current V1 contract: opportunity/social fallbacks may grant `relic_draft`
rewards from `available_relic_pool`, at least some fallback choices include
`check` payloads with `dc` in 6-16, and misfortune fallbacks must not grant AI
rewards. Bereavement fallback titles/descriptions should include a mourning marker
such as `讣音`, `病逝`, `丁忧`, or `守孝` so the engine's mourning hook can apply.

---

## V2: Event Free-Input Evaluation

### Purpose
Evaluate a player's creative solution to a random event.

### Input
```json
{
  "event_title": "string",
  "event_description": "string",
  "player_input": "string",
  "character_stats": { "erudition": 45, "fortune": 20, "drive": 60 },
  "character_items": ["string"],
  "available_npcs": [{ "name": "...", "role": "..." }]
}
```

### Output Schema
```json
{
  "success": true,
  "plausibility_score": 75,
  "stat_changes": { "erudition": 0, "fortune": 10, "drive": -5, "wealth": 5 },
  "narrative_result": "string (2-3 sentences describing what happened)",
  "npc_reaction": null
}
```

### Constraints
- `plausibility_score` 0-100: how logical/creative the player's solution is
- If `plausibility_score` < 30: `success` MUST be false
- stat_changes: no single change > ±20
- If player references an item they don't have: `success` = false, narrative explains why
- `narrative_result` MUST be under 200 characters

### Fallback
If AI call fails: success = true, stat_changes = {fortune: +5}, generic positive narrative.

---

## N1: NPC Dialogue Generation

### Purpose
Generate contextual NPC dialogue during social interactions.

### Input
```json
{
  "npc": {
    "name": "string",
    "role": "mentor | rival | spouse | patron",
    "personality": "strict | warm | corrupt | idealistic",
    "memory": [{ "event": "...", "sentiment": "..." }]
  },
  "character_name": "string",
  "interaction_type": "greeting | advice | request | gossip",
  "world_context": { "era": "...", "season": "..." }
}
```

### Output Schema
```json
{
  "dialogue": "string (1-3 sentences, in character voice)",
  "mood": "friendly | neutral | hostile | mysterious",
  "hint": null,
  "relationship_delta": 0
}
```

### Constraints
- `dialogue` MUST reflect NPC personality and memory
- MUST NOT break character (a strict mentor doesn't suddenly become jovial)
- `hint` is optional: can reveal court_whims or upcoming events if NPC role allows
- `relationship_delta`: -5 to +5 only

### Fallback
If AI call fails: generic dialogue based on NPC role template.

---

## R1: Result Narration

### Purpose
Generate dramatic narration for exam results and major event outcomes.

### Input
```json
{
  "event_type": "exam_pass | exam_fail | inheritance | era_change | death",
  "context": { "character_name": "...", "detail": "..." },
  "tone": "triumphant | tragic | bittersweet | comedic"
}
```

### Output Schema
```json
{
  "narration": "string (2-4 sentences, dramatic and evocative)",
  "sound_cue": "celebration | mourning | tension | neutral"
}
```

### Constraints
- MUST match requested tone
- MUST be under 300 characters
- For exam_pass: MUST include the traditional celebration imagery (锣鼓/报喜)
- For death/inheritance: MUST reference the dynasty's continuity
- For a palace exam result (殿试, passed in `context` with the final ranking): MUST include the emperor's one-line comment (御评, under 50 chars) on the champion's answer

### Fallback
If AI call fails: use pre-written narration templates (5 per event_type).

---

## I1: Heir Generation

### Purpose
Generate heir candidates for the inheritance phase.

### Input
```json
{
  "parent": {
    "name": "string",
    "traits": ["string"],
    "highest_title": "string",
    "erudition": 45
  },
  "dynasty": {
    "family_name": "string",
    "generation": 3,
    "era": "decline"
  },
  "num_heirs": 3,
  "is_adoption": false
}
```

> `num_heirs` is not chosen freely — it equals the count of surviving sons (1–3) from the lineage system (balance.md > Fertility & Lineage). When the character is sonless but the dynasty can adopt, the engine calls I1 with `num_heirs: 1` and `is_adoption: true`.

### Output Schema
```json
{
  "heirs": [
    {
      "name": "string",
      "traits": ["string", "string"],
      "personality_hint": "string (1 sentence)",
      "starting_bonus": { "stat": "erudition | fortune | drive", "value": 5 }
    }
  ]
}
```

### Constraints
- MUST generate exactly `num_heirs` candidates
- Names MUST use the dynasty family_name as surname
- Traits: 1-2 per heir, mix of positive and negative
- At least one heir should have a clear strength, one a clear weakness
- MUST NOT duplicate parent's exact trait combination
- If `is_adoption: true`: generate a single adopted heir who does NOT inherit the parent's blood traits (use clan/era-appropriate traits instead), and whose personality_hint reflects an outsider joining the lineage

### Fallback
If AI call fails: generate heirs procedurally (random name + random traits from static pool).

---

## Contract Changes (This Iteration)

### E1 Changes: Exam Question Generation

The E1 contract gains additional guidance for the new scoring system:

**New constraints on `base_score`**:
- Range remains 40–70, but the prompt MUST instruct the model that **not every
  question set should have a `full` alignment choice**. At least 30% of generated
  questions should have no `full`-aligned choice (only `partial` and `none`), forcing
  players to rely on intel + erudition rather than always having a "perfect pick".
- The highest `base_score` choice (typically 65–70) MUST carry a `risk` field. Safe
  choices (`risk: null`) are capped at `base_score ≤ 50`.

**New input field** (optional, for context):
```json
{
  "character_relics": ["string (relic names for flavor only — does NOT affect scoring)"],
  "world_modifier": "string | null (current era modifier name, for thematic flavor)"
}
```

These are flavor-only — the engine scores mechanically. They help the AI generate
thematically appropriate questions.

### V1 Changes: Random Event Generation

The V1 output schema gains two optional fields:

```json
{
  "choices": [
    {
      "id": "a",
      "label": "string",
      "stat_changes": { ... },
      "narrative_preview": "string",
      "check": {
        "stat": "fortune | erudition | drive",
        "dc": 8,
        "outcomes": {
          "crit_success": { "erudition": 0, "fortune": 15, "drive": 0, "wealth": 5 },
          "success":      { "erudition": 0, "fortune": 8, "drive": 0, "wealth": 0 },
          "fail":         { "erudition": 0, "fortune": -5, "drive": -3, "wealth": 0 },
          "crit_fail":    { "erudition": -5, "fortune": -10, "drive": -8, "wealth": 0 }
        }
      }
    }
  ],
  "reward": {
    "type": "relic_draft | skill_grant | buff",
    "relic_ids": ["id1", "id2", "id3"],
    "skill_id": null,
    "buff": null
  }
}
```

**`check`** (optional per choice): When present, the engine resolves the choice via
the dice primitive instead of applying fixed `stat_changes`. The `stat_changes` field
serves as fallback for choices without a `check`. Constraint: `dc` range 6–16;
outcome stat changes follow the same ±15 cap.

**`reward`** (optional per event): When present, the engine triggers a relic draft,
skill grant, or timed buff after the event resolves. The AI picks from a curated pool
(IDs provided in a new input field `available_relic_pool`). Constraint: reward is
offered only on `opportunity` and `social` event types; `misfortune` events do NOT
grant rewards (catastrophe relics are engine-granted, not AI-granted).

**New V1 input fields**:
```json
{
  "available_relic_pool": ["relic_id_1", "relic_id_2", ...],
  "character_skills": ["skill_name_1", ...],
  "character_relics": ["relic_name_1", ...],
  "world_modifier": "string | null"
}
```

### E3 Changes: Palace Rival Rescale

**Rival strength determination** (supersedes old formula):
```
rival_strength = "moderate" if dynasty_generation <= 2
               = "strong"   if dynasty_generation <= 4
               = "elite"    if dynasty_generation >= 5
```

**Score ranges** (updated):
| rival_strength | score range |
|---------------|-------------|
| moderate | 55–80 |
| strong | 65–90 |
| elite | 75–95 |

The `elite` tier is new. Prompt instructs the model that elite rivals should have
at least one rival scoring ≥ 85.

### R1 Changes: Narration Constraints

Preserved from the recent `f4651d8` fix — the R1 prompt MUST include:
- Do not invent rankings for 童试/乡试/会试 (threshold exams are pass/fail only)
- Ranking language (状元/榜眼/探花/进士) is allowed ONLY for 殿试 results
- For exam results with a performance roll, the narration may reference 超常发挥 or
  发挥失常 when the variance was significant (|variance| > 8)

---

## Global Constraints (All Calls)

1. **Temperature**: 0.7 default, 0.3 for Judge (E2), 0.9 for narration (R1)
2. **Max tokens**: 500 per call (most outputs are short)
3. **Timeout**: 10 seconds hard limit, fallback triggers at timeout
4. **Rate limiting**: Max 5 AI calls per player action. A "player action" = one seasonal turn OR one exam attempt. Breakdown:
   - Normal season (no event): 0-1 calls (action narration is optional)
   - Season with event: V1 + optional V2 + optional N1 = 1-3 calls
   - Exam turn: E1 + (E2 only if free-text) + R1 = 2-3 calls (fixed-choice answers are scored by formula, no E2)
   - Palace exam: E1 + (E2 only if free-text) + E3 + R1 = 3-4 calls
   - Inheritance: I1 + R1 = 2 calls
5. **Context injection**: Always include relevant game state as system context
6. **Language**: All AI output in Simplified Chinese unless player language setting differs
7. **Content safety**: No graphic violence, no sexual content, no modern political references
