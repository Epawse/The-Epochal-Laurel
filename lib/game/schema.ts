import { z } from "zod";

// ── Shared sub-schemas ──────────────────────────────────────────────────────

export const StatChangesSchema = z.object({
  erudition: z.number().int().default(0),
  fortune: z.number().int().default(0),
  drive: z.number().int().default(0),
  wealth: z.number().int().default(0),
});
export type StatChanges = z.infer<typeof StatChangesSchema>;

export const StatsSchema = z.object({
  erudition: z.number().int().min(0).max(100),
  fortune: z.number().int().min(-50).max(100),
  drive: z.number().int().min(0).max(100),
  wealth: z.number().int().min(0).max(200),
});
export type Stats = z.infer<typeof StatsSchema>;

// ── Character ───────────────────────────────────────────────────────────────

const ExamHistoryEntrySchema = z.object({
  level: z.enum(["county", "provincial", "metropolitan", "palace"]),
  year: z.number().int(),
  result: z.enum(["pass", "fail"]),
  score: z.number().int(),
  rank: z.number().int().optional(),
  title: z.string().optional(),
  rivals: z
    .array(z.object({ name: z.string(), score: z.number().int() }))
    .optional(),
});

const RelationshipSchema = z.object({
  npc_id: z.string(),
  type: z.enum(["mentor", "rival", "spouse", "patron"]),
  affinity: z.number().int(),
});

const InventoryItemSchema = z.object({
  item_id: z.string(),
  name: z.string(),
  effect: z.string(),
  quantity: z.number().int().min(1),
});

const StatusEffectSchema = z.object({
  type: z.string(),
  turns_remaining: z.number().int().min(0),
});

const ChildSchema = z.object({
  name: z.string(),
  born_year: z.number().int(),
  is_son: z.boolean(),
  alive: z.boolean(),
});

const SpouseSchema = z.object({
  npc_id: z.string(),
  married_year: z.number().int(),
  fertile_until_year: z.number().int(),
});

const FamilySchema = z.object({
  spouse: SpouseSchema.nullable(),
  children: z.array(ChildSchema),
});

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  generation: z.number().int().min(1),
  age: z.number().int().min(0),
  max_age: z.number().int().min(40).max(80),
  gender: z.literal("male"),
  origin: z.enum([
    "humble_scholar",
    "farming_family",
    "merchant_son",
    "official_decline",
  ]),
  origin_effects_applied: z.boolean(),
  stats: StatsSchema,
  titles: z.array(z.string()),
  exam_history: z.array(ExamHistoryEntrySchema),
  relationships: z.array(RelationshipSchema),
  inventory: z.array(InventoryItemSchema),
  traits: z.array(z.string()),
  status_effects: z.array(StatusEffectSchema),
  family: FamilySchema,
});
export type Character = z.infer<typeof CharacterSchema>;

// ── World ───────────────────────────────────────────────────────────────────

const CourtWhimsSchema = z.object({
  style: z.enum(["pragmatic", "ornate", "orthodox", "radical"]),
  intensity: z.number().int().min(0).max(100),
  emperor_temperament: z.enum(["ambitious", "lazy", "paranoid", "benevolent"]),
});

const CourtWhimsRevealedSchema = z.object({
  style_known: z.boolean(),
  temperament_known: z.enum(["hidden", "partial", "full"]),
  temperament_eliminated: z.array(z.string()),
});

const ExamScheduleSchema = z.object({
  next_county: z.number().int(),
  next_provincial: z.number().int(),
  next_metropolitan: z.number().int(),
});

const AuxiliaryToolsSchema = z.object({
  cheat_sheet_used_this_cycle: z.boolean(),
  insider_tip_used_this_cycle: z.boolean(),
  mentor_plea_used_this_cycle: z.boolean(),
  current_exam_cycle_start_year: z.number().int(),
});

export const WorldSchema = z.object({
  era: z.enum(["prosperity", "decline", "invasion", "restoration"]),
  era_year: z.number().int(),
  dynasty: z.string(),
  year: z.number().int(),
  season: z.enum(["spring", "summer", "autumn", "winter"]),
  court_whims: CourtWhimsSchema,
  court_whims_revealed: CourtWhimsRevealedSchema,
  events_this_era: z.array(z.string()),
  exam_schedule: ExamScheduleSchema,
  auxiliary_tools: AuxiliaryToolsSchema,
});
export type World = z.infer<typeof WorldSchema>;

// ── Dynasty (Meta-Progression) ──────────────────────────────────────────────

const AncestralBlessingSchema = z.object({
  id: z.string(),
  name: z.string(),
  effect: z.string(),
  unlocked_gen: z.number().int(),
});

const AncestorSchema = z.object({
  name: z.string(),
  generation: z.number().int(),
  highest_title: z.string(),
  cause_of_end: z.string(),
  notable_achievement: z.string(),
  years_lived: z.string(),
});

const AvailableBlessingSchema = z.object({
  id: z.string(),
  name: z.string(),
  cost: z.number().int(),
  effect: z.string(),
  unlocked: z.boolean(),
});

const LegacySchema = z.object({
  books: z.number().int().min(0),
  land: z.number().int().min(0),
  reputation: z.number().int().min(0),
  ancestral_blessings: z.array(AncestralBlessingSchema),
});

export const DynastySchema = z.object({
  family_name: z.string(),
  total_generations: z.number().int().min(1),
  highest_title_ever: z.string(),
  last_era_change_generation: z.number().int().min(0),
  legacy: LegacySchema,
  ancestors: z.array(AncestorSchema),
  blessing_points: z.number().int().min(0),
  available_blessings: z.array(AvailableBlessingSchema),
});
export type Dynasty = z.infer<typeof DynastySchema>;

// ── NPC ─────────────────────────────────────────────────────────────────────

const NpcMemorySchema = z.object({
  event: z.string(),
  sentiment: z.string(),
  turn: z.number().int(),
});

export const NpcSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["mentor", "examiner", "rival", "spouse", "patron", "friend"]),
  personality: z.enum(["strict", "warm", "corrupt", "idealistic"]),
  era_introduced: z.enum(["prosperity", "decline", "invasion", "restoration"]),
  generation_introduced: z.number().int(),
  alive: z.boolean(),
  memory: z.array(NpcMemorySchema).max(10),
});
export type Npc = z.infer<typeof NpcSchema>;

// ── Current Event (Transient) ───────────────────────────────────────────────

const EventChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  stat_changes: StatChangesSchema,
  risk: z
    .object({
      condition: z.string(),
      description: z.string(),
      penalty: StatChangesSchema,
    })
    .nullable(),
  narrative_hint: z.string(),
});

export const CurrentEventSchema = z.object({
  id: z.string(),
  type: z.enum(["opportunity", "misfortune", "social", "political"]),
  title: z.string(),
  description: z.string(),
  choices: z.array(EventChoiceSchema).min(2).max(3),
  allows_free_input: z.boolean(),
  context_for_judge: z.object({
    relevant_npcs: z.array(z.string()),
    relevant_items: z.array(z.string()),
  }),
});
export type CurrentEvent = z.infer<typeof CurrentEventSchema>;

// ── Complete Game State (Save Format) ───────────────────────────────────────

export const GameStateSchema = z.object({
  version: z.string(),
  character: CharacterSchema,
  world: WorldSchema,
  dynasty: DynastySchema,
  npcs: z.array(NpcSchema),
  current_event: CurrentEventSchema.nullable(),
  turn_number: z.number().int().min(0),
  rng_seed: z.number().int(),
});
export type GameState = z.infer<typeof GameStateSchema>;
