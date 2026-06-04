// E2 — Free-Text Answer Evaluation / Judge (game-design/ai-contracts.md).
// Model tier: High (thinking mode enabled). Temperature: 0.3.
// Post-process: extract JSON from thinking response via extractJsonObject().
// Fallback: score = character_erudition * 0.5.

import { callLLM } from "../client";
import { buildE2Messages } from "../prompts";
import {
  E2JudgeSchema,
  extractJsonObject,
  type E2Judge,
  type E2Input,
} from "../schema";
import { log } from "../../log";

export async function evaluateFreeText(input: E2Input): Promise<E2Judge> {
  try {
    const result = await callLLM("high", buildE2Messages(input), {
      contract: "E2",
      temperature: 0.3,
      // Gemini reasoning shares the max_tokens budget with the visible JSON
      // ("output budget cannibalization"); low effort + a roomy budget keeps the
      // ~300-token judge JSON from truncating (see research/gemini-3.5-flash-thinking.md).
      maxTokens: 2048,
      timeoutMs: 12_000,
      softBudgetMs: 5000,
      // E2 prefers Gemini 3.5 Flash's light "low" thinking tier: it reasons a bit yet
      // emits content fast and intact. The same effort maps to thinking-disabled on the
      // DeepSeek fallback (v4 has no graduated tier), dodging the old 10s thinking-mode
      // timeout. Still text + extractJsonObject since reasoning models can prepend stray
      // content. (Temperature 0.3 is now effective — it was a no-op under DeepSeek thinking.)
      responseFormat: "text",
      reasoningEffort: "low",
      providerOrder: ["gemini", "deepseek"],
    });
    const jsonStr = extractJsonObject(result.content);
    const parsed = JSON.parse(jsonStr);
    return E2JudgeSchema.parse(parsed);
  } catch (err) {
    log.warn("ai.fallback", {
      contract: "E2",
      reason: err instanceof Error ? err.message : String(err),
    });
    return fallbackScore(input.character_erudition);
  }
}

function fallbackScore(erudition: number): E2Judge {
  const base = Math.round(erudition * 0.5);
  // Distribute evenly across dimensions
  const perDim = Math.min(25, Math.round(base / 4));
  const total = perDim * 4;
  return {
    scores: {
      relevance: perDim,
      cleverness: perDim,
      alignment: perDim,
      audacity: perDim,
    },
    total_score: total,
    judge_narrative: "考官阅卷匆匆，未置可否。",
    special_flags: {
      offended_emperor: false,
      impressed_examiner: false,
      plagiarism_detected: false,
    },
  };
}
