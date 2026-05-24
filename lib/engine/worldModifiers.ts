/**
 * Era-scoped world modifiers. These are deterministic, typed Effect carriers
 * that bias whole-run conditions without letting AI decide numbers.
 */

import type { Era } from "@/lib/game/constants";
import type { Modifier } from "@/lib/game/schema";
import type { Rng } from "./rng";

const WORLD_MODIFIER_CHANCE = 0.3;

type WorldModifierDef = Omit<Modifier, "id"> & { id: string };

const WORLD_MODIFIER_POOL: Record<Era, readonly WorldModifierDef[]> = {
  prosperity: [
    {
      id: "world_prosperity_auspicious_omens",
      source: { type: "world", id: "auspicious_omens" },
      label: "天降祥瑞",
      effect: { kind: "event_bias", event_type: "opportunity", weight_mult: 1.5 },
      turns_remaining: null,
    },
    {
      id: "world_prosperity_scholarly_fashion",
      source: { type: "world", id: "scholarly_fashion" },
      label: "文风鼎盛",
      effect: { kind: "action_gain", action: "study", stat: "erudition", value: 1 },
      turns_remaining: null,
    },
  ],
  decline: [
    {
      id: "world_decline_hard_times",
      source: { type: "world", id: "hard_times" },
      label: "世道艰难",
      effect: { kind: "event_bias", event_type: "misfortune", weight_mult: 1.5 },
      turns_remaining: null,
    },
    {
      id: "world_decline_corrupt_gates",
      source: { type: "world", id: "corrupt_gates" },
      label: "关节横生",
      effect: { kind: "meta", key: "scheme_exposure", value: 0.05 },
      turns_remaining: null,
    },
  ],
  invasion: [
    {
      id: "world_invasion_war_clouds",
      source: { type: "world", id: "war_clouds" },
      label: "兵燹四起",
      effect: {
        kind: "event_bias",
        event_type: "misfortune",
        weight_mult: 1.8,
        danger_mult: 1.5,
      },
      turns_remaining: null,
    },
    {
      id: "world_invasion_refugee_network",
      source: { type: "world", id: "refugee_network" },
      label: "流离相护",
      effect: { kind: "dice_modifier", category: "event", value: 2 },
      turns_remaining: null,
    },
  ],
  restoration: [
    {
      id: "world_restoration_merit_revival",
      source: { type: "world", id: "merit_revival" },
      label: "中兴求贤",
      effect: {
        kind: "exam_threshold",
        levels: ["county", "provincial", "metropolitan"],
        value: -3,
      },
      turns_remaining: null,
    },
    {
      id: "world_restoration_market_reopens",
      source: { type: "world", id: "market_reopens" },
      label: "百业渐兴",
      effect: { kind: "action_gain", action: "earn", stat: "wealth", value: 3 },
      turns_remaining: null,
    },
  ],
};

export function maybeCreateWorldModifiers(era: Era, rng: Rng): Modifier[] {
  if (rng.next() >= WORLD_MODIFIER_CHANCE) return [];
  return [pickWorldModifier(era, rng)];
}

export function pickWorldModifier(era: Era, rng: Rng): Modifier {
  const pool = WORLD_MODIFIER_POOL[era];
  return structuredClone(pool[rng.nextInt(0, pool.length - 1)]) as Modifier;
}

export function worldModifierOptionsForEra(era: Era): Modifier[] {
  return structuredClone(WORLD_MODIFIER_POOL[era]) as Modifier[];
}
