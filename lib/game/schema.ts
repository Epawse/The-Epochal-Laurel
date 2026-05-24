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

export const StatKeySchema = z.enum(["erudition", "fortune", "drive", "wealth"]);
export type StatKey = z.infer<typeof StatKeySchema>;

export const ActionIdSchema = z.enum(["study", "socialize", "earn", "rest", "scheme"]);
export type ActionId = z.infer<typeof ActionIdSchema>;

export const ExamLevelSchema = z.enum(["county", "provincial", "metropolitan", "palace"]);
export type ExamLevelId = z.infer<typeof ExamLevelSchema>;

export const EventTypeSchema = z.enum(["opportunity", "misfortune", "social", "political"]);
export type EventTypeId = z.infer<typeof EventTypeSchema>;

export const SeasonSchema = z.enum(["spring", "summer", "autumn", "winter"]);
export type SeasonId = z.infer<typeof SeasonSchema>;

export const EraSchema = z.enum(["prosperity", "decline", "invasion", "restoration"]);
export type EraId = z.infer<typeof EraSchema>;

export const DiceCategorySchema = z.enum(["social", "scheme", "exam", "event"]);
export type DiceCategory = z.infer<typeof DiceCategorySchema>;

const ActionTargetSchema = z.union([ActionIdSchema, z.literal("*")]);
const DiceCategoryTargetSchema = z.union([DiceCategorySchema, z.literal("*")]);

export const EffectSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("action_gain"),
    action: ActionTargetSchema,
    stat: StatKeySchema,
    value: z.number().optional(),
    mult: z.number().positive().optional(),
  }),
  z.object({
    kind: z.literal("action_cost"),
    action: ActionTargetSchema,
    stat: StatKeySchema,
    value: z.number().min(0),
  }),
  z.object({
    kind: z.literal("action_block"),
    actions: z.array(ActionIdSchema),
  }),
  z.object({
    kind: z.literal("exam_score"),
    value: z.number().optional(),
    mult: z.number().positive().optional(),
    levels: z.array(ExamLevelSchema).optional(),
  }),
  z.object({
    kind: z.literal("exam_threshold"),
    levels: z.array(ExamLevelSchema),
    value: z.number(),
  }),
  z.object({
    kind: z.literal("exam_alignment_relax"),
    levels: z.array(ExamLevelSchema),
  }),
  z.object({
    kind: z.literal("intel_grant"),
    dimension: z.enum(["style", "temperament"]),
    level: z.enum(["partial", "full"]),
  }),
  z.object({
    kind: z.literal("dice_modifier"),
    category: DiceCategoryTargetSchema,
    value: z.number(),
  }),
  z.object({
    kind: z.literal("event_bias"),
    event_type: EventTypeSchema,
    weight_mult: z.number().positive().optional(),
    danger_mult: z.number().positive().optional(),
  }),
  z.object({
    kind: z.literal("meta"),
    key: z.string(),
    value: z.number(),
  }),
]);
export type Effect = z.infer<typeof EffectSchema>;

export const ModifierSourceSchema = z.object({
  type: z.enum(["origin", "relic", "skill", "blessing", "event", "world", "tool", "legacy"]),
  id: z.string(),
});
export type ModifierSource = z.infer<typeof ModifierSourceSchema>;

export const ModifierSchema = z.object({
  id: z.string(),
  source: ModifierSourceSchema,
  label: z.string(),
  effect: EffectSchema,
  turns_remaining: z.number().int().min(0).nullable().default(null),
});
export type Modifier = z.infer<typeof ModifierSchema>;

export const RelicSchema = z.object({
  id: z.string(),
  name: z.string(),
  rarity: z.enum(["common", "rare", "legendary"]),
  slot: z.enum(["common", "heirloom_eligible"]).default("common"),
  effects: z.array(EffectSchema),
  flavor: z.string().default(""),
});
export type Relic = z.infer<typeof RelicSchema>;

export const RelicDraftSourceSchema = z.enum([
  "action",
  "event",
  "shop",
  "exam",
  "catastrophe",
  "start",
  "skill",
]);
export type RelicDraftSource = z.infer<typeof RelicDraftSourceSchema>;

export const RelicDraftOptionSchema = z.object({
  relic: RelicSchema,
  cost: z.number().int().min(0).default(0),
});
export type RelicDraftOption = z.infer<typeof RelicDraftOptionSchema>;

export const RelicDraftSchema = z.object({
  id: z.string(),
  source: RelicDraftSourceSchema,
  options: z.array(RelicDraftOptionSchema).min(1).max(3),
  created_turn: z.number().int().min(0),
});
export type RelicDraft = z.infer<typeof RelicDraftSchema>;

export const SkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["passive", "active"]),
  effects: z.array(EffectSchema),
  cost: StatChangesSchema.partial().optional(),
  cooldown_cycles: z.number().int().min(0).optional(),
  cooldown_remaining: z.number().int().min(0).default(0),
});
export type Skill = z.infer<typeof SkillSchema>;

