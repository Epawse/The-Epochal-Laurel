# Backend Development Guidelines

> Server-side conventions for The Epochal Laurel (百世流芳). Stack: **Next.js (App Router) + TypeScript**, server-side game engine + LLM orchestration, **Supabase (Postgres)**, deployed on **Vercel**.

---

## Status: pre-implementation conventions

This project is greenfield — no application code exists yet. These guidelines are **forward-looking conventions** the first implementers (and the `trellis-implement` / `trellis-check` sub-agents) must follow. They are derived from the chosen stack and the authoritative game-design spec under [`../game-design/`](../game-design/). Refine them against real code as it lands; if code and spec ever disagree, fix one of them — don't let them drift.

## Stack decisions (locked for v1)

| Concern | Choice |
|---------|--------|
| Runtime / framework | Next.js App Router, TypeScript (`strict`), deployed on Vercel |
| API surface | Server Actions (`lib/actions/`) for mutations; route handlers (`app/api/`) only for streaming/webhooks |
| Game engine | Pure deterministic TS in `lib/engine/` — no IO, no LLM (game-design: "dead code controls numbers") |
| LLM | Self-written multi-provider via `openai` npm package + `baseURL` swap; default provider DeepSeek V4 (`deepseek-v4-pro` / `deepseek-v4-flash`); fallback `gemini-3.5-flash`; switch providers by changing `lib/ai/providers.ts` config |
| Validation | Zod at every boundary — especially parsing LLM output before the engine trusts it |
| Database | **Supabase** (managed Postgres) — save blobs stored as JSONB, leaderboard as relational columns |
| Auth | Anonymous sessions via Supabase (no login required — hackathon QR-code trial play) |
| Logging | Structured JSON via `lib/log.ts` |

## The three server layers (never blur them)

1. **Engine** (`lib/engine/`) — owns all numbers. Deterministic, seeded, unit-tested. Implements `game-design/balance.md`. Never calls the LLM or the DB.
2. **AI service** (`lib/ai/`) — calls LLMs via `openai` SDK with provider-specific `baseURL`. Returns *narrative + proposed deltas*, never mutates state. Every call Zod-validates output and falls back on failure. Provider/model is selected per-contract via `lib/ai/providers.ts`.
3. **Persistence** (`lib/db/`) — Supabase client; stores the save JSON blob + leaderboard. Knows nothing about game rules.

**Server Actions** (`lib/actions/`) orchestrate the three: load state → generate narrative (AI) → apply (engine) → persist → return DTO to the client.

## Guidelines Index

| Guide | Description |
|-------|-------------|
| [Directory Structure](./directory-structure.md) | Where engine / AI / db / actions code lives |
| [Database Guidelines](./database-guidelines.md) | Supabase schema, save blobs, leaderboard, migrations |
| [Error Handling](./error-handling.md) | LLM failures → fallback; validation errors; action error envelopes |
| [Logging Guidelines](./logging-guidelines.md) | AI-call telemetry, turn/seed reproducibility |
| [Quality Guidelines](./quality-guidelines.md) | Engine purity, mandatory unit tests, forbidden patterns |

---

**Language**: All code, comments, and docs in English. In-game generated text is Simplified Chinese, produced in the AI layer.
