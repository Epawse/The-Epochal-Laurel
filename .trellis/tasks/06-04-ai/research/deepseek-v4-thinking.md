# Research: DeepSeek V4 thinking / reasoning controls (OpenAI-compatible API)

- **Query**: Does `deepseek-v4-flash` support graduated reasoning-effort tiers or only binary thinking on/off? flash vs pro reasoning/latency; does CoT go to `reasoning_content` (not eating `max_tokens`)? Is there a Gemini-3.5-Flash-style fast "standard thinking"? Recommended config for a fast structured-JSON judge call.
- **Scope**: external (official DeepSeek API docs) + internal cross-check (`lib/ai/providers.ts`, `lib/ai/contracts/judge.ts`)
- **Date**: 2026-06-04
- **Sources** (all official, fetched 2026-06-04, "Copyright © 2026 DeepSeek, Inc."):
  - Your First API Call — https://api-docs.deepseek.com/ (lists `deepseek-v4-flash` / `deepseek-v4-pro`; shows `thinking` + `reasoning_effort` together)
  - Thinking Mode guide — https://api-docs.deepseek.com/guides/thinking_mode
  - Models & Pricing — https://api-docs.deepseek.com/quick_start/pricing
  - API Reference (Create Chat Completion) — https://api-docs.deepseek.com/api/create-chat-completion
  - (Predecessor reasoning doc, now superseded) Reasoning Model — https://api-docs.deepseek.com/guides/reasoning_model

> Note on tools: the task asked for Exa MCP search, but `mcp__exa__*` tools were not available in this agent's tool set. I went straight to the **primary source** (official DeepSeek docs via `curl`), which is more authoritative than Exa for this question. Version uncertainty is therefore **low** — V4 docs are live and explicit.

---

## TL;DR (answers to the 5 questions)

1. **No graduated effort tiers like Gemini.** DeepSeek V4 exposes `reasoning_effort`, **but its only real values are `high` and `max`.** `low`/`medium` are silently **mapped to `high`**, and `xhigh`→`max`. There is **no "fast/standard/light thinking" middle tier** and **no `none`** via `reasoning_effort`. The only way to get a faster/lighter path is the **binary** `thinking: {type: "disabled"}` switch (non-thinking mode). So: the project's current model — binary `thinking` for DeepSeek vs graduated `reasoning_effort` for Gemini — is correct. `reasoning_effort` is accepted by DeepSeek but **cannot dial reasoning down below `high`.**
2. **Both flash and pro are reasoning-capable; both default to thinking ON.** `deepseek-v4-flash` *is* reasoning-capable (it is literally the successor of `deepseek-reasoner`). `pro` is the larger/heavier model (3–3.1× input cost, ~3.1× output cost, 5× lower concurrency limit). Official docs publish **no per-call latency**; the only latency data is the **project's own measurement** (v4-pro E2 thinking call timing out at the 10 s abort). Expect flash thinking to be faster than pro thinking, but **still a full CoT pass** — likely too slow for a hard 10 s budget with non-trivial output.
3. **Yes — confirmed for V4.** In thinking mode the CoT is returned in **`reasoning_content`**, "at the same level as `content`." `content` stays the clean final answer (clean JSON when `response_format` json_object is used). CoT does **not** consume the `max_tokens` *content* budget the way Gemini's hidden reasoning does. (`max_tokens` does still cap total generation, but you size it for the answer, not the reasoning — the PRD's note is correct.)
4. **No.** DeepSeek has **no light-but-on "standard thinking" tier**. Once thinking is enabled, effort is `high` (or `max`); there is no Gemini-3.5-Flash-style "light reasoning + fast content" setting. For a ~5–10 s structured-JSON call, your two DeepSeek options are: **(a) thinking ON at `high`** (quality, but slow → needs a bigger timeout) or **(b) thinking `disabled`** (fast ~5–6 s, no CoT).
5. **Recommended (see "Recommended Config").** For a hard ~5–10 s judge call, `deepseek-v4-flash` with **`thinking: disabled`** + strict JSON prompt is the reliable fast path. If you want CoT quality, keep thinking ON but **raise the timeout to ~18–20 s** (matches PRD方案 A/C) — `high` effort cannot be lowered to fit 10 s. Flash is adequate for exam-answer judging when given a well-structured rubric prompt; reserve `pro` for cases where flash's judgments are demonstrably too shallow.

---

## Findings

### Model family (Models & Pricing)

