// V1 — Random Event Generation (game-design/ai-contracts.md).
// AI proposes narrative + suggested stat deltas; the engine owns final numbers.
// Own-fallback pattern (backend/error-handling.md): degrades, never throws.

import { callLLM } from "../client";
import { buildV1Messages } from "../prompts";
import { V1EventSchema, extractJsonObject, type V1Event, type V1Input, type Season } from "../schema";
import { log } from "../../log";

export async function generateEvent(input: V1Input): Promise<V1Event> {
  try {
    const result = await callLLM("low", buildV1Messages(input), {
      contract: "V1",
      temperature: 0.8, // PT-V1
      maxTokens: 800,
      timeoutMs: 10_000, // global hard limit; DeepSeek non-thinking floor ~5s
      softBudgetMs: 1500, // ai-contracts V1 latency budget (warn only)
      responseFormat: "json",
      thinking: false,
    });
    return V1EventSchema.parse(JSON.parse(extractJsonObject(result.content)));
  } catch (err) {
    log.warn("ai.fallback", {
      contract: "V1",
      reason: err instanceof Error ? err.message : String(err),
    });
    return staticEvent(input);
  }
}

const SEASON_TEXT: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

// Minimal static fallback (ai-contracts.md V1 Fallback: static event pool).
// Expand to the full per-era pool in a later content task; this proves the
// degrade-never-crash path and satisfies the V1 schema.
function staticEvent(input: V1Input): V1Event {
  const { name } = input.character;
  const season = SEASON_TEXT[input.world.season];
  return {
    title: "寻常时节",
    description: `${season}日寻常，${name}闭门读书，偶有同窗来访，闲谈间也生出几分思量。`,
    choices: [
      {
        id: "a",
        label: "潜心攻读",
        stat_changes: { erudition: 4, fortune: 0, drive: -3, wealth: 0 },
        narrative_preview: "学问稍进，精神却有些倦怠。",
      },
      {
        id: "b",
        label: "出门会友",
        stat_changes: { erudition: 0, fortune: 4, drive: -1, wealth: -1 },
        narrative_preview: "结交些许人脉，于仕途或有助益。",
      },
    ],
    allows_free_input: false,
    free_input_context: "",
  };
}
