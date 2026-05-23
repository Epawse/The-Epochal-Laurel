// I1 — Heir Generation (game-design/ai-contracts.md).
// Model tier: Mid (deepseek-v4-pro). Temperature: 0.8.
// Fallback: procedural heir generation (random name + random traits from pool).

import { callLLM } from "../client";
import { buildI1Messages } from "../prompts";
import {
  I1HeirSchema,
  extractJsonObject,
  type I1Heirs,
  type I1Input,
} from "../schema";
import { log } from "../../log";

export async function generateHeirs(input: I1Input): Promise<I1Heirs> {
  try {
    const result = await callLLM("mid", buildI1Messages(input), {
      contract: "I1",
      temperature: 0.8,
      maxTokens: 800,
      timeoutMs: 10_000,
      softBudgetMs: 3000,
      responseFormat: "json",
      thinking: false,
    });
    const parsed = I1HeirSchema.parse(JSON.parse(extractJsonObject(result.content)));
    // Validate heir count matches request
    if (parsed.heirs.length !== input.num_heirs) {
      log.warn("ai.heir_count_mismatch", {
        expected: input.num_heirs,
        got: parsed.heirs.length,
      });
      // Trim or pad as needed
      if (parsed.heirs.length > input.num_heirs) {
        parsed.heirs = parsed.heirs.slice(0, input.num_heirs);
      } else {
        // Pad with procedural heirs
        while (parsed.heirs.length < input.num_heirs) {
          parsed.heirs.push(proceduralHeir(input, parsed.heirs.length));
        }
      }
    }
    return parsed;
  } catch (err) {
    log.warn("ai.fallback", {
      contract: "I1",
      reason: err instanceof Error ? err.message : String(err),
    });
    return proceduralHeirs(input);
  }
}

// ── Procedural Fallback ──────────────────────────────────────────────────────

const GIVEN_NAMES = [
  "伯川", "仲明", "叔远", "季安", "文渊",
  "子瑜", "怀德", "承志", "继贤", "延嗣",
  "思齐", "敬之", "守正", "立本", "崇文",
];

const POSITIVE_TRAITS = [
  "勤勉", "聪慧", "坚韧", "机敏", "沉稳",
  "博闻", "果敢", "谦逊", "豁达", "敏锐",
];

const NEGATIVE_TRAITS = [
  "体弱", "急躁", "懒散", "固执", "轻浮",
  "多疑", "怯懦", "骄纵", "迂腐", "鲁莽",
];

const PERSONALITY_HINTS = [
  "自幼好学，常秉烛夜读至天明。",
  "性格沉稳，遇事不慌，颇有大将之风。",
  "天资聪颖但性情顽劣，需严加管教。",
  "为人豁达，善于交际，朋友遍天下。",
  "心思细腻，善察人心，但有时过于多虑。",
  "体格健壮，精力充沛，但对读书兴趣寥寥。",
  "天生好运，逢凶化吉，但不够勤奋。",
  "性情刚烈，嫉恶如仇，但容易得罪人。",
  "温文尔雅，知书达理，深得长辈喜爱。",
  "少年老成，处事圆滑，但缺少锐气。",
];

const ADOPTION_HINTS = [
  "虽为过继之子，却勤勉好学，誓要光耀门楣。",
  "初入家门时怯生生的，但很快展现出过人的才智。",
  "虽非亲生，但性情温厚，对养父母极为孝顺。",
];

const STAT_OPTIONS: Array<"erudition" | "fortune" | "drive"> = ["erudition", "fortune", "drive"];

function proceduralHeir(input: I1Input, index: number): I1Heirs["heirs"][number] {
  const nameIdx = (input.dynasty.generation * 7 + index * 3) % GIVEN_NAMES.length;
  const posIdx = (input.dynasty.generation * 5 + index * 2) % POSITIVE_TRAITS.length;
  const negIdx = (input.dynasty.generation * 3 + index * 4) % NEGATIVE_TRAITS.length;
  const hintIdx = (input.dynasty.generation * 2 + index * 5) % PERSONALITY_HINTS.length;
  const statIdx = index % STAT_OPTIONS.length;

  const traits = [POSITIVE_TRAITS[posIdx], NEGATIVE_TRAITS[negIdx]];
  const hint = input.is_adoption
    ? ADOPTION_HINTS[index % ADOPTION_HINTS.length]
    : PERSONALITY_HINTS[hintIdx];

  return {
    name: `${input.dynasty.family_name}${GIVEN_NAMES[nameIdx]}`,
    traits,
    personality_hint: hint,
    starting_bonus: {
      stat: STAT_OPTIONS[statIdx],
      value: 4 + (index % 4), // 4-7 range
    },
  };
}

function proceduralHeirs(input: I1Input): I1Heirs {
  const heirs: I1Heirs["heirs"] = [];
  for (let i = 0; i < input.num_heirs; i++) {
    heirs.push(proceduralHeir(input, i));
  }
  return { heirs };
}
