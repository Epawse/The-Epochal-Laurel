/**
 * Relic catalogue, draft generation, shop purchase, and heirloom selection.
 * Pure deterministic engine logic; all randomness flows through Rng.
 */

import type {
  GameState,
  Relic,
  RelicDraft,
  RelicDraftSource,
} from "@/lib/game/schema";
import type { ActionId, Era } from "@/lib/game/constants";
import type { Rng } from "./rng";

type RelicTag = "academic" | "social" | "scheme" | "wealth" | "survival" | "starter";

type RelicDef = Relic & {
  tags: RelicTag[];
  eras?: Era[];
};

const SHOP_MIN_WEALTH = 15;

export const RELIC_CATALOG: readonly RelicDef[] = [
  {
    id: "wenquxing_charm",
    name: "文曲星君签",
    rarity: "common",
    slot: "common",
    tags: ["academic", "starter"],
    effects: [{ kind: "exam_score", value: 4 }],
    flavor: "签文不知真假，考前摸一摸总归心安。",
  },
  {
    id: "annotated_classics",
    name: "朱批旧经",
    rarity: "rare",
    slot: "heirloom_eligible",
    tags: ["academic"],
    effects: [{ kind: "exam_score", value: 8, levels: ["metropolitan", "palace"] }],
    flavor: "祖上圈点过的旧书，朱墨之间像藏着一条窄路。",
  },
  {
    id: "inkstone_of_focus",
    name: "凝神砚",
    rarity: "common",
    slot: "common",
    tags: ["academic", "starter"],
    effects: [{ kind: "action_gain", action: "study", stat: "erudition", value: 1 }],
    flavor: "磨墨时心绪渐静，读书也多进一寸。",
  },
  {
    id: "patron_letter",
    name: "贵人手札",
    rarity: "rare",
    slot: "heirloom_eligible",
    tags: ["social"],
    effects: [
      { kind: "dice_modifier", category: "social", value: 3 },
      { kind: "exam_threshold", levels: ["provincial"], value: -3 },
    ],
    flavor: "字迹潦草，却足以让门房多看你一眼。",
  },
  {
    id: "banquet_tokens",
    name: "曲水筹牌",
    rarity: "common",
    slot: "common",
    tags: ["social", "starter"],
    effects: [{ kind: "action_gain", action: "socialize", stat: "fortune", value: 2 }],
    flavor: "席间递出一枚筹牌，寒暄便少了几分尴尬。",
  },
  {
    id: "whispered_genealogy",
    name: "秘抄谱牒",
    rarity: "legendary",
    slot: "heirloom_eligible",
    tags: ["social", "scheme"],
    effects: [{ kind: "exam_alignment_relax", levels: ["metropolitan", "palace"] }],
    flavor: "谱中旁注了太多名字，像一张隐秘的网。",
  },
  {
    id: "shadow_account_book",
    name: "暗账册",
    rarity: "rare",
    slot: "common",
    tags: ["scheme", "wealth"],
    effects: [
      { kind: "dice_modifier", category: "scheme", value: 3 },
      { kind: "action_gain", action: "scheme", stat: "fortune", value: 2 },
    ],
    flavor: "知道谁收过银子，有时比银子本身更值钱。",
  },
  {
    id: "sealed_bribe_pouch",
    name: "封缄银袋",
    rarity: "common",
    slot: "common",
    tags: ["scheme", "wealth"],
    effects: [{ kind: "action_cost", action: "scheme", stat: "wealth", value: 2 }],
    flavor: "银袋封口整齐，数额刚好不至于太难看。",
  },
  {
    id: "silver_abacus",
    name: "铁算盘",
    rarity: "common",
    slot: "heirloom_eligible",
    tags: ["wealth", "starter"],
    effects: [{ kind: "action_gain", action: "earn", stat: "wealth", value: 3 }],
    flavor: "珠响清脆，家计便有了回音。",
  },
  {
    id: "traveling_medicine",
    name: "行囊药匣",
    rarity: "rare",
    slot: "common",
    tags: ["survival"],
    effects: [
      { kind: "meta", key: "max_age", value: 3 },
      { kind: "exam_score", value: 3 },
    ],
    flavor: "药味苦，命却因此多了一点韧性。",
  },
  {
    id: "survivors_tablet",
    name: "劫后木牌",
    rarity: "legendary",
    slot: "heirloom_eligible",
    tags: ["survival"],
    effects: [
      { kind: "dice_modifier", category: "*", value: 2 },
      { kind: "exam_score", value: 5 },
    ],
    flavor: "木牌边缘焦黑，像是从灾年里硬抢回来的一口气。",
  },
  {
    id: "lucky_coin",
    name: "压胜钱",
    rarity: "common",
    slot: "common",
    tags: ["survival", "social", "starter"],
    effects: [{ kind: "dice_modifier", category: "*", value: 1 }],
    flavor: "铜钱磨得发亮，至少能让人假装天命在手。",
  },
];

