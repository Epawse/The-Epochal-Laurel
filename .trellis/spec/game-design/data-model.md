# Data Model

> Authoritative JSON schema for all game state. Every LM call MUST receive relevant portions of this state as grounding context. The game engine owns this state — AI never mutates it directly.

---

## Design Principle

**Dead code controls numbers. AI controls narrative.**

The game engine maintains a single JSON object as the source of truth. AI generates text, events, and dialogue but returns structured deltas that the engine validates and applies. If AI output conflicts with state, the engine wins.

---

## Character State

```json
{
  "character": {
    "id": "uuid",
    "name": "string",
    "generation": 1,
    "age": 16,
    "max_age": 65,
    "gender": "male",
    "origin": "humble_scholar | farming_family | merchant_son",

    "stats": {
      "erudition": 20,
      "fortune": 10,
      "drive": 100
    },

    "titles": [],
    "exam_history": [
      { "level": "county", "year": 1042, "result": "fail", "score": 35 }
    ],

    "relationships": [
      { "npc_id": "uuid", "type": "mentor | rival | spouse | patron", "affinity": 50 }
    ],

    "inventory": [
      { "item_id": "string", "name": "考官文集", "effect": "court_whims_reveal", "quantity": 1 }
    ],

    "traits": ["勤勉", "体弱"],
    "status_effects": [
      { "type": "mourning", "turns_remaining": 12 }
    ]
  }
}
```

### Stat Boundaries

| Stat | Min | Max | Zero Effect |
|------|-----|-----|-------------|
| Erudition | 0 | 100 | Cannot sit for any exam |
| Fortune | -50 | 100 | Negative = actively cursed (bad events guaranteed) |
| Drive | 0 | 100 | Triggers inheritance (generation ends) |

---

## World State

```json
{
  "world": {
    "era": "prosperity | decline | invasion | restoration",
    "era_year": 3,
    "dynasty": "string",
    "year": 1042,
    "season": "spring | summer | autumn | winter",

    "court_whims": {
      "style": "pragmatic | ornate | orthodox | radical",
      "intensity": 70,
      "emperor_temperament": "ambitious | lazy | paranoid | benevolent"
    },

    "events_this_era": [],
    "exam_schedule": {
      "next_county": 1043,
      "next_provincial": 1044,
      "next_metropolitan": 1045
    }
  }
}
```

### Era Transitions

Eras shift every 2-3 generations (or triggered by specific events). When era changes:
- `court_whims` rerolls completely
- New event pools become available
- Exam difficulty curve adjusts
- AI prompt templates switch to era-appropriate tone

---

## Dynasty (Meta-Progression) State

```json
{
  "dynasty": {
    "family_name": "string",
    "total_generations": 3,
    "highest_title_ever": "举人",

    "legacy": {
      "books": 45,
      "land": 30,
      "reputation": 15,
      "ancestral_blessings": [
        { "id": "string", "name": "家学渊源", "effect": "starting_erudition_+20", "unlocked_gen": 2 }
      ]
    },

    "ancestors": [
      {
        "name": "string",
        "generation": 1,
        "highest_title": "秀才",
        "cause_of_end": "drive_zero",
        "notable_achievement": "string",
        "years_lived": "1020-1068"
      }
    ],

    "blessing_points": 50,
    "available_blessings": [
      { "id": "string", "name": "行贿有方", "cost": 30, "effect": "scheme_success_+15%", "unlocked": false }
    ]
  }
}
```

### Blessing Categories

| Category | Examples | Effect Type |
|----------|---------|-------------|
| Academic | 家学渊源, 过目不忘 | Starting stats boost |
| Social | 行贿有方, 官场人脉 | Action success rate boost |
| Survival | 夺情特许, 命硬 | Event mitigation |
| Wealth | 祖产丰厚, 商道传家 | Starting resources |

---

## NPC State

```json
{
  "npcs": [
    {
      "id": "uuid",
      "name": "string",
      "role": "mentor | examiner | rival | spouse | patron | friend",
      "personality": "strict | warm | corrupt | idealistic",
      "era_introduced": "prosperity",
      "generation_introduced": 2,
      "alive": true,
      "memory": [
        { "event": "player helped during flood", "sentiment": "grateful", "turn": 45 }
      ]
    }
  ]
}
```

NPCs persist within a generation. Cross-generation NPCs (e.g., a long-lived mentor) are rare and marked explicitly.

---

## Event State (Transient)

```json
{
  "current_event": {
    "id": "uuid",
    "type": "opportunity | misfortune | social | political",
    "title": "string",
    "description": "string (AI-generated)",
    "choices": [
      {
        "id": "a",
        "label": "string",
        "stat_changes": { "erudition": -5, "fortune": 20 },
        "risk": null,
        "narrative_hint": "string"
      }
    ],
    "allows_free_input": true,
    "context_for_judge": { "relevant_npcs": [], "relevant_items": [] }
  }
}
```

---

## Save Format

The complete game state is the union of all above objects:

```json
{
  "version": "1.0.0",
  "character": { ... },
  "world": { ... },
  "dynasty": { ... },
  "npcs": [ ... ],
  "current_event": null,
  "turn_number": 45,
  "rng_seed": 12345
}
```

This entire object (or relevant subset) is injected into every AI call as grounding context.
