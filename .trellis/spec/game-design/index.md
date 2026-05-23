# Game Design Spec: The Epochal Laurel (百世流芳)

> AI-native generational roguelike set in China's imperial examination system.

---

## Elevator Pitch

A text-based roguelike where your family spends generations trying to pass the hardest test in history. Each life is a run — study, socialize, survive random fate, and face the exam. Die or burn out, and your son inherits your books, land, and unfinished dreams.

---

## Design Pillars

1. **Lightweight daily choices with deep consequences** — Persona-style seasonal action selection, not hardcore essay writing
2. **Generational weight** — You are your grandfather's sequel and your grandson's prelude
3. **AI-native unpredictability** — Every event, exam question, and NPC interaction is unique per run

---

## Core Fantasy

The player experiences the emotional arc of "a family's multi-generational obsession with social mobility through examination" — the hope, the absurdity, the sacrifice, and the question of whether it was all worth it.

---

## Target Experience

- **Tone**: Light-hearted surface (black humor, absurd events) with philosophical undertones
- **Session length**: 15-30 minutes per generation, 3-5 generations per full run
- **Pacing**: Quick seasonal turns with occasional high-stakes exam moments
- **Replayability**: Different eras, starting conditions, and AI-generated events ensure no two runs are alike

---

## NOT List (Explicit Exclusions)

- NOT a hardcore classical Chinese literature quiz game
- NOT a visual novel with branching paths (it's a roguelike with systems)
- NOT historically accurate simulation (inspired by, not bound to, real dynasties)
- NOT requiring the player to write actual classical Chinese
- NOT a grinding/idle game — every choice should feel meaningful

---

## Reference Games

| Game | What to borrow | What to avoid |
|------|---------------|---------------|
| Persona series | Seasonal time management as core loop | Excessive length per cycle |
| Chinese Parents (中国式家长) | Scheduling actions, exam as checkpoint | Late-game repetition, shallow events |
| Rogue Legacy | Generational inheritance with traits | Pure action combat (irrelevant) |
| Qingjiaosimuqi (青椒模拟器) | Fixed numerics + AI-generated narrative | Late-game event repetition, lack of meta-progression |
| Massive Chalice | Bloodline strategy, attachment to dynasty | Over-complex character tracking |
| Hades | Meta-progression that expands options not power | Action gameplay (irrelevant) |

---

## Guidelines Index

| Guide | Description |
|-------|-------------|
| [Core Loop](./core-loop.md) | Game states, seasonal actions, exam flow |
| [Data Model](./data-model.md) | Authoritative JSON schema for all game state |
| [Balance](./balance.md) | Numerical formulas, thresholds, curves |
| [AI Contracts](./ai-contracts.md) | Every AI call point: input/output schema, model selection |
| [Prompt Library](./prompt-library.md) | Reusable prompt templates for all AI generation |

---

**Language**: All spec content in English. In-game text generated in Chinese (Simplified).
