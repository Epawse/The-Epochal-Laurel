// Enums, lookup tables, and authoritative numerical constants from game-design/balance.md.

export type Era = "prosperity" | "decline" | "invasion" | "restoration";
export type Season = "spring" | "summer" | "autumn" | "winter";
export type ExamLevel = "county" | "provincial" | "metropolitan" | "palace";
export type EventType = "opportunity" | "misfortune" | "social" | "political";
export type Origin =
  | "humble_scholar"
  | "farming_family"
  | "merchant_son"
  | "official_decline";
export type CourtStyle = "pragmatic" | "ornate" | "orthodox" | "radical";
export type EmperorTemperament =
  | "ambitious"
  | "lazy"
  | "paranoid"
  | "benevolent";

// ── Origin Definitions (balance.md) ─────────────────────────────────────────

export interface OriginDef {
  id: Origin;
  label: string;
  labelEn: string;
  modifiers: { erudition: number; fortune: number; drive: number; wealth: number };
  trait: string;
  flavor: string;
}

export const ORIGINS: Record<Origin, OriginDef> = {
  humble_scholar: {
    id: "humble_scholar",
    label: "寒门孤儿",
    labelEn: "Humble Scholar",
    modifiers: { erudition: 5, fortune: -20, drive: 10, wealth: 0 },
    trait: "囊萤映雪",
    flavor: "Hardship breeds resilience",
  },
  farming_family: {
    id: "farming_family",
    label: "耕读之家",
    labelEn: "Farming Family",
    modifiers: { erudition: 15, fortune: 10, drive: 0, wealth: 5 },
    trait: "宗族荫庇",
    flavor: "Stable foundation",
  },
  merchant_son: {
    id: "merchant_son",
    label: "盐商庶子",
    labelEn: "Merchant Son",
    modifiers: { erudition: 0, fortune: 5, drive: 0, wealth: 30 },
    trait: "铜臭难洗",
    flavor: "Rich but scorned",
  },
  official_decline: {
    id: "official_decline",
    label: "没落官宦",
    labelEn: "Fallen Official",
    modifiers: { erudition: 10, fortune: -10, drive: -10, wealth: 10 },
    trait: "旧日荣光",
    flavor: "Past glory, present shame",
  },
} as const;

// ── Base Stats (Generation 1, before origin modifiers) ──────────────────────

export const BASE_STATS = {
  erudition: 15,
  fortune: 30,
  drive: 100,
  wealth: 5,
} as const;

// ── Stat Boundaries ─────────────────────────────────────────────────────────

export const STAT_BOUNDARIES = {
  erudition: { min: 0, max: 100 },
  fortune: { min: -50, max: 100 },
  drive: { min: 0, max: 100 },
  wealth: { min: 0, max: 200 },
} as const;

// ── Title Values (for legacy/reputation calculation) ────────────────────────

export const TITLE_VALUES: Record<string, number> = {
  秀才: 10,
  举人: 30,
  贡士: 50,
  进士: 80,
  状元: 100,
} as const;

// ── Title Rank (single source of truth for prestige ordering) ───────────────
// Status order (low → high): 白身 < 秀才 < 举人 < 贡士 < 进士 < 探花 < 榜眼 < 状元.
// Palace top-3 prestige follows 状元(1st) > 榜眼(2nd) > 探花(3rd); 进士 is 4th.
// Mirror of exam.ts PALACE_TITLES ordering — consume this everywhere a "highest
// title" is computed so the 榜眼/探花 order never drifts again.
export const TITLE_RANK: Record<string, number> = {
  白身: 0,
  秀才: 1,
  举人: 2,
  贡士: 3,
  进士: 4,
  探花: 5,
  榜眼: 6,
  状元: 7,
} as const;

/** Return the highest-prestige title in a list, or 白身 if none. */
export function highestTitleOf(titles: string[]): string {
  let best = "白身";
  for (const t of titles) {
    if ((TITLE_RANK[t] ?? -1) > (TITLE_RANK[best] ?? 0)) best = t;
  }
  return best;
}

// ── Exam Thresholds ─────────────────────────────────────────────────────────

export const EXAM_THRESHOLDS: Record<ExamLevel, number | null> = {
  county: 40,
  provincial: 60,
  metropolitan: 75,
  palace: null, // ranking only, no pass/fail
} as const;

export const EXAM_REQUIREMENTS: Record<
  ExamLevel,
  { min_erudition: number; required_title: string | null }
> = {
  county: { min_erudition: 20, required_title: null },
  provincial: { min_erudition: 50, required_title: "秀才" },
  metropolitan: { min_erudition: 80, required_title: "举人" },
  palace: { min_erudition: 0, required_title: "贡士" },
} as const;

export const EXAM_REWARDS: Record<ExamLevel, string> = {
  county: "秀才",
  provincial: "举人",
  metropolitan: "贡士",
  palace: "进士",
} as const;

// ── Action Definitions ──────────────────────────────────────────────────────

export interface ActionDef {
  id: string;
  label: string;
  labelEn: string;
  effects: {
    erudition: [number, number];
    fortune: [number, number];
    drive: [number, number];
    wealth: [number, number];
  };
  notes: string;
}

