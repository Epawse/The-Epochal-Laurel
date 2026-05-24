// Zod output schemas for AI contracts (game-design/ai-contracts.md).
// V1 (random event) is implemented now; E1/E2/E3/V2/N1/R1/I1 land here later,
// reusing the shared sub-schemas below.

import { z } from "zod";
import type { Era, Season, EventType } from "../game/constants";
import { ModifierSchema } from "../game/schema";

export type { Era, Season, EventType } from "../game/constants";

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

export const V1DiceCheckSchema = z.object({
  stat: z.enum(["erudition", "fortune", "drive", "wealth"]),
  dc: z.number().int().min(6).max(16),
  outcomes: z.object({
    crit_success: StatChangesSchema,
    success: StatChangesSchema,
    fail: StatChangesSchema,
    crit_fail: StatChangesSchema,
  }),
});

export const V1EventChoiceSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  stat_changes: StatChangesSchema,
  narrative_preview: z.string().default(""),
  check: V1DiceCheckSchema.nullable().optional(),
});

export const V1EventRewardSchema = z.object({
  type: z.enum(["relic_draft", "skill_grant", "buff"]),
  relic_ids: z.array(z.string()).default([]),
  skill_id: z.string().nullable().default(null),
  buff: ModifierSchema.nullable().default(null),
});

export const V1EventSchema = z.object({
  title: z.string().min(1).max(30),
  description: z.string().min(1),
  choices: z.array(V1EventChoiceSchema).min(2).max(3),
  allows_free_input: z.boolean().default(true),
  free_input_context: z.string().default(""),
  reward: V1EventRewardSchema.nullable().optional(),
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
  available_relic_pool?: string[];
  character_skills?: string[];
  character_relics?: string[];
  world_modifier?: string | null;
}

// ── V2: Event Free-Input Evaluation ────────────────────────────────────────

export const V2EventEvalSchema = z.object({
  success: z.boolean(),
  plausibility_score: z.number().int().min(0).max(100),
  stat_changes: StatChangesSchema,
  narrative_result: z.string().max(200),
  npc_reaction: z
    .object({
      npc_name: z.string(),
      reaction: z.string(),
      relationship_delta: z.number().int().min(-5).max(5),
    })
    .nullable(),
});
export type V2EventEval = z.infer<typeof V2EventEvalSchema>;

export interface V2Input {
  event_title: string;
  event_description: string;
  player_input: string;
  character_stats: { erudition: number; fortune: number; drive: number };
  character_items: string[];
  available_npcs: Array<{ name: string; role: string }>;
}

// ── N1: NPC Dialogue Generation ────────────────────────────────────────────

export const N1DialogueSchema = z.object({
  dialogue: z.string(),
  mood: z.enum(["friendly", "neutral", "hostile", "mysterious"]),
  hint: z.string().nullable(),
  relationship_delta: z.number().int().min(-5).max(5),
});
export type N1Dialogue = z.infer<typeof N1DialogueSchema>;

export interface N1Input {
  npc: {
    name: string;
    role: string;
    personality: string;
    memory: Array<{ event: string; sentiment: string }>;
  };
  character_name: string;
  interaction_type: "greeting" | "advice" | "request" | "gossip";
  world_context: { era: Era; season: Season };
}

// ── E1: Exam Question Generation ──────────────────────────────────────────

export const E1ChoiceRiskSchema = z.object({
  condition: z.enum(["temperament_mismatch", "style_mismatch", "full_mismatch"]),
  description: z.string(),
  penalty: z.object({
    drive: z.number().int().min(-15).max(0).default(0),
    fortune: z.number().int().min(-10).max(0).default(0),
  }),
});

export const E1ChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  alignment: z.enum(["full", "partial", "none"]),
  base_score: z.number().int().min(40).max(70),
  risk: E1ChoiceRiskSchema.nullable(),
});

export const E1ExamQuestionSchema = z.object({
  question_text: z.string(),
  topic_category: z.enum(["governance", "ethics", "military", "economics", "philosophy"]),
  difficulty_hint: z.string(),
  choices: z.array(E1ChoiceSchema).length(3),
  free_input_hint: z.string(),
});
export type E1ExamQuestion = z.infer<typeof E1ExamQuestionSchema>;

export interface E1Input {
  exam_level: "county" | "provincial" | "metropolitan" | "palace";
  era: Era;
  court_whims: {
    style: string;
    emperor_temperament: string;
  };
  year: number;
  character_erudition: number;
  previous_questions_this_run: string[];
}

// ── E2: Free-Text Answer Evaluation (Judge) ───────────────────────────────

export const E2JudgeSchema = z.object({
  scores: z.object({
    relevance: z.number().int().min(0).max(25),
    cleverness: z.number().int().min(0).max(25),
    alignment: z.number().int().min(0).max(25),
    audacity: z.number().int().min(0).max(25),
  }),
  total_score: z.number().int().min(0).max(100),
  judge_narrative: z.string(),
  special_flags: z.object({
    offended_emperor: z.boolean(),
    impressed_examiner: z.boolean(),
    plagiarism_detected: z.boolean(),
  }),
});
export type E2Judge = z.infer<typeof E2JudgeSchema>;

export interface E2Input {
  question_text: string;
  player_answer: string;
  court_whims: {
    style: string;
    emperor_temperament: string;
  };
  exam_level: string;
  character_erudition: number;
  character_items: string[];
}

// ── R1: Result Narration ──────────────────────────────────────────────────

export const R1NarrationSchema = z.object({
  narration: z.string(),
  sound_cue: z.enum(["celebration", "mourning", "tension", "neutral"]),
});
export type R1Narration = z.infer<typeof R1NarrationSchema>;

export interface R1Input {
  event_type: "exam_pass" | "exam_fail" | "inheritance" | "era_change" | "death";
  context: { character_name: string; detail: string };
  tone: "triumphant" | "tragic" | "bittersweet" | "comedic";
}

// ── I1: Heir Generation ─────────────────────────────────────────────────────

export const I1HeirSchema = z.object({
  heirs: z.array(z.object({
    name: z.string(),
    traits: z.array(z.string()).min(1).max(2),
    personality_hint: z.string(),
    starting_bonus: z.object({
      stat: z.enum(["erudition", "fortune", "drive"]),
      value: z.number().int().min(3).max(8),
    }),
  })),
});
export type I1Heirs = z.infer<typeof I1HeirSchema>;

export interface I1Input {
  parent: {
    name: string;
    traits: string[];
    highest_title: string;
    erudition: number;
  };
  dynasty: {
    family_name: string;
    generation: number;
    era: Era;
  };
  num_heirs: number;
  is_adoption: boolean;
}

// ── E3: Palace Exam Rival Generation ────────────────────────────────────────

export const E3RivalsSchema = z.object({
  rivals: z.array(z.object({
    name: z.string(),
    answer_summary: z.string(),
    score: z.number().int(),
    style: z.enum(["conservative", "bold", "sycophantic", "scholarly"]),
  })).length(3),
});
export type E3Rivals = z.infer<typeof E3RivalsSchema>;

export type RivalStrength = "moderate" | "strong" | "elite";

export interface E3Input {
  question_text: string;
  court_whims: {
    style: string;
    emperor_temperament: string;
  };
  dynasty_generation: number;
  era: Era;
  rival_strength: RivalStrength;
}
