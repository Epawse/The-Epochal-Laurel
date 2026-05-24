// E3 — Palace Exam Rival Generation (game-design/ai-contracts.md).
// Model tier: High (non-thinking). Temperature: 0.5.
// Fallback: procedural rivals with midpoint scores ±5 jitter.

import { callLLM } from "../client";
import { buildE3Messages } from "../prompts";
import {
  E3RivalsSchema,
  extractJsonObject,
  type E3Rivals,
  type E3Input,
  type RivalStrength,
} from "../schema";
import { log } from "../../log";

/**
 * Determine rival_strength from dynasty generation.
 * weak: gen <= 2, moderate: gen 3-4, strong: gen >= 5
 */
export function getRivalStrength(dynastyGeneration: number): RivalStrength {
  if (dynastyGeneration <= 2) return "weak";
  if (dynastyGeneration <= 4) return "moderate";
  return "strong";
}

export async function generatePalaceRivals(input: E3Input): Promise<E3Rivals> {
  try {
    const result = await callLLM("high", buildE3Messages(input), {
      contract: "E3",
      temperature: 0.5,
      maxTokens: 800,
      timeoutMs: 10_000,
      softBudgetMs: 5000,
      responseFormat: "json",
      thinking: false,
    });
    const parsed = E3RivalsSchema.parse(JSON.parse(extractJsonObject(result.content)));

    // Validate scores are within the expected range for rival_strength
    const range = STRENGTH_RANGES[input.rival_strength];
    for (const rival of parsed.rivals) {
      rival.score = Math.max(range.min, Math.min(range.max, rival.score));
    }

    return parsed;
  } catch (err) {
    log.warn("ai.fallback", {
      contract: "E3",
      reason: err instanceof Error ? err.message : String(err),
    });
    return proceduralRivals(input.rival_strength, input.dynasty_generation);
  }
}

// ── Score Ranges by Strength ─────────────────────────────────────────────────

const STRENGTH_RANGES: Record<RivalStrength, { min: number; max: number; mid: number }> = {
  weak: { min: 40, max: 65, mid: 52 },
  moderate: { min: 55, max: 80, mid: 67 },
  strong: { min: 70, max: 95, mid: 82 },
};

// ── Procedural Fallback ──────────────────────────────────────────────────────

const FALLBACK_NAMES = [
  ["赵文渊", "钱伯谦", "孙怀德"],
  ["李承恩", "周敬之", "吴子安"],
  ["郑明远", "王仲达", "陈叔夜"],
];

const FALLBACK_STYLES: Array<"conservative" | "bold" | "sycophantic" | "scholarly"> = [
  "conservative",
  "bold",
  "sycophantic",
];

const FALLBACK_SUMMARIES = [
  "引经据典，以古制为据主张循序渐进",
  "大胆提出改革方案，不拘泥于旧制",
  "极力颂扬圣上英明，主张一切听从天子裁决",
];

function proceduralRivals(strength: RivalStrength, generation: number = 1): E3Rivals {
  const range = STRENGTH_RANGES[strength];
  const nameSet = FALLBACK_NAMES[generation % FALLBACK_NAMES.length];

  const rivals = nameSet.map((name, i) => {
    const offset = [-3, 0, 3][i];
    const score = Math.max(range.min, Math.min(range.max, range.mid + offset));

    return {
      name,
      answer_summary: FALLBACK_SUMMARIES[i],
      score,
      style: FALLBACK_STYLES[i] as "conservative" | "bold" | "sycophantic" | "scholarly",
    };
  });

  return { rivals };
}