const ACTION_DRAFT_RULES: Partial<Record<ActionId, { chance: number; tags: RelicTag[] }>> = {
  study: { chance: 0.1, tags: ["academic"] },
  socialize: { chance: 0.15, tags: ["social"] },
  scheme: { chance: 0.2, tags: ["scheme"] },
};

export function maybeCreateActionRelicDraft(
  state: GameState,
  actionId: ActionId,
  rng: Rng
): RelicDraft | null {
  const rule = ACTION_DRAFT_RULES[actionId];
  if (!rule || state.pending_relic_draft) return null;
  if (rng.next() >= rule.chance) return null;
  return createRelicDraft(state, rng, "action", rule.tags);
}

export function createMerchantRelicDraft(state: GameState, rng: Rng): RelicDraft {
  if (state.character.stats.wealth < SHOP_MIN_WEALTH) {
    throw new Error("merchant_shop_requires_wealth_15");
  }
  const draft = createRelicDraft(state, rng, "shop", [
    "academic",
    "social",
    "scheme",
    "wealth",
    "survival",
  ]);
  if (!draft) {
    throw new Error("relic_pool_exhausted");
  }
  return draft;
}

export function pickStartingRelic(state: GameState, rng: Rng): Relic | null {
  const def = drawOneRelic(rng, ["starter"], state.world.era, new Set());
  return def ? toRelic(def) : null;
}

export function createRelicDraft(
  state: GameState,
  rng: Rng,
  source: RelicDraftSource,
  tags: readonly RelicTag[] = []
): RelicDraft | null {
  const picked: Relic[] = [];
  const excluded = new Set([
    ...state.character.seen_relic_ids,
    ...state.character.relics.map((relic) => relic.id),
  ]);

  for (let i = 0; i < 3; i++) {
    const relic = drawOneRelic(rng, tags, state.world.era, excluded);
    if (!relic) break;
    excluded.add(relic.id);
    picked.push(toRelic(relic));
  }

  if (picked.length === 0) {
    return null;
  }

  return {
    id: `draft_${state.turn_number}_${source}_${picked.map((relic) => relic.id).join("_")}`,
    source,
    options: picked.map((relic) => ({
      relic,
      cost: source === "shop" ? relicCost(relic) : 0,
    })),
    created_turn: state.turn_number,
  };
}

export function createRelicDraftFromIds(
  state: GameState,
  rng: Rng,
  source: RelicDraftSource,
  relicIds: readonly string[]
): RelicDraft | null {
  const excluded = new Set([
    ...state.character.seen_relic_ids,
    ...state.character.relics.map((relic) => relic.id),
  ]);
  const picked: Relic[] = [];

  for (const relicId of relicIds) {
    if (picked.length >= 3 || excluded.has(relicId)) continue;
    const relic = findRelicById(relicId);
    if (!relic) continue;
    picked.push(relic);
    excluded.add(relic.id);
  }

  while (picked.length < 3) {
    const relic = drawOneRelic(rng, [], state.world.era, excluded);
    if (!relic) break;
    picked.push(toRelic(relic));
    excluded.add(relic.id);
  }

  if (picked.length === 0) {
    return null;
  }

  return {
    id: `draft_${state.turn_number}_${source}_${picked.map((relic) => relic.id).join("_")}`,
    source,
    options: picked.map((relic) => ({
      relic,
      cost: source === "shop" ? relicCost(relic) : 0,
    })),
    created_turn: state.turn_number,
  };
}

