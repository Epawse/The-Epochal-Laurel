// V2 — Event Free-Input Evaluation (game-design/ai-contracts.md).
// Evaluates a player's creative solution to a random event.
// Own-fallback pattern: degrades, never throws.

import { callLLM } from "../client";
import { buildV2Messages } from "../prompts";
import { V2EventEvalSchema, extractJsonObject, type V2EventEval, type V2Input } from "../schema";
import { log } from "../../log";

export async function evaluateEventFreeInput(input: V2Input): Promise<V2EventEval> {
  try {
    const result = await callLLM("mid", buildV2Messages(input), {
      contract: "V2",
      temperature: 0.5, // PT-V2
      maxTokens: 800,
      timeoutMs: 10_000,
      softBudgetMs: 3000, // ai-contracts V2 latency budget
      responseFormat: "json",
      thinking: false,
    });
    return V2EventEvalSchema.parse(JSON.parse(extractJsonObject(result.content)));
  } catch (err) {
    log.warn("ai.fallback", {
      contract: "V2",
      reason: err instanceof Error ? err.message : String(err),
    });
    return fallbackEval();
  }
}

// Fallback: success=true, stat_changes={fortune: +5}, generic narrative.
function fallbackEval(): V2EventEval {
  return {
    success: true,
    plausibility_score: 60,
    stat_changes: { erudition: 0, fortune: 5, drive: 0, wealth: 0 },
    narrative_result: "你的办法虽不算高明，但也勉强奏效了。",
    npc_reaction: null,
  };
}