export const ACTIONS: ActionDef[] = [
  {
    id: "study",
    label: "读书",
    labelEn: "Study",
    effects: {
      erudition: [3, 5],
      fortune: [0, 0],
      drive: [-2, -2],
      wealth: [0, 0],
    },
    notes: "Diminishing returns above 80",
  },
  {
    id: "socialize",
    label: "交游",
    labelEn: "Socialize",
    effects: {
      erudition: [1, 1],
      fortune: [3, 5],
      drive: [-1, -1],
      wealth: [-1, -1],
    },
    notes: "Requires Erudition >= 20",
  },
  {
    id: "earn",
    label: "营生",
    labelEn: "Earn",
    effects: {
      erudition: [-1, -1],
      fortune: [0, 0],
      drive: [-1, -1],
      wealth: [5, 10],
    },
    notes: "",
  },
  {
    id: "rest",
    label: "休养",
    labelEn: "Rest",
    effects: {
      erudition: [0, 0],
      fortune: [1, 1],
      drive: [5, 8],
      wealth: [-1, -1],
    },
    notes: "",
  },
  {
    id: "scheme",
    label: "钻营",
    labelEn: "Scheme",
    effects: {
      erudition: [0, 0],
      fortune: [5, 10],
      drive: [-3, -3],
      wealth: [-3, -5],
    },
    notes: "15% exposure risk",
  },
] as const;

// ── Era Modifiers ───────────────────────────────────────────────────────────

export interface EraModifiers {
  exam_threshold_modifier: number;
  event_danger: "low" | "medium" | "high";
  opportunity_frequency: "low" | "medium" | "high";
  child_survival_rate: number;
}

export const ERA_MODIFIERS: Record<Era, EraModifiers> = {
  prosperity: {
    exam_threshold_modifier: 0,
    event_danger: "low",
    opportunity_frequency: "high",
    child_survival_rate: 0.7,
  },
  decline: {
    exam_threshold_modifier: 5,
    event_danger: "medium",
    opportunity_frequency: "medium",
    child_survival_rate: 0.6,
  },
  invasion: {
    exam_threshold_modifier: 15,
    event_danger: "high",
    opportunity_frequency: "low",
    child_survival_rate: 0.45,
  },
  restoration: {
    exam_threshold_modifier: 10,
    event_danger: "medium",
    opportunity_frequency: "high",
    child_survival_rate: 0.65,
  },
} as const;

// ── Era Transition (Constrained Markov Chain) ───────────────────────────────

export const ERA_TRANSITIONS: Record<Era, Array<{ next: Era; weight: number }>> = {
  prosperity: [
    { next: "decline", weight: 60 },
    { next: "invasion", weight: 40 },
  ],
  decline: [
    { next: "invasion", weight: 60 },
    { next: "restoration", weight: 40 },
  ],
  invasion: [{ next: "restoration", weight: 100 }],
  restoration: [{ next: "prosperity", weight: 100 }],
} as const;

// ── Blessing Categories ─────────────────────────────────────────────────────

export type BlessingCategory = "academic" | "social" | "survival" | "wealth";

export interface BlessingDef {
  id: string;
  name: string;
  category: BlessingCategory;
  cost: number;
  effect: string;
}

export const BLESSINGS: BlessingDef[] = [
  { id: "family_learning", name: "家学渊源", category: "academic", cost: 30, effect: "starting_erudition_+20" },
  { id: "photographic_memory", name: "过目不忘", category: "academic", cost: 40, effect: "study_gain_+2" },
  { id: "bribery_skill", name: "行贿有方", category: "social", cost: 30, effect: "scheme_success_+15%" },
  { id: "official_connections", name: "官场人脉", category: "social", cost: 35, effect: "socialize_fortune_+3" },
  { id: "mourning_exemption", name: "夺情特许", category: "survival", cost: 25, effect: "skip_mourning" },
  { id: "iron_constitution", name: "命硬", category: "survival", cost: 45, effect: "max_age_+10" },
  { id: "ancestral_estate", name: "祖产丰厚", category: "wealth", cost: 30, effect: "starting_wealth_+20" },
  { id: "merchant_lineage", name: "商道传家", category: "wealth", cost: 35, effect: "earn_wealth_+5" },
] as const;

// ── Victory Tiers ───────────────────────────────────────────────────────────

export interface VictoryTier {
  tier: string;
  condition: string;
  multiplier: number;
}

export const VICTORY_TIERS: VictoryTier[] = [
  { tier: "S", condition: "状元 in ≤ 3 generations", multiplier: 3.0 },
  { tier: "A", condition: "状元 in any generation", multiplier: 2.0 },
  { tier: "B", condition: "进士 in ≤ 3 generations", multiplier: 1.5 },
  { tier: "C", condition: "进士 in any generation", multiplier: 1.0 },
  { tier: "D", condition: "举人 but never 进士 (10 gen limit)", multiplier: 0.5 },
  { tier: "F", condition: "Family line dies out", multiplier: 0.0 },
] as const;
