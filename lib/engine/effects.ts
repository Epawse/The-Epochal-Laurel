/**
 * Typed effect evaluation for relics, skills, traits, blessings, and modifiers.
 * Pure helpers only: callers decide when to collect and apply these effects.
 */

import type {
  ActionId,
  DiceCategory,
  Effect,
  ExamLevelId,
  Modifier,
  StatKey,
  Character,
  World,
} from "@/lib/game/schema";
import { BLESSINGS } from "@/lib/game/constants";

const ORIGIN_TRAIT_MODIFIERS: Record<Character["origin"], Modifier[]> = {
  humble_scholar: [
    {
      id: "origin_humble_scholar_study_cost",
      source: { type: "origin", id: "humble_scholar" },
      label: "囊萤映雪",
      effect: { kind: "action_cost", action: "study", stat: "drive", value: 0 },
      turns_remaining: null,
    },
  ],
  farming_family: [
    {
      id: "origin_farming_family_provincial_threshold",
      source: { type: "origin", id: "farming_family" },
      label: "宗族荫庇",
      effect: { kind: "exam_threshold", levels: ["provincial"], value: -5 },
      turns_remaining: null,
    },
  ],
  merchant_son: [
    {
      id: "origin_merchant_son_social_penalty",
      source: { type: "origin", id: "merchant_son" },
      label: "铜臭难洗",
      effect: { kind: "dice_modifier", category: "social", value: -2 },
      turns_remaining: null,
    },
  ],
  official_decline: [
    {
      id: "origin_official_decline_connection",
      source: { type: "origin", id: "official_decline" },
      label: "旧日荣光",
      effect: { kind: "meta", key: "starting_connection", value: 1 },
      turns_remaining: null,
    },
  ],
};

export function collectModifiers(character: Character, world: World): Modifier[] {
  const collected = [
    ...character.modifiers,
    ...world.world_modifiers,
    ...legacyStatusEffectsToModifiers(character.status_effects),
    ...originFallbackModifiers(character),
    ...character.relics.flatMap((relic) =>
      relic.effects.map((effect, index): Modifier => ({
        id: `relic_${relic.id}_${index}`,
        source: { type: "relic", id: relic.id },
        label: relic.name,
        effect,
        turns_remaining: null,
      }))
    ),
    ...character.skills.flatMap((skill) =>
      skill.kind === "passive"
        ? skill.effects.map((effect, index): Modifier => ({
            id: `skill_${skill.id}_${index}`,
            source: { type: "skill", id: skill.id },
            label: skill.name,
            effect,
            turns_remaining: null,
          }))
        : []
    ),
  ];

  return dedupePermanentModifiers(activeModifiers(collected));
}

export function modifiersForBlessingIds(ids: Iterable<string>): Modifier[] {
  const modifiers: Modifier[] = [];
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);

    const blessing = BLESSINGS.find((candidate) => candidate.id === id);
    if (!blessing) continue;
    const effects = blessingEffects(id);
    for (const [index, effect] of effects.entries()) {
      modifiers.push({
        id: `blessing_${id}_${index}`,
        source: { type: "blessing", id },
        label: blessing.name,
        effect,
        turns_remaining: null,
      });
    }
  }

  return modifiers;
}

export function activeModifiers(modifiers: readonly Modifier[]): Modifier[] {
  return modifiers.filter((modifier) => modifier.turns_remaining === null || modifier.turns_remaining > 0);
}

export function tickModifiers(modifiers: readonly Modifier[]): Modifier[] {
  return modifiers
    .map((modifier) => {
      if (modifier.turns_remaining === null) return modifier;
      return { ...modifier, turns_remaining: modifier.turns_remaining - 1 };
    })
    .filter((modifier) => modifier.turns_remaining === null || modifier.turns_remaining > 0);
}

export function isActionBlocked(action: string, modifiers: readonly Modifier[]): boolean {
  if (!isActionId(action)) return false;
  return activeModifiers(modifiers).some(
    (modifier) =>
      modifier.effect.kind === "action_block" && modifier.effect.actions.includes(action)
  );
}

export function applyActionDeltaModifiers(
  action: string,
  stat: StatKey,
  baseDelta: number,
  modifiers: readonly Modifier[]
): number {
  if (!isActionId(action)) return baseDelta;

  let delta = baseDelta;
  let multiplier = 1;

  for (const modifier of activeModifiers(modifiers)) {
    const effect = modifier.effect;
    if (!effectAppliesToAction(effect, action)) continue;

    if (effect.kind === "action_gain" && effect.stat === stat) {
      delta += effect.value ?? 0;
      multiplier *= effect.mult ?? 1;
    }

    if (effect.kind === "action_cost" && effect.stat === stat && baseDelta < 0) {
      const nextCost = Math.min(Math.abs(delta), effect.value);
      delta = nextCost === 0 ? 0 : -nextCost;
    }
  }

  return Math.round(delta * multiplier);
}

