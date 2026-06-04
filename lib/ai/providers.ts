// Multi-provider LLM registry + OpenAI-SDK client factory (baseURL swap).
// game-design/ai-contracts.md (Model Tier Mapping); backend/directory-structure.md.
// Verified 2026-05-23 (direct openai SDK probe with real keys): model IDs are
// live; both providers default thinking-ON and must be disabled per-provider
// for the fast JSON contracts.

import OpenAI from "openai";

export type Tier = "low" | "mid" | "high";
export type ProviderId = "deepseek" | "gemini";

/**
 * Graduated reasoning effort — a per-contract override of the thinking:boolean
 * default. Gemini maps it straight to `reasoning_effort`; DeepSeek V4 has no
 * graduated tier (only enabled/disabled), so minimal/low → disabled, medium/high
 * → enabled. See research/gemini-3.5-flash-thinking.md + research/deepseek-v4-thinking.md.
 */
export type ReasoningEffort = "minimal" | "low" | "medium" | "high";

/** A chat turn. Kept here (lowest-level module) so client + prompts share it. */
export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Provider-specific body fields the OpenAI types don't model. */
export interface ProviderExtraBody {
  thinking?: { type: "enabled" | "disabled" };
  reasoning_effort?: "none" | "minimal" | "low" | "medium" | "high";
}

interface ProviderConfig {
  id: ProviderId;
  label: string;
  baseURL: string;
  /** Optional env var to override baseURL (self-host/proxy/testing). */
  baseUrlEnv: string;
  envKey: string;
  models: Record<Tier, string>;
  /** DeepSeek = json_object only; Gemini also supports json_schema structured outputs. */
  supportsJsonSchema: boolean;
  /**
   * DeepSeek's pcg_contest_10 system-prompt issue did NOT reproduce on the direct
   * openai SDK (probed 2026-05-23). Keep the merge-into-first-user-message
   * workaround available but off by default.
   */
  mergeSystemIntoUser: boolean;
}

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  deepseek: {
    id: "deepseek",
    label: "DeepSeek",
    baseURL: "https://api.deepseek.com",
    baseUrlEnv: "DEEPSEEK_BASE_URL",
    envKey: "DEEPSEEK_API_KEY",
    models: { low: "deepseek-v4-flash", mid: "deepseek-v4-pro", high: "deepseek-v4-pro" },
    supportsJsonSchema: false,
    mergeSystemIntoUser: false,
  },
  gemini: {
    id: "gemini",
    label: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    baseUrlEnv: "GEMINI_BASE_URL",
    envKey: "GOOGLE_GENERATIVE_AI_API_KEY",
    models: { low: "gemini-3.5-flash", mid: "gemini-3.5-flash", high: "gemini-3.5-flash" },
    supportsJsonSchema: true,
    mergeSystemIntoUser: false,
  },
};

/** Primary first, then fallbacks — DeepSeek primary, Gemini fallback. */
export const PROVIDER_CHAIN: ProviderId[] = ["deepseek", "gemini"];

export class ProviderConfigError extends Error {
  readonly code = "PROVIDER_CONFIG_ERROR";
  constructor(
    readonly providerId: ProviderId,
    readonly missingEnv: string,
  ) {
    super(`Provider "${providerId}" is not configured (missing env ${missingEnv})`);
    this.name = "ProviderConfigError";
  }
}

export class AllProvidersFailedError extends Error {
  readonly code = "ALL_PROVIDERS_FAILED";
  constructor(readonly attempts: ReadonlyArray<{ provider: string; error: string }>) {
    super(
      `All LLM providers failed: ${attempts.map((a) => `${a.provider}: ${a.error}`).join("; ")}`,
    );
    this.name = "AllProvidersFailedError";
  }
}

const clients = new Map<ProviderId, OpenAI>();

export function isConfigured(id: ProviderId): boolean {
  const value = process.env[PROVIDERS[id].envKey];
  return typeof value === "string" && value.length > 0;
}

export function getClient(id: ProviderId): OpenAI {
  const cached = clients.get(id);
  if (cached) return cached;
  const cfg = PROVIDERS[id];
  const apiKey = process.env[cfg.envKey];
  if (!apiKey) throw new ProviderConfigError(id, cfg.envKey);
  const baseURL = process.env[cfg.baseUrlEnv] || cfg.baseURL;
  // maxRetries: 0 — retry/fallback is orchestrated in client.ts.
  const client = new OpenAI({ apiKey, baseURL, maxRetries: 0 });
  clients.set(id, client);
  return client;
}

/** Test-only: drop cached clients so a changed env key takes effect. */
export function _resetClientCache(): void {
  clients.clear();
}

/**
 * Translate the abstract "thinking on/off" flag into per-provider params.
 * Both providers default thinking-ON, so "off" must be sent explicitly:
 * DeepSeek keeps clean JSON in `content` either way (reasoning goes to
 * `reasoning_content`), but Gemini's hidden reasoning eats the max_tokens
 * budget and truncates the JSON unless disabled.
 */
export function thinkingParams(id: ProviderId, thinking: boolean): ProviderExtraBody {
  if (id === "deepseek") {
    return { thinking: { type: thinking ? "enabled" : "disabled" } };
  }
  return thinking ? { reasoning_effort: "medium" } : { reasoning_effort: "none" };
}

/**
 * Translate a graduated ReasoningEffort into per-provider params. Used when a
 * contract opts into explicit effort control (E2 today) instead of the
 * thinking:boolean default.
 *
 * - Gemini: maps straight to `reasoning_effort`. Gemini 3.x can't fully disable
 *   thinking; `minimal` is closest to off + fastest. A light tier like `low`
 *   keeps reasoning cheap so it does NOT cannibalise the max_tokens budget and
 *   truncate the JSON (see research/gemini-3.5-flash-thinking.md).
 * - DeepSeek V4: no graduated tier — only enabled/disabled. minimal/low → disabled
 *   (fast, dodges the thinking-mode timeouts); medium/high → enabled. DeepSeek keeps
 *   clean JSON in `content` either way (reasoning goes to `reasoning_content`).
 */
export function reasoningEffortParams(id: ProviderId, effort: ReasoningEffort): ProviderExtraBody {
  if (id === "deepseek") {
    const enabled = effort === "medium" || effort === "high";
    return { thinking: { type: enabled ? "enabled" : "disabled" } };
  }
  return { reasoning_effort: effort };
}
