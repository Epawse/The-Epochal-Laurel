# 随机事件 AI 主笔化与零等待

## Background

Analysis + a live `pnpm test:llm` probe (2026-05-24) of the daily-loop random-event flow found:

- **No waiting feedback**: random events are generated synchronously inside `advanceTurn` (`lib/actions/game.ts`), bundled into one round-trip. The client only disables the action cards (`ActionCard` opacity) during `isPending` — no spinner, no in-world loading, stale narration stays on screen. By contrast the exam page shows a full-screen "考官正在出题…" loader, so it *feels* responsive even though it is also slow.
- **~5–6s real latency**: measured DeepSeek `deepseek-v4-flash` (non-thinking) V1 call ≈ 5852ms; Gemini fallback ≈ 5190ms. The ai-contracts V1 soft budget (1.5s) sits far below reality. Thinking-mode is NOT faster (it only adds reasoning tokens) — confirmed not a lever.
- **AI output frequently discarded**: in the probe BOTH providers' V1 JSON failed validation (DeepSeek emitted a `check` missing `outcomes`; Gemini emitted trailing content after the JSON), so `generateEvent` silently degraded to the small static pool (~6 hand-authored templates). Net: the player waited ~6s and received a canned event. The spec already mandates "Zod validation + retry on parse failure" (ai-contracts.md) but `event.ts` does NOT retry — it falls straight to static.
- **AI authority is large but unguarded**: a working V1 event authors the title/description/choice labels AND the numeric stakes — `choice.stat_changes`, the dice `dc`, and all four `check.outcomes` tables are applied verbatim by the engine (`reducer.ts` `applyEventChoiceWithResult`, lines 336/339/347), clamped only at the final stat boundary. `StatChangesSchema` has NO per-delta bound, so the model can emit out-of-spec swings (spec caps V1 at ±15).

Decision (user, 2026-05-24): keep AI as the **primary author** of random events (variety is core to the "AI-driven 科举 life-sim" identity) and **eliminate perceived wait** via background lookahead. Updated direction (2026-05-24): do **action-aware lookahead** instead of blind 4-type prefetch. During player think-time, simulate currently available daily actions with the real engine; only actions whose simulated next state would trigger an event get an AI-authored event cached under that action. This keeps AI participation high while avoiding wasted calls for event types that the next player action cannot use.

## Goals

Delivered in 3 sequenced, independently-verifiable steps.

### Step 1 — V1 robustness + numeric guardrails (spec-compliance)
1. On V1 Zod/JSON parse failure, **retry once** (re-call the model) before degrading to the static pool — bring `generateEvent` into line with the ai-contracts "Zod validation + retry on parse failure" mandate.
2. Harden `extractJsonObject` to tolerate markdown code fences and trailing non-JSON content after the first balanced object (fixes the observed Gemini "non-whitespace after JSON" failure).
3. Add **per-contract** stat-delta guardrails matching the spec: V1 choice `stat_changes` and every `check.outcomes` entry bounded to ±15; V2 (`eventEval`) bounded to ±20. **Do NOT bound the shared `StatChangesSchema` base type** — it is reused by the engine and by V2/exam penalty paths with different caps; bound at the V1/V2 contract schemas (e.g. a bounded variant or `superRefine`) so the base type stays unbounded.
4. Tighten the PT-V1 prompt so that any choice carrying a `check` MUST include all four `crit_success/success/fail/crit_fail` outcome tables (fixes the observed DeepSeek missing-`outcomes` failure).
5. Treat an empty or structurally incomplete V1 `check` as `check: null` instead of discarding the whole AI event. Complete-but-invalid checks still fail validation, preserving numeric guardrails while reducing unnecessary static fallback.