| | `deepseek-v4-flash` | `deepseek-v4-pro` |
|---|---|---|
| Model version | DeepSeek-V4-Flash | DeepSeek-V4-Pro |
| Thinking mode | non-thinking **and** thinking (**default**) | non-thinking **and** thinking (**default**) |
| Context length | 1M | 1M |
| Max output | 384K | 384K |
| JSON Output / Tool Calls / Chat Prefix (Beta) | ✓ / ✓ / ✓ | ✓ / ✓ / ✓ |
| Input $/1M (cache hit / miss) | $0.0028 / $0.14 | $0.003625 / $0.435 |
| Output $/1M | $0.28 | $0.87 |
| Concurrency limit | 2500 | 500 |
| `base_url` (OpenAI fmt) | `https://api.deepseek.com` | same |

**Legacy aliases:** `deepseek-chat` and `deepseek-reasoner` are **deprecated 2026-07-24 15:59 UTC** and map to the **non-thinking** and **thinking** modes of **`deepseek-v4-flash`** respectively. So "v4-flash thinking" === old "deepseek-reasoner" → flash is unambiguously reasoning-capable.

### Thinking toggle & effort control (Thinking Mode guide + API Reference)

Two independent knobs (OpenAI format):

| Knob | Param | Values | Notes |
|---|---|---|---|
| Thinking toggle (1) | `thinking: {type: "enabled" \| "disabled"}` | enabled / disabled | **defaults to enabled** |
| Effort control (2)(3) | `reasoning_effort` | **`high`, `max`** (only) | default `high`; agent flows (Claude Code/OpenCode) auto-bump to `max` |

> (3) **"for compatibility, `low` and `medium` are mapped to `high`, and `xhigh` is mapped to `max`."** — Thinking Mode guide.
> API Reference, `reasoning_effort`: **"Possible values: [`high`, `max`]"**.