export function applyExamScoreModifiers(
  level: ExamLevelId,
  baseScore: number,
  modifiers: readonly Modifier[]
): number {
  let score = baseScore;
  let multiplier = 1;

  for (const modifier of activeModifiers(modifiers)) {
    const effect = modifier.effect;
    if (effect.kind !== "exam_score") continue;
    if (effect.levels && !effect.levels.includes(level)) continue;

    score += effect.value ?? 0;
    multiplier *= effect.mult ?? 1;
  }

  return Math.round(score * multiplier);
}

export function applyExamThresholdModifiers(
  level: ExamLevelId,
  baseThreshold: number,
  modifiers: readonly Modifier[]
): number {
  return activeModifiers(modifiers).reduce((threshold, modifier) => {
    const effect = modifier.effect;
    if (effect.kind !== "exam_threshold" || !effect.levels.includes(level)) {
      return threshold;
    }
    return threshold + effect.value;
  }, baseThreshold);
}

export function isExamAlignmentRelaxed(
  level: ExamLevelId,
  modifiers: readonly Modifier[]
): boolean {
  return activeModifiers(modifiers).some(
    (modifier) =>
      modifier.effect.kind === "exam_alignment_relax" &&
      modifier.effect.levels.includes(level)
  );
}

export function diceModifierFor(
  category: DiceCategory,
  modifiers: readonly Modifier[]
): number {
  return activeModifiers(modifiers).reduce((total, modifier) => {
    const effect = modifier.effect;
    if (effect.kind !== "dice_modifier") return total;
    if (effect.category !== "*" && effect.category !== category) return total;
    return total + effect.value;
  }, 0);
}

export function hasMetaModifier(
  key: string,
  modifiers: readonly Modifier[]
): boolean {
  return activeModifiers(modifiers).some(
    (modifier) => modifier.effect.kind === "meta" && modifier.effect.key === key
  );
}

export function metaModifierValue(
  key: string,
  modifiers: readonly Modifier[]
): number {
  return activeModifiers(modifiers).reduce((total, modifier) => {
    const effect = modifier.effect;
    if (effect.kind !== "meta" || effect.key !== key) return total;
    return total + effect.value;
  }, 0);
}

function effectAppliesToAction(effect: Effect, action: ActionId): boolean {
  if (effect.kind !== "action_gain" && effect.kind !== "action_cost") {
    return false;
  }
  return effect.action === "*" || effect.action === action;
}

function dedupePermanentModifiers(modifiers: readonly Modifier[]): Modifier[] {
  const seen = new Set<string>();
  const result: Modifier[] = [];

  for (const modifier of modifiers) {
    if (modifier.turns_remaining === null) {
      const key = `${modifier.source.type}:${modifier.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
    }
    result.push(modifier);
  }

  return result;
}

function legacyStatusEffectsToModifiers(
  effects: Character["status_effects"]
): Modifier[] {
  return effects.map((effect): Modifier => ({
    id: `legacy_status_${effect.type}`,
    source: { type: "legacy", id: effect.type },
    label: effect.type,
    effect: legacyStatusEffectToEffect(effect.type),
    turns_remaining: effect.turns_remaining,
  }));
}

function legacyStatusEffectToEffect(type: string): Effect {
  if (type === "mourning") {
    return { kind: "action_block", actions: ["socialize", "scheme"] };
  }

  return { kind: "meta", key: type, value: 1 };
}

function originFallbackModifiers(character: Character): Modifier[] {
  const hasOriginSkill = character.skills.some((skill) =>
    skill.id.startsWith(`origin_${character.origin}`)
  );
  return hasOriginSkill ? [] : ORIGIN_TRAIT_MODIFIERS[character.origin];
}

function blessingEffects(id: string): Effect[] {
  switch (id) {
    case "photographic_memory":
      return [{ kind: "action_gain", action: "study", stat: "erudition", value: 2 }];
    case "bribery_skill":
      return [
        { kind: "dice_modifier", category: "scheme", value: 3 },
        { kind: "meta", key: "scheme_exposure", value: -0.05 },
      ];
    case "official_connections":
      return [
        { kind: "action_gain", action: "socialize", stat: "fortune", value: 3 },
        { kind: "dice_modifier", category: "social", value: 2 },
      ];
    case "mourning_exemption":
      return [{ kind: "meta", key: "skip_mourning", value: 1 }];
    case "merchant_lineage":
      return [{ kind: "action_gain", action: "earn", stat: "wealth", value: 5 }];
    default:
      return [];
  }
}

function isActionId(action: string): action is ActionId {
  return action === "study" ||
    action === "socialize" ||
    action === "earn" ||
    action === "rest" ||
    action === "scheme";
}
