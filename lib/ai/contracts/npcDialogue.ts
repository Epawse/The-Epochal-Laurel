// N1 — NPC Dialogue Generation (game-design/ai-contracts.md).
// Generates contextual NPC dialogue during social interactions.
// Own-fallback pattern: degrades, never throws.

import { callLLM } from "../client";
import { buildN1Messages } from "../prompts";
import { N1DialogueSchema, extractJsonObject, type N1Dialogue, type N1Input } from "../schema";
import { log } from "../../log";

export async function generateNpcDialogue(input: N1Input): Promise<N1Dialogue> {
  try {
    const result = await callLLM("low", buildN1Messages(input), {
      contract: "N1",
      temperature: 0.7, // PT-N1
      maxTokens: 500,
      timeoutMs: 10_000,
      softBudgetMs: 1500, // ai-contracts N1 latency budget
      responseFormat: "json",
      thinking: false,
    });
    return N1DialogueSchema.parse(JSON.parse(extractJsonObject(result.content)));
  } catch (err) {
    log.warn("ai.fallback", {
      contract: "N1",
      reason: err instanceof Error ? err.message : String(err),
    });
    return fallbackDialogue(input);
  }
}

// Fallback: generic dialogue based on NPC role template.
function fallbackDialogue(input: N1Input): N1Dialogue {
  const roleDialogues: Record<string, string> = {
    mentor: `${input.character_name}，学问之道，贵在持之以恒。`,
    rival: `哼，${input.character_name}，下次考场上见分晓。`,
    patron: `${input.character_name}近来可好？有何需要尽管开口。`,
    friend: `${input.character_name}兄，许久不见，甚是想念。`,
    examiner: `考生且去，用心备考。`,
    spouse: `夫君辛苦了，且歇息片刻。`,
  };

  return {
    dialogue: roleDialogues[input.npc.role] ?? `${input.character_name}，幸会。`,
    mood: "neutral",
    hint: null,
    relationship_delta: 0,
  };
}