export const DiceCheckOutcomesSchema = z.object({
  crit_success: StatChangesSchema,
  success: StatChangesSchema,
  fail: StatChangesSchema,
  crit_fail: StatChangesSchema,
});
export type DiceCheckOutcomes = z.infer<typeof DiceCheckOutcomesSchema>;

export const DiceCheckSchema = z.object({
  stat: StatKeySchema,
  dc: z.number().int().min(1),
  outcomes: DiceCheckOutcomesSchema,
});
export type DiceCheck = z.infer<typeof DiceCheckSchema>;

export const EventRewardSchema = z.object({
  type: z.enum(["relic_draft", "skill_grant", "buff"]),
  relic_ids: z.array(z.string()).default([]),
  skill_id: z.string().nullable().default(null),
  buff: ModifierSchema.nullable().default(null),
});
export type EventReward = z.infer<typeof EventRewardSchema>;

// ── Character ───────────────────────────────────────────────────────────────

const ExamHistoryEntrySchema = z.object({
  level: ExamLevelSchema,
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
  inventory: z.array(InventoryItemSchema).default([]),
  relics: z.array(RelicSchema).default([]),
  heirloom_relic_id: z.string().nullable().default(null),
  seen_relic_ids: z.array(z.string()).default([]),
  traits: z.array(z.string()).default([]),
  skills: z.array(SkillSchema).default([]),
  status_effects: z.array(StatusEffectSchema).default([]),
  modifiers: z.array(ModifierSchema).default([]),
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
  world_modifiers: z.array(ModifierSchema).default([]),
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
  pending_heirloom: RelicSchema.nullable().default(null),
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
  check: DiceCheckSchema.nullable().optional(),
  risk: z
    .object({
      condition: z.string(),
      description: z.string(),
      penalty: StatChangesSchema,
    })
    .nullable(),
  narrative_hint: z.string(),
});
export type EventChoice = z.infer<typeof EventChoiceSchema>;

export const CurrentEventSchema = z.object({
  id: z.string(),
  type: EventTypeSchema,
  title: z.string(),
  description: z.string(),
  choices: z.array(EventChoiceSchema).min(2).max(3),
  allows_free_input: z.boolean(),
  context_for_judge: z.object({
    relevant_npcs: z.array(z.string()),
    relevant_items: z.array(z.string()),
  }),
  reward: EventRewardSchema.nullable().optional(),
});
export type CurrentEvent = z.infer<typeof CurrentEventSchema>;

// ── Prefetched Event Cache (Transient) ──────────────────────────────────────

// One prefetched, fully-mapped event per event type, generated in the background
// during player think-time so a triggered event is served with ~0 wait. Each entry
// is stamped with the (predicted next-turn) season+era it was generated for;
// generateEventForTurn only serves a slot whose stamp matches the now-current
// season+era, otherwise it falls back to live generation. `.default({})` keeps
// older saves (missing this field) loading fine.
const CachedEventSchema = z.object({
  event: CurrentEventSchema,
  season: SeasonSchema,
  era: EraSchema,
});
export type CachedEvent = z.infer<typeof CachedEventSchema>;

export const EventCacheSchema = z.record(EventTypeSchema, CachedEventSchema).default({});
export type EventCache = z.infer<typeof EventCacheSchema>;

// ── Pending NPC Dialogue (Transient) ────────────────────────────────────────

// Socialize can require an N1 dialogue call. The turn action persists this marker
// and returns immediately; a follow-up action generates the line, applies the N1
// relationship delta, and clears it.
const PendingNpcDialogueSchema = z.object({
  npc_id: z.string(),
  turn_number: z.number().int().min(0),
  interaction_type: z.enum(["greeting", "advice", "request", "gossip"]).default("greeting"),
});
export type PendingNpcDialogue = z.infer<typeof PendingNpcDialogueSchema>;

// ── Complete Game State (Save Format) ───────────────────────────────────────

export const GameStateSchema = z.object({
  version: z.string(),
  character: CharacterSchema,
  world: WorldSchema,
  dynasty: DynastySchema,
  npcs: z.array(NpcSchema),
  current_event: CurrentEventSchema.nullable(),
  // Marker for a triggered-but-not-yet-generated event. advanceTurn returns the
  // synchronous engine result immediately (no LLM on the critical path) and stamps
  // this; generateEventForTurn then produces current_event and clears it. Older
  // saves missing this field default to null on load.
  pending_event_type: EventTypeSchema.nullable().default(null),
  // Background-prefetched events keyed by event type (see EventCacheSchema). Served
  // by generateEventForTurn on a stamp match; refilled in the background after each
  // turn/event. Older saves missing this field default to {} on load.
  event_cache: EventCacheSchema,
  // Marker for an N1 NPC dialogue that should be generated after advanceTurn has
  // already returned. Older saves missing this field default to null on load.
  pending_npc_dialogue: PendingNpcDialogueSchema.nullable().default(null),
  pending_relic_draft: RelicDraftSchema.nullable().default(null),
  turn_number: z.number().int().min(0),
  rng_seed: z.number().int(),
});
export type GameState = z.infer<typeof GameStateSchema>;
