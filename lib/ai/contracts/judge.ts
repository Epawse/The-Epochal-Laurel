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
      maxTokens: 800,
      timeoutMs: 10_000,
      softBudgetMs: 5000,
      // E2 uses thinking mode — JSON extraction from content post-process.
      // DeepSeek V4 thinking mode can interfere with json_object mode,
      // so we use text format and extract JSON manually.
      responseFormat: "text",
      thinking: true,
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
