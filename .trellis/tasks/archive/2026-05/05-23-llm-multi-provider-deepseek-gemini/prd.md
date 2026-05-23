# Multi-Provider LLM Abstraction — DeepSeek + Gemini API Integration

## Goal

Build the `lib/ai/` layer: a self-written multi-provider LLM client using the `openai` npm package with `baseURL` swap. Wire up DeepSeek V4 (primary) and Gemini 3.5 Flash (fallback), validate end-to-end with one real AI contract (V1: random event generation). This unblocks all 8 AI contracts defined in game-design/ai-contracts.md.

## What I already know

* Stack decision (locked): self-written multi-provider via `openai` npm package + `baseURL` swap — NOT Vercel AI SDK (user preference due to DeepSeek quirks)
* Three abstract tiers: Low (`deepseek-v4-flash`), Mid (`deepseek-v4-pro`), High (`deepseek-v4-pro` + thinking for E2)
* Fallback for all tiers: `gemini-3.5-flash`
* DeepSeek known issue: system prompts can cause unexpected behavior — workaround is merging system instructions into first user message (handled per-provider in `lib/ai/client.ts`)
* DeepSeek thinking + JSON: reasoning goes to a separate `reasoning_content` field so `content` stays parseable JSON (verified 2026-05-23); E2 (High tier) keeps thinking on, other tiers disable it. Gemini thinking, by contrast, truncates the JSON unless disabled.
* Directory structure defined in spec: `lib/ai/{providers.ts, client.ts, schema.ts, prompts.ts, contracts/}`
* pcg_contest_10 has a reference implementation using Vercel AI SDK — useful for provider registry + fallback patterns, but we're NOT using AI SDK here
* Environment variables: `DEEPSEEK_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`
* All providers expose OpenAI-compatible endpoints (DeepSeek natively; Gemini via OpenAI-compat mode)

## Requirements

### R0: Minimal Next.js Scaffolding

* `npx create-next-app@latest` with: TypeScript strict, App Router, Tailwind CSS, ESLint, pnpm
* Create base directory skeleton: `lib/ai/`, `lib/engine/`, `lib/game/`, `lib/db/`, `lib/actions/`, `lib/log.ts`
* Add dependencies: `openai`, `zod`
* Add dev dependencies: `vitest`, `tsx`
* Create `.env.local.example` with required env var placeholders
* This is mechanical scaffolding — no game logic, no UI beyond the default Next.js page

### R1: Provider Configuration (`lib/ai/providers.ts`)

* Define provider registry with: id, label, baseURL, default model per tier, env var names
* Two providers for v1: `deepseek` (primary), `gemini` (fallback)
* Tier → model mapping configurable in one place
* Runtime check for configured API keys

### R2: LLM Client (`lib/ai/client.ts`)

* `callLLM(tier, messages, options)` — the single entry point all contracts use
* Uses `openai` npm package with per-provider `baseURL` swap
* Options: `temperature`, `maxTokens`, `timeoutMs`, `responseFormat` (json_object or text)
* DeepSeek system-prompt workaround: if provider is DeepSeek, merge system message into first user message
* Timeout handling: abort after `timeoutMs` (default from ai-contracts.md per tier)
* Retry: 1 retry on transient errors (5xx, timeout), then throw for contract-level fallback
* JSON parse + Zod validation is NOT in client.ts — that's per-contract responsibility

### R3: Fallback Routing

* If primary provider (DeepSeek) fails after retry → automatically try fallback (Gemini) once
* Fallback is transparent to the contract caller — same return type
* Log which provider served the response (for telemetry)

### R4: Zod Output Schemas (`lib/ai/schema.ts`)

* Define Zod schemas for V1 (random event) output — the validation contract
* Other schemas (E1-E3, V2, N1, R1, I1) are out of scope for this task but the file structure should accommodate them

### R5: End-to-End Validation Script

* A minimal test script (or Vitest test) that calls `callLLM` with a V1-style prompt and validates the response against the Zod schema
* Proves: API key works, provider routing works, JSON output parses, Zod validates
* Should work with `npx tsx scripts/test-llm.ts` or `pnpm test lib/ai`

## Acceptance Criteria