### Step 2 — Split the turn so the loop never freezes
6. Split `advanceTurn` so the synchronous engine result (stat deltas, season, dice, `eventTrigger` type, `schemeExposed`, death) returns **immediately with no LLM on the critical path**. Persist a lightweight `pending_event_type` marker on the state instead of generating the event inline. Move the `socialize` NPC-dialogue (N1) call off the critical path the same way.
7. Add a new server action `generateEventForTurn(saveId)` that produces the AI event for the pending type, writes `current_event`, clears the marker, persists, and returns it.
8. Client (`app/(game)/play/page.tsx`): on a turn that returns a pending event, animate engine deltas instantly and immediately open the event modal in a **diegetic loading state**, then call `generateEventForTurn` and fill the modal when content arrives. Mirror the exam's labeled-wait UX.
9. `EventModal`: add an in-world loading/skeleton state (e.g. "事起…" + shimmer title + greyed choice slots) per `frontend/motion-patterns.md`; never a bare spinner, never a frozen frame.

### Step 3 — Action-aware lookahead (eliminate the modal wait without waste)
10. After each idle point (initial load, after a turn settles, after an event/relic resolves), background-generate V1 events only for currently available daily actions whose deterministic lookahead would trigger an event. Cache entries by action id with the simulated event type, simulated turn, season, and era.
11. `advanceTurn` stamps both `pending_event_type` and `pending_event_action_id`; `generateEventForTurn` serves from `event_cache[actionId]` instantly when the stamped action/type/turn/season/era match. On miss/stale entry, live-generate (Step 2 path) as graceful fallback.
12. Lookahead MUST simulate the exact daily action with `advanceSeason` on a cloned state and the current RNG seed, then generate the event against the simulated post-action state. This preserves AI relevance to the actual outcome while keeping the live turn engine authoritative.
13. Persist each action lookahead as soon as it finishes instead of waiting for the full batch, and let `generateEventForTurn` briefly consume a matching in-flight lookahead result directly. This avoids the worst case where the player clicks while prefetch is almost complete and the app starts a duplicate 6-8s live V1 call.
14. Treat `free_input_context: null` as an empty string in V1 output. This field is display guidance only, so a missing hint must not force a retry or static fallback.

## Non-Goals
- No provider/model swap and no thinking-mode changes (settled: not a latency lever).
- No change to whether/which event type triggers — that stays engine-owned (`eventChancePerSeason` / `rollEventType`).
- No rework of the exam loading flow (already acceptable); only the daily-loop event flow.
- No narrative-log redesign (the earlier "scrollable log" idea is out of scope here; this task is latency + AI-authoring reliability).

## Acceptance Criteria
- `npm run typecheck`, `npm test`, `npm run lint` pass (or pre-existing blockers documented).
- Clicking a daily action returns engine results (stat ticks, season change) with no frozen frame; if an event triggers, a loading modal appears immediately and fills with AI content — verified in a browser smoke test.
- V1 parse/Zod failure triggers one retry before static fallback; `extractJsonObject` survives fenced + trailing-content responses (add unit tests covering both).
- V1 incomplete `check` objects are coerced to `null`, so an otherwise valid AI event is not lost solely because the optional dice-check payload is partial.
- V1 choice / `check.outcomes` deltas are rejected by Zod when any single delta exceeds ±15; V2 still allows up to ±20 (add schema tests). The shared `StatChangesSchema` base remains unbounded.
- On a triggered event, the served event comes from the action-aware lookahead cache on a cache hit (assert via telemetry/log or a test seam); cache miss falls back to live generation without error.
- If the matching action lookahead is already in flight, `generateEventForTurn` waits briefly and consumes that result without issuing a duplicate V1 call when the stamps match.
- V1 `free_input_context: null` is coerced to `""`, so missing optional guidance does not discard AI-authored event content.
- A re-run of `pnpm test:llm` shows V1 JSON validating (or documents residual model flakiness).

## Spec deltas to record (via trellis-update-spec, after implementation)
- ai-contracts.md V1: realistic latency note (~5–6s raw; prefetch hides it), the "retry once on parse failure" now enforced, and the per-delta ±15 guardrail now schema-enforced.
- ai-contracts.md "Rate limiting": action-aware lookahead adds background calls only for simulated actions that would actually trigger events, outside the synchronous action budget, while the synchronous per-trigger budget drops toward 0 on cache hit. Document this deliberate AI-participation/latency tradeoff.
- ai-contracts.md/data-model.md: per-action lookahead entries can be persisted incrementally and matching in-flight lookahead can be consumed directly to avoid duplicate live calls.
