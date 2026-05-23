# AI Contracts

> Defines every point where the game engine calls an LLM. Each contract specifies: purpose, input schema, output schema, model tier, fallback behavior, and constraints.

---

## Design Principle

**AI is a service, not a controller.** The game engine calls AI like a function — structured input in, structured output out. AI never sees raw game state without the engine choosing what to expose. AI never mutates state directly.

---

## Call Points Overview

| ID | Purpose | Frequency | Model Tier | Latency Budget |
|----|---------|-----------|-----------|----------------|
| E1 | Exam question generation | Per exam | Mid (Sonnet) | 3s |
| E2 | Free-text answer evaluation (Judge) | Per free-text submission | High (Sonnet/Opus) | 5s |
| E3 | Palace exam rival answers + ranking | Per palace exam only | High (Sonnet/Opus) | 5s |
| V1 | Random event generation | Per season (20% chance) | Low (Haiku) | 1.5s |
| V2 | Event free-input evaluation | Per free-input choice | Mid (Sonnet) | 3s |
| N1 | NPC dialogue generation | Per NPC interaction | Low (Haiku) | 1.5s |
| R1 | Result narration | Per exam/event resolution | Low (Haiku) | 1.5s |
| I1 | Heir generation | Per inheritance | Mid (Sonnet) | 3s |

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
      "risk": "may offend emperor"
    },
    {
      "id": "c",
      "label": "string",
      "alignment": "none | partial | full",
      "base_score": 70,
      "risk": "high exposure if court_whims mismatch"
    }
  ],
  "free_input_hint": "string (subtle hint about what a creative answer could address)"
}
```

### Constraints
- Question MUST relate to the current era context
- Choices MUST have different risk/reward profiles (not all safe or all risky)
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
Use the highest-tier model available. Accuracy here directly impacts player experience. Temperature: 0.3 (low variance for fairness).

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
  "player_answer": "string (player's submitted answer — already evaluated by E2)",
  "player_score": 75,
  "court_whims": { "style": "...", "emperor_temperament": "..." },
  "dynasty_generation": 3,
  "era": "prosperity | decline | invasion | restoration",
  "rival_strength": "weak | moderate | strong"
}
```

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
  ],
  "final_ranking": [
    { "rank": 1, "name": "string", "title": "状元", "is_player": false },
    { "rank": 2, "name": "string", "title": "榜眼", "is_player": true },
    { "rank": 3, "name": "string", "title": "探花", "is_player": false },
    { "rank": 4, "name": "string", "title": "进士", "is_player": false }
  ],
  "emperor_comment": "string (1 sentence — the emperor's remark on the top answer)"
}
```

### Constraints
- Rival scores MUST be generated BEFORE seeing player_score to avoid bias (in practice: prompt instructs model to generate rivals independently, then rank all 4)
- `rival_strength` determines score ranges:
  - weak: rivals score 40-65
  - moderate: rivals score 55-80
  - strong: rivals score 70-95
- `final_ranking` MUST include exactly 4 entries, one with `is_player: true`
- Ranking MUST be strictly by score (highest = 状元)
- Rival names MUST be distinct and era-appropriate
- `emperor_comment` MUST be under 50 characters

### Rival Strength Determination
```
rival_strength = "weak" if dynasty_generation <= 2
               = "moderate" if dynasty_generation <= 4
               = "strong" if dynasty_generation >= 5
```

### Model Selection
Use high-tier model (Sonnet/Opus). Temperature: 0.5 (some variety in rivals but fair ranking).

### Fallback
If AI call fails: generate 3 rivals with scores = [player_score - 10, player_score - 5, player_score + 5]. Player gets 榜眼 (2nd place) by default — safe but not triumphant.

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
If AI call fails: draw from a static event pool (20 generic events per era).

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
  "num_heirs": 3
}
```

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

### Fallback
If AI call fails: generate heirs procedurally (random name + random traits from static pool).

---

## Global Constraints (All Calls)

1. **Temperature**: 0.7 default, 0.3 for Judge (E2), 0.9 for narration (R1)
2. **Max tokens**: 500 per call (most outputs are short)
3. **Timeout**: 10 seconds hard limit, fallback triggers at timeout
4. **Rate limiting**: Max 5 AI calls per player action. A "player action" = one seasonal turn OR one exam attempt. Breakdown:
   - Normal season (no event): 0-1 calls (action narration is optional)
   - Season with event: V1 + optional V2 + optional N1 = 1-3 calls
   - Exam turn: E1 + E2 + R1 = 3 calls (exam is its own action, not combined with daily life)
   - Palace exam: E1 + E3 + R1 = 3 calls
   - Inheritance: I1 + R1 = 2 calls
5. **Context injection**: Always include relevant game state as system context
6. **Language**: All AI output in Simplified Chinese unless player language setting differs
7. **Content safety**: No graphic violence, no sexual content, no modern political references