So passing `reasoning_effort: "low"` or `"medium"` to DeepSeek does **not** reduce reasoning — it is upgraded to `high`. There is **no `none`** value (that's a Gemini-only value in this project). The genuinely-lighter path is `thinking: {type:"disabled"}`.

**Sending the params via OpenAI SDK** (matches `lib/ai/providers.ts` approach — `thinking` must go in `extra_body`):

```python
response = client.chat.completions.create(
    model="deepseek-v4-pro",          # or deepseek-v4-flash
    messages=[...],
    reasoning_effort="high",          # top-level OK; low/medium → high
    extra_body={"thinking": {"type": "enabled"}},  # toggle must be in extra_body
)
```

Node/OpenAI SDK (the official "Your First API Call" example passes both at top level — the SDK forwards unknown keys):
```js
await openai.chat.completions.create({
  model: "deepseek-v4-pro",
  messages: [...],
  thinking: { type: "enabled" },
  reasoning_effort: "high",
  stream: false,
});
```

### `reasoning_content` — CoT is separate from `content` (confirmed for V4)

From the Thinking Mode guide:
> "In thinking mode, the chain-of-thought content is returned via the **`reasoning_content`** parameter, **at the same level as `content`**."

- `response.choices[0].message.reasoning_content` → the CoT
- `response.choices[0].message.content` → the final answer (clean; valid JSON under json_object mode)
- Multi-turn: if **no tool call** happened, prior-turn `reasoning_content` is **not** re-fed into context (ignored if sent). If a **tool call** happened, `reasoning_content` **must** be passed back or the API returns **400**. (Not relevant to a single-shot judge call.)
- Streaming: deltas arrive as `delta.reasoning_content` first, then `delta.content` — useful if you ever want to start a timeout/abort only after content begins.

**Implication for the judge bug (#2):** On DeepSeek the JSON-truncation failure mode **cannot** be caused by reasoning eating `max_tokens` content budget (CoT is out-of-band). DeepSeek's E2 failure in the PRD is therefore **purely latency** (10 s abort), exactly as the PRD states. Gemini's truncation is the separate, documented hazard (its hidden reasoning *does* eat `max_tokens`).

### Thinking-mode parameter restrictions (relevant to judge.ts temperature:0.3)

Thinking mode **ignores** `temperature`, `top_p`, `presence_penalty`, `frequency_penalty` — set them and they are silently no-ops (no error, but no effect). So `judge.ts`'s `temperature: 0.3` has **no effect while `thinking:true`**. (The deprecated `deepseek-reasoner` additionally errored on `logprobs`/`top_logprobs`; the V4 Thinking Mode guide lists only the silent-noop set.) JSON Output, Chat Completion, and Chat Prefix Completion are supported in thinking mode.

### `max_tokens` defaults

API Reference defers exact defaults to "the documentation"; Models & Pricing gives **max output 384K** for both V4 models. (Legacy `deepseek-reasoner` doc stated default 32K / max 64K *including* CoT — that number is for the old model, **not** authoritative for V4.) For a judge call you set `max_tokens` to fit the JSON answer; CoT length is governed by `reasoning_effort`, not by `max_tokens` content sizing.

### Latency (no official numbers — project-measured only)

- DeepSeek publishes **no per-request latency SLA**. The V3.2-Exp note touts efficiency (Sparse Attention) but gives no wall-clock figures.
- The only concrete latency is the **project's own** (PRD): `deepseek-v4-pro` E2 thinking call **timed out at the 10 s abort**; non-thinking DeepSeek "floor ~5 s" (`lib/ai/contracts/event.ts:17`); examQuestion mid-tier (v4-pro non-thinking) measured 9.4 s.
- Reasonable inference (not from docs): flash thinking < pro thinking in latency, but a `high`-effort CoT pass is **still a full reasoning generation** and likely exceeds a hard 10 s budget for non-trivial策论 judging. Non-thinking flash is the only DeepSeek mode that reliably fits ~5–6 s.

---

## Recommended Config (for the E2 judge call)

Constraint: there is **no DeepSeek "light thinking" tier**. You choose quality-with-bigger-timeout, or speed-without-CoT.

- **Fast & reliable (~5–6 s), no CoT** — `deepseek-v4-flash`, `thinking:{type:"disabled"}`, `response_format:{type:"json_object"}`, strict rubric prompt, `max_tokens` sized to the JSON (e.g. ~600–800), timeout ~8–10 s. Matches PRD **方案 B**. Flash is good enough for exam-answer judging *if* the prompt carries the rubric/criteria explicitly (compensating for no CoT).
- **Quality with CoT** — keep `thinking:{type:"enabled"}` (effort stays `high`, can't be lowered), but **raise timeout to ~18–20 s** because you cannot make `high` fit 10 s. CoT is in `reasoning_content` so `content` stays clean JSON; `max_tokens` only needs to cover the answer. Matches PRD **方案 A / C**.
- **flash vs pro for judging**: start with **flash thinking-OFF** (cheapest, fastest, 5× higher concurrency). Escalate to **flash thinking-ON (bigger timeout)** if judgments are too shallow; only go to **pro** if flash's *content quality* (not latency) is insufficient — pro is ~3× the price and 5× lower concurrency, and is also slow in thinking mode.
- **Note for `judge.ts`**: `temperature` is a no-op under thinking mode — to actually control sampling at 0.3 you must run thinking **disabled**.

### Cross-check vs current code
- `lib/ai/providers.ts:118-122` `thinkingParams()` — DeepSeek → `{thinking:{type: enabled|disabled}}`; Gemini → `reasoning_effort: medium|none`. **Correct given findings**: DeepSeek's `reasoning_effort` can't go below `high`, so binary toggle is the only meaningful DeepSeek lever. The `reasoning_effort` field in `ProviderExtraBody` (`providers.ts:18`) is effectively Gemini-only.
- `lib/ai/contracts/judge.ts:24-28` — `thinking:true`, `maxTokens:800`, `timeoutMs:10_000`. Confirmed: DeepSeek path fails on **latency only** (10 s < `high`-effort CoT); the `maxTokens:800` truncation risk is a **Gemini** problem (reasoning eats content budget), not DeepSeek.
- `lib/ai/providers.ts:46` — `low: v4-flash, mid: v4-pro, high: v4-pro`. flash *is* reasoning-capable, so a thinking-capable judge does **not** strictly require pro; pro is a quality (not capability) choice.

## Caveats / Not Found

- **No official latency/throughput numbers** for either V4 model — all timing in this doc is project-measured or inferred.
- **Exact `max_tokens` default** for V4 not stated inline (docs say "refer to the documentation"); only **max output 384K** is confirmed. The old 32K/64K figure is `deepseek-reasoner`-era, not V4.
- DeepSeek's **OpenAI-format `reasoning_effort` enum is `[high, max]`**; the broader `none/low/medium/high/xhigh` surface exists only as a **compatibility shim** (low/medium→high, xhigh→max) — do **not** assume it grants finer control.
- Behavior of passing `reasoning_effort` while `thinking:disabled` is **not explicitly documented** (effort is described as meaningful only "in thinking mode"); treat effort as ignored when thinking is off.
- The Exa MCP tools requested by the task were unavailable; findings rely on direct fetches of official docs instead (higher authority, but no third-party benchmark/latency corroboration was gathered).
