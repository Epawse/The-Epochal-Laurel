# Logging Guidelines

> Structured JSON via `lib/log.ts`. The most valuable logs here are **AI-call telemetry** and **reproducibility keys**.

---

## Format

One JSON object per line: `{ ts, level, event, ...fields }`. `event` is a dotted name (`ai.call`, `ai.fallback`, `turn.advance`, `db.save`).

## Levels

| Level | Use for |
|-------|---------|
| `debug` | full prompts/outputs (dev only, redacted in prod) |
| `info` | turn advance, exam result, AI-call summary, save written |
| `warn` | AI fallback taken, slow call (over latency budget), recoverable validation miss |
| `error` | engine invariant violation, DB failure, unhandled action error |

## Always log every AI call

The spec defines per-contract latency budgets and fallbacks — you can only tune them if you measure them:

```ts
log.info("ai.call", {
  contract: "E2",
  model: "deepseek-v4-flash",
  latencyMs,
  fallbackUsed: false,
  inputTokens,
  outputTokens,
});
```

Watch `fallbackUsed` rate per contract (target: low) and `latencyMs` against the budgets in ai-contracts.md (E1 3s, E2/E3 5s, V1/N1/R1 1.5s).

## Reproducibility

Log `turn_number` and `rng_seed` on `turn.advance`. A bug report plus the seed must let you replay the exact run — the engine is deterministic on the seed.

## What NOT to log

- ❌ `ANTHROPIC_API_KEY` or any secret.
- ❌ Full prompts/outputs at `info`/`warn` (large, and may contain the whole game state) — `debug` only.
- The game has no real PII; don't introduce any.
