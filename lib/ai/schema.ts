// Zod output schemas for AI contracts (game-design/ai-contracts.md).
// V1 (random event) is implemented now; E1/E2/E3/V2/N1/R1/I1 land here later,
// reusing the shared sub-schemas below.

import { z } from "zod";

// A stat delta the AI *proposes*. The engine owns final clamping to the
// data-model.md Stat Boundaries — this schema validates shape only (integers).
// V1 instructs the model to keep each value within ±15.
export const StatChangesSchema = z.object({
  erudition: z.number().int().default(0),
  fortune: z.number().int().default(0),
  drive: z.number().int().default(0),
  wealth: z.number().int().default(0),
});
export type StatChanges = z.infer<typeof StatChangesSchema>;

// ── V1: Random Event Generation ─────────────────────────────────────────────

export const V1EventChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  stat_changes: StatChangesSchema,
  narrative_preview: z.string().default(""),
});

export const V1EventSchema = z.object({
  title: z.string().min(1).max(30),
  description: z.string().min(1),
  choices: z.array(V1EventChoiceSchema).min(2).max(3),
  allows_free_input: z.boolean().default(true),
  free_input_context: z.string().default(""),
});
export type V1Event = z.infer<typeof V1EventSchema>;

// LLMs sometimes wrap JSON in markdown fences or add stray prose despite
// json_object mode (notably Gemini's beta OpenAI-compat layer). Pull out the
// JSON body before JSON.parse so a cosmetic wrapper doesn't force a fallback.
export function extractJsonObject(raw: string): string {
  let s = raw.trim();
  const fence = s.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) s = fence[1].trim();
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) return s.slice(start, end + 1);
  return s;
}

// Enums (will move to lib/game/constants.ts when the engine layer lands).
export type EventType = "opportunity" | "misfortune" | "social" | "political";
export type Era = "prosperity" | "decline" | "invasion" | "restoration";
export type Season = "spring" | "summer" | "autumn" | "winter";

// V1 input — built by the engine (ai-contracts.md V1 Input).
export interface V1Input {
  character: {
    name: string;
    age: number;
    erudition: number;
    fortune: number;
    drive: number;
    titles: string[];
    traits: string[];
  };
  world: { era: Era; season: Season; year: number };
  event_type: EventType;
  recent_events: string[];
  available_npcs: Array<{ name: string; role: string }>;
}
