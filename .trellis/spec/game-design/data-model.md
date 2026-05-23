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
    "gender": "male",  // see core-loop.md "Design Decisions > Gender" for rationale
    "origin": "humble_scholar | farming_family | merchant_son | official_decline",
    "origin_effects_applied": true,

    "stats": {
      "erudition": 20,
      "fortune": 10,
      "drive": 100,
      "wealth": 5
    },

    "titles": [],
    "exam_history": [
      { "level": "county", "year": 1042, "result": "fail", "score": 35 },
      { "level": "palace", "year": 1050, "result": "pass", "score": 88, "rank": 1, "title": "状元", "rivals": [{ "name": "赵文渊", "score": 72 }, { "name": "钱伯谦", "score": 68 }] }
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
    ],

    "family": {
      "spouse": { "npc_id": "uuid", "married_year": 1045, "fertile_until_year": 1062 },
      "children": [
        { "name": "陈伯川", "born_year": 1046, "is_son": true, "alive": true }
      ]
    }
  }
}
```

### Stat Boundaries

| Stat | Min | Max | Zero Effect |
|------|-----|-----|-------------|
| Erudition | 0 | 100 | Cannot sit for any exam |
| Fortune | -50 | 100 | Negative = actively cursed (bad events guaranteed) |
| Drive | 0 | 100 | Triggers inheritance (generation ends) |
| Wealth | 0 | 200 | Cannot afford exam travel or bribes |

### Lifespan & Family Fields

- `max_age` is rolled at character creation (formula in balance.md > Lifespan). Reaching it triggers natural death and ends the generation (core-loop.md > Inheritance triggers).
- `family.spouse` is `null` until the one-time `Marry` action; `family.children` accumulates sons born during the fertility window. Only `is_son: true` children that are `alive` become heir candidates at inheritance. Birth / survival / heir-count rules live in balance.md > Fertility & Lineage.
- `exam_history` entries for `level: "palace"` additionally carry the engine-computed `rank` (1–4), `title` (状元/榜眼/探花/进士), and a `rivals` score snapshot.
- Title prestige order is a shared engine constant, not per-screen display
  logic. Use `TITLE_RANK` / `highestTitleOf()` from `lib/game/constants.ts`
  whenever computing "highest title"; palace rank order is
  状元 > 榜眼 > 探花 > 进士.

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

    "court_whims_revealed": {
      "style_known": false,
      "temperament_known": "hidden | partial | full",
      "temperament_eliminated": []
    },

    "events_this_era": [],
    "exam_schedule": {
      "next_county": 1043,
      "next_provincial": 1044,
      "next_metropolitan": 1045
    },

    "auxiliary_tools": {
      "cheat_sheet_used_this_cycle": false,
      "insider_tip_used_this_cycle": false,
      "mentor_plea_used_this_cycle": false,
      "current_exam_cycle_start_year": 1042
    }
  }
}
```

### Era Transitions

Era transitions are evaluated deterministically by the engine during inheritance (see balance.md > Era Transition Rules). The `dynasty.last_era_change_generation` field tracks when the last transition occurred; the engine uses seeded RNG to decide timing (forced at 3+ generations, 50% chance at exactly 2) and next era (constrained Markov chain: prosperity→decline/invasion, decline→invasion/restoration, invasion→restoration, restoration→prosperity).

When era changes:
- `world.era` updates to the new era
- `court_whims` rerolls completely (style + emperor_temperament)
- `court_whims_revealed` resets to all-hidden
- `dynasty.last_era_change_generation` updates to current generation
- New event pools become available
- Exam difficulty curve adjusts (era_modifier in balance.md)
- AI prompt templates switch to era-appropriate tone
- NPC era-change rules apply (see NPC Handling on Era Change below)

---

## Dynasty (Meta-Progression) State

```json
{
  "dynasty": {
    "family_name": "string",
    "total_generations": 3,
    "highest_title_ever": "举人",
    "last_era_change_generation": 0,

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

`Npc.role` and `character.relationships[].type` are related but not
interchangeable. `role` may be `"friend"` for flavor NPCs; relationship `type`
must stay one of `"mentor" | "rival" | "spouse" | "patron"`. Creating a friend
NPC must not fabricate a mentor relationship, because `mentor_plea` gates on a
real mentor relationship with affinity.

### NPC Memory Cap

Each NPC stores a maximum of **10 memory entries**. When a new memory would exceed the cap, the oldest entry with the weakest sentiment is dropped. This prevents unbounded state growth in long runs.

### NPC Handling on Era Change

When an era transition occurs:
- NPCs with `role: examiner` are **replaced** (new court, new examiners)
- NPCs with `role: mentor | patron` have a **50% chance of dying** (age/war/political purge)
- NPCs with `role: spouse | friend` **persist** (family endures)
- NPCs with `role: rival` **persist with memory reset** (old grudges fade in new times)
- All surviving NPCs gain a memory entry: `{"event": "era_change", "sentiment": "uncertain"}`

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