export function findRelicById(id: string): Relic | null {
  const relic = RELIC_CATALOG.find((candidate) => candidate.id === id);
  return relic ? toRelic(relic) : null;
}

export function queueRelicDraft(state: GameState, draft: RelicDraft): GameState {
  const next = structuredClone(state) as GameState;
  next.pending_relic_draft = draft;
  const seen = new Set(next.character.seen_relic_ids);
  for (const option of draft.options) {
    seen.add(option.relic.id);
  }
  next.character.seen_relic_ids = [...seen];
  return next;
}

export function chooseRelicFromDraft(
  state: GameState,
  relicId: string
): GameState {
  if (!state.pending_relic_draft) {
    throw new Error("No pending relic draft");
  }

  const option = state.pending_relic_draft.options.find(
    (candidate) => candidate.relic.id === relicId
  );
  if (!option) {
    throw new Error(`Unknown relic draft option: ${relicId}`);
  }

  if (option.cost > state.character.stats.wealth) {
    throw new Error("not_enough_wealth_for_relic");
  }

  const next = structuredClone(state) as GameState;
  next.character.relics = upsertRelic(next.character.relics, option.relic);
  next.character.stats.wealth -= option.cost;
  next.pending_relic_draft = null;
  return next;
}

export function chooseHeirloomRelic(
  state: GameState,
  relicId: string | null
): Relic | null {
  if (relicId === null) return null;

  const relic = state.character.relics.find((candidate) => candidate.id === relicId);
  if (!relic) {
    throw new Error(`Unknown heirloom relic: ${relicId}`);
  }
  if (relic.slot !== "heirloom_eligible") {
    throw new Error(`Relic is not heirloom eligible: ${relicId}`);
  }
  return relic;
}

export function relicCost(relic: Pick<Relic, "rarity">): number {
  switch (relic.rarity) {
    case "common":
      return 15;
    case "rare":
      return 25;
    case "legendary":
      return 40;
  }
}

function drawOneRelic(
  rng: Rng,
  tags: readonly RelicTag[],
  era: Era,
  excluded: Set<string>
): RelicDef | null {
  const rarity = rollRarity(rng);
  const primary = filterRelics({ tags, era, excluded, rarity });
  const fallbackTagged = filterRelics({ tags, era, excluded });
  const fallbackAny = filterRelics({ tags: [], era, excluded });
  const candidates = primary.length > 0
    ? primary
    : fallbackTagged.length > 0
      ? fallbackTagged
      : fallbackAny;
  if (candidates.length === 0) {
    return null;
  }
  return candidates[rng.nextInt(0, candidates.length - 1)];
}

function rollRarity(rng: Rng): Relic["rarity"] {
  const roll = rng.nextInt(1, 100);
  if (roll <= 60) return "common";
  if (roll <= 90) return "rare";
  return "legendary";
}

function filterRelics({
  tags,
  era,
  excluded,
  rarity,
}: {
  tags: readonly RelicTag[];
  era: Era;
  excluded: Set<string>;
  rarity?: Relic["rarity"];
}): RelicDef[] {
  return RELIC_CATALOG.filter((relic) => {
    if (excluded.has(relic.id)) return false;
    if (rarity && relic.rarity !== rarity) return false;
    if (relic.eras && !relic.eras.includes(era)) return false;
    if (tags.length > 0 && !tags.some((tag) => relic.tags.includes(tag))) return false;
    return true;
  });
}

function toRelic(def: RelicDef): Relic {
  return {
    id: def.id,
    name: def.name,
    rarity: def.rarity,
    slot: def.slot,
    effects: def.effects,
    flavor: def.flavor,
  };
}

function upsertRelic(relics: readonly Relic[], relic: Relic): Relic[] {
  if (relics.some((existing) => existing.id === relic.id)) return [...relics];
  return [...relics, relic];
}
