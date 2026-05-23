# Backend Quality Guidelines

> The architecture has one load-bearing invariant: **the engine owns numbers, the AI owns prose.** Most rules here protect it.

---

## Forbidden

- ❌ **LLM deciding a number that affects outcomes.** Scores, stat deltas, thresholds, rankings come from `lib/engine/`. The AI proposes narrative + *suggested* deltas; the engine validates/clamps/decides (game-design/data-model.md design principle).
- ❌ **IO or nondeterminism in `lib/engine/`** — no `fetch`, `Date.now()`, `Math.random()`, DB. Use seeded `engine/rng.ts`.
- ❌ **Trusting LLM JSON** without `Zod.parse`.
- ❌ `any`, non-null `!` on LLM/DB data, `@ts-ignore`.
- ❌ Business logic inside server actions or route handlers — they orchestrate; logic lives in `engine/`.

## Required

- ✅ Every AI contract has a Zod output schema **and** a fallback (no exceptions — ai-contracts.md lists both for each).
- ✅ Engine functions are pure and total: same input → same output; clamp to the bounds in data-model.md (Stat Boundaries).
- ✅ Cross-layer shape comes from `lib/game/schema.ts` only (never re-declare `GameState`).
- ✅ Respect the rate limit: ≤ 5 AI calls per player action (ai-contracts.md Global Constraints).

## Testing (Vitest)

- **Engine/balance: mandatory unit tests.** Encode the worked examples from balance.md as cases — e.g. "Erudition 80 study → +2.3", "drive_loss at age 40 = 2", "free-text answer ceiling = 70", "palace ranking sorts player+3 rivals by score". These tests are the spec's executable contract: if a test contradicts balance.md, reconcile them — don't delete the test.
- **AI layer:** test with a mocked `aiClient` — assert (1) valid output parses, (2) malformed output triggers the fallback, (3) the prompt includes required grounding fields.
- **DB:** round-trip a `GameState` through `upsertSave`/`loadSave`, including a corrupted-blob case.

## Code review checklist

- [ ] No number decided by the LLM
- [ ] New AI call has schema + fallback + telemetry log
- [ ] Engine change is pure + has a Vitest case tied to balance.md
- [ ] Boundaries Zod-validated (LLM output, save load, action input)
- [ ] ≤ 5 AI calls per player action