* [ ] Next.js project scaffolded with TypeScript strict, builds cleanly (`pnpm build`)
* [ ] `lib/ai/` directory structure matches spec
* [ ] `callLLM("low", messages)` successfully calls DeepSeek and returns valid JSON
* [ ] `callLLM("mid", messages)` successfully calls DeepSeek with correct model
* [ ] If DeepSeek is unavailable/errors, fallback to Gemini works transparently
* [ ] DeepSeek system-prompt workaround is applied automatically
* [ ] V1 output validates against Zod schema
* [ ] Timeout aborts the request after the configured budget
* [ ] Provider selection is logged (structured JSON via `lib/log.ts` pattern)

## Definition of Done

* Next.js project scaffolded, `pnpm build` passes, directory skeleton in place
* `lib/ai/providers.ts`, `client.ts`, `schema.ts` exist and are type-safe
* At least one contract (`contracts/event.ts` for V1) demonstrates the full pattern
* Test/script proves end-to-end connectivity with real API keys
* No Vercel AI SDK dependency — pure `openai` npm package

## Out of Scope

* Other 7 AI contracts (E1-E3, V2, N1, R1, I1) — separate task
* Prompt templates (`prompts.ts`) beyond what V1 needs
* Streaming support (only needed for optional R1 streaming, future task)
* Game engine integration
* Database/persistence layer
* Frontend

## Technical Notes

### Verified against live APIs (2026-05-23, direct `openai` SDK v6 probe with the project's real keys)

* **Model IDs are all real/stable** — `deepseek-v4-flash`, `deepseek-v4-pro`, `gemini-3.5-flash`. (DeepSeek's older `deepseek-chat`/`deepseek-reasoner` are being deprecated 2026-07-24, mapping to v4-flash non-thinking/thinking.)
* **Both providers default thinking-ON** — must be disabled for the fast JSON contracts:
  * DeepSeek: pass top-level `thinking: { type: "disabled" }` (the openai SDK forwards this non-standard field; verified honored). With thinking on, reasoning lands in a separate `reasoning_content` field so `content` stays clean JSON — but ~5s latency.
  * Gemini: pass `reasoning_effort: "none"` (clean, ~3s). Without it, hidden reasoning consumes the `max_tokens` budget and the visible JSON is **truncated** → parse failure. (`extra_body.google.thinking_config.thinking_budget: 0` also works.)
* **JSON output**: DeepSeek = `response_format: { type: "json_object" }` only (no json_schema); prompt MUST contain the word "json" + an example, and `max_tokens` must be generous; DeepSeek may occasionally return empty content → treat as retry/fallback trigger. Gemini supports json_object + structured outputs, but its OpenAI-compat layer is beta (unknown params silently ignored).
* **System role works** via the direct openai SDK — the pcg_contest_10 system-prompt quirk was an AI-SDK-adapter issue and does NOT reproduce here. Keep the merge-into-first-user-message workaround only as a documented fallback.
* **Latency observed**: DeepSeek non-thinking ~5s, Gemini non-thinking ~2-3.5s. The ai-contracts.md Low-tier soft budget (1.5s) sits below DeepSeek's floor → expect frequent "slow call" warns; the 10s hard timeout means no spurious fallback. (Telemetry note, not a blocker.)

### Endpoints & client

* `openai` npm package works with any OpenAI-compatible endpoint via `baseURL`.
* DeepSeek: `baseURL: https://api.deepseek.com`, key `DEEPSEEK_API_KEY`.
* Gemini OpenAI-compat: `baseURL: https://generativelanguage.googleapis.com/v1beta/openai/`, key `GOOGLE_GENERATIVE_AI_API_KEY`.
* Reference (multi-provider patterns, NOT the SDK choice): `/Users/haor/Learning/1_Projects/pcg-contest/pcg_contest_10/src/lib/ai/` — registry shape, fallback ordering, typed errors (`ProviderConfigError` / `AllProvidersFailedError`), retryable-error detection. It uses Vercel AI SDK; we use the `openai` package directly.

## Open Questions

* ~~What are the actual DeepSeek V4 model IDs available via API?~~ **Resolved 2026-05-23**: `deepseek-v4-flash` / `deepseek-v4-pro` are real and live (probed with the project keys).
