// Unified LLM entry point: callLLM(tier, messages, options).
// Tier→provider routing, per-provider thinking control, hard timeout, one retry
// on transient faults, transparent fallback to the next provider, telemetry.
// JSON.parse + Zod validation is each contract's job, NOT this layer's
// (backend/quality-guidelines.md, backend/error-handling.md).

import type OpenAI from "openai";
import {
  PROVIDERS,
  PROVIDER_CHAIN,
  getClient,
  isConfigured,
  thinkingParams,
  reasoningEffortParams,
  AllProvidersFailedError,
  type ProviderId,
  type Tier,
  type ReasoningEffort,
  type ChatMessage,
  type ProviderExtraBody,
} from "./providers";
import { log } from "../log";

export type { ChatMessage } from "./providers";

export interface CallOptions {
  thinking?: boolean; // default false (Low/Mid). Legacy on/off; prefer reasoningEffort.
  reasoningEffort?: ReasoningEffort; // graduated effort; overrides `thinking` when set (E2)
  temperature?: number; // default 0.7
  maxTokens?: number; // default 800
  timeoutMs?: number; // hard abort; default 10_000 (ai-contracts global limit)
  softBudgetMs?: number; // log a slow-call warn above this (telemetry only)
  responseFormat?: "json" | "text"; // default "json"
  providerOrder?: ProviderId[]; // override the global PROVIDER_CHAIN for this call (E2 → gemini first)
  contract?: string; // telemetry label, e.g. "V1"
}

export interface LLMResult {
  content: string;
  provider: ProviderId;
  model: string;
  latencyMs: number;
  fallbackUsed: boolean;
}

class EmptyContentError extends Error {
  constructor(provider: string) {
    super(`empty content from ${provider}`);
    this.name = "EmptyContentError";
  }
}

function errMessage(err: unknown): string {
  return err instanceof Error ? `${err.name}: ${err.message}` : String(err);
}

function statusOf(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === "number") return s;
  }
  return undefined;
}

// Worth a single same-provider retry (fast transient faults). Timeouts/aborts are
// NOT retried here — they already consumed the budget; they advance to fallback.
function isTransient(err: unknown): boolean {
  if (err instanceof EmptyContentError) return true;
  const status = statusOf(err);
  if (status === 429 || status === 408 || (status !== undefined && status >= 500)) return true;
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|fetch failed|network|connection error/i.test(
    errMessage(err),
  );
}

function formatMessages(provider: ProviderId, messages: ChatMessage[]): ChatMessage[] {
  if (!PROVIDERS[provider].mergeSystemIntoUser) return messages;
  // Workaround (off by default): fold system instructions into the first user turn.
  const system = messages
    .filter((m) => m.role === "system")
    .map((m) => m.content)
    .join("\n\n");
  if (!system) return messages;
  const rest = messages.filter((m) => m.role !== "system");
  const firstUser = rest.find((m) => m.role === "user");
  if (firstUser) {
    firstUser.content = `${system}\n\n${firstUser.content}`;
    return rest;
  }
  return [{ role: "user", content: system }, ...rest];
}

async function attempt(
  provider: ProviderId,
  model: string,
  messages: ChatMessage[],
  opts: CallOptions,
) {
  const client = getClient(provider);
  // Graduated reasoningEffort (E2) overrides the thinking:boolean default.
  const extra: ProviderExtraBody = opts.reasoningEffort
    ? reasoningEffortParams(provider, opts.reasoningEffort)
    : thinkingParams(provider, opts.thinking ?? false);
  const params = {
    model,
    messages: formatMessages(provider, messages),
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 800,
    ...extra,
    ...(opts.responseFormat === "text" ? {} : { response_format: { type: "json_object" as const } }),
  };
  // Provider-specific fields (thinking / reasoning_effort) aren't in the OpenAI
  // types; cast once at the call boundary (no `any`).
  const resp = await client.chat.completions.create(
    params as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
    { signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000) },
  );
  const content = resp.choices[0]?.message?.content ?? "";
  if (!content.trim()) throw new EmptyContentError(provider); // DeepSeek json empty-content caveat
  return { content, usage: resp.usage };
}

export async function callLLM(
  tier: Tier,
  messages: ChatMessage[],
  options: CallOptions = {},
): Promise<LLMResult> {
  const chain = (options.providerOrder ?? PROVIDER_CHAIN).filter(isConfigured);
  if (chain.length === 0) {
    throw new AllProvidersFailedError([{ provider: "(none)", error: "no provider configured" }]);
  }

  const attempts: Array<{ provider: string; error: string }> = [];

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i];
    const model = PROVIDERS[provider].models[tier];

    for (let tryNum = 0; tryNum < 2; tryNum++) {
      const t0 = Date.now();
      try {
        const { content, usage } = await attempt(provider, model, messages, options);
        const latencyMs = Date.now() - t0;
        const fallbackUsed = i > 0;
        log.info("ai.call", {
          contract: options.contract,
          provider,
          model,
          tier,
          latencyMs,
          fallbackUsed,
          inputTokens: usage?.prompt_tokens,
          outputTokens: usage?.completion_tokens,
        });
        if (options.softBudgetMs && latencyMs > options.softBudgetMs) {
          log.warn("ai.slow", {
            contract: options.contract,
            provider,
            model,
            latencyMs,
            budgetMs: options.softBudgetMs,
          });
        }
        return { content, provider, model, latencyMs, fallbackUsed };
      } catch (err) {
        const latencyMs = Date.now() - t0;
        attempts.push({ provider, error: errMessage(err) });
        if (isTransient(err) && tryNum === 0) {
          log.warn("ai.retry", { contract: options.contract, provider, model, latencyMs, reason: errMessage(err) });
          continue;
        }
        log.warn("ai.provider_fallback", {
          contract: options.contract,
          provider,
          model,
          latencyMs,
          reason: errMessage(err),
          nextProvider: chain[i + 1] ?? null,
        });
        break;
      }
    }
  }

  throw new AllProvidersFailedError(attempts);
}
