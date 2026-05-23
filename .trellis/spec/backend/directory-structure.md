# Backend Directory Structure

> How server-side code is organized. Greenfield target — follow this when scaffolding.

---

## Layout

```
lib/
├── game/                  # Domain model — single source of truth for shape
│   ├── schema.ts          # Zod schemas + inferred types: GameState, Character, World, Dynasty, Npc, CurrentEvent
│   └── constants.ts       # Enums + tables: eras, titles + values, origins, blessing categories
├── engine/                # "Dead code" — deterministic rules. NO IO, NO LLM, NO Date.now()/Math.random()
│   ├── rng.ts             # Seeded PRNG built from GameState.rng_seed
│   ├── balance.ts         # Formulas from game-design/balance.md (stat changes, diminishing returns, drive decay)
│   ├── exam.ts            # Thresholds, fixed/free-text scoring, palace ranking
│   ├── lineage.ts         # Fertility, child survival, num_heirs, max_age
│   ├── inheritance.ts     # Legacy tokens, blessing points, heir starting stats
│   └── reducer.ts         # advanceSeason / applyEventChoice / resolveExam — (state, action) => state
├── ai/                    # LLM service layer — one module per contract in game-design/ai-contracts.md
│   ├── providers.ts       # Multi-provider config: OpenAI SDK instances with baseURL swap per provider
│   ├── client.ts          # callLLM() wrapper: tier→provider routing, timeout, retry, JSON parse + Zod validate
│   ├── schema.ts          # Zod output schemas (E1/E2/E3/V1/V2/N1/R1/I1)
│   ├── prompts.ts         # Templates from game-design/prompt-library.md (versioned)
│   └── contracts/
│       ├── examQuestion.ts   # E1
│       ├── judge.ts          # E2
│       ├── palaceRivals.ts   # E3
│       ├── event.ts          # V1
│       ├── eventEval.ts      # V2
│       ├── npcDialogue.ts    # N1
│       ├── narrate.ts        # R1
│       └── heirs.ts          # I1
├── db/                    # Supabase client + queries
│   ├── client.ts          # createClient() — @supabase/ssr server client factory
│   └── queries.ts         # Typed functions: loadSave, upsertSave, topScores, recordVictory
├── actions/               # Next.js Server Actions — the only mutation API
│   └── game.ts            # newGame, advanceTurn, submitExamAnswer, chooseHeir, useTool
└── log.ts                 # Structured logging

app/
└── api/                   # Route handlers — ONLY for streaming or webhooks, not CRUD
    └── ai/stream/route.ts # (optional) streaming narration
```

## Module rules

- **`lib/engine/` is pure.** A function there takes plain data and returns plain data. If you reach for `fetch`, `Date.now()`, `Math.random()`, or the DB inside `engine/`, you're in the wrong layer. Randomness comes only from `engine/rng.ts` seeded by `GameState.rng_seed` (reproducible runs).
- **`lib/ai/` never mutates state.** Contracts return validated narrative/deltas; the engine applies them (game-design/data-model.md: "AI never mutates state directly").
- **`lib/actions/` is the orchestrator** and the only place the three layers meet. Typical action: `load (db) → generate (ai) → apply (engine) → persist (db) → return DTO`.
- **One file per AI contract**, named by role, with the contract ID in a header comment (`// E2 — game-design/ai-contracts.md`).

## Naming

- Files: `camelCase.ts` for modules; `kebab-case` only for route segments.
- Engine functions: verbs — `applyEventChoice`, `scoreFreeText`, `rollHeirs`.
- Types: `PascalCase`, defined once in `lib/game/schema.ts` and imported everywhere (front and back).

## Where things go (quick map)

| You're adding... | Put it in |
|------------------|-----------|
| A new balance formula | `lib/engine/balance.ts` (+ Vitest case) |
| A new AI call | `lib/ai/contracts/<name>.ts` + Zod schema + prompt + fallback |
| A new persisted field | `lib/game/schema.ts` (shape) — the save blob auto-carries it; migrate only if it's a leaderboard column |
| A new player operation | `lib/actions/game.ts` |
