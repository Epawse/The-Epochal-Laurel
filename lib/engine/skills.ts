/**
 * Skill kits. Skills are data carriers for typed Effects; the engine evaluates
 * passive skills through collectModifiers.
 */

import type { Origin } from "@/lib/game/constants";
import type { Skill } from "@/lib/game/schema";

export const SKILL_CATALOG: readonly Skill[] = [
  {
    id: "event_clear_argument",
    name: "明辨利害",
    kind: "passive",
    effects: [{ kind: "dice_modifier", category: "event", value: 2 }],
    cooldown_remaining: 0,
  },
  {
    id: "event_exam_poise",
    name: "临场不乱",
    kind: "passive",
    effects: [{ kind: "dice_modifier", category: "exam", value: 2 }],
    cooldown_remaining: 0,
  },
  {
    id: "event_social_grace",
    name: "席间圆转",
    kind: "passive",
    effects: [{ kind: "dice_modifier", category: "social", value: 2 }],
    cooldown_remaining: 0,
  },
] as const;

export function findSkillById(id: string): Skill | null {
  const skill = SKILL_CATALOG.find((candidate) => candidate.id === id);
  return skill ? structuredClone(skill) as Skill : null;
}

export function originSkillKit(origin: Origin): Skill[] {
  switch (origin) {
    case "humble_scholar":
      return [
        {
          id: "origin_humble_scholar_passive",
          name: "囊萤映雪",
          kind: "passive",
          effects: [{ kind: "action_cost", action: "study", stat: "drive", value: 0 }],
          cooldown_remaining: 0,
        },
        {
          id: "origin_humble_scholar_active",
          name: "悬梁刺股",
          kind: "active",
          effects: [{ kind: "action_gain", action: "study", stat: "erudition", mult: 2 }],
          cost: { drive: 8 },
          cooldown_cycles: 1,
          cooldown_remaining: 0,
        },
      ];
    case "farming_family":
      return [
        {
          id: "origin_farming_family_passive",
          name: "宗族荫庇",
          kind: "passive",
          effects: [{ kind: "exam_threshold", levels: ["provincial"], value: -5 }],
          cooldown_remaining: 0,
        },
        {
          id: "origin_farming_family_active",
          name: "族中相助",
          kind: "active",
          effects: [{ kind: "dice_modifier", category: "event", value: 5 }],
          cost: { wealth: 5 },
          cooldown_cycles: 1,
          cooldown_remaining: 0,
        },
      ];
    case "merchant_son":
      return [
        {
          id: "origin_merchant_son_passive",
          name: "铜臭难洗",
          kind: "passive",
          effects: [{ kind: "dice_modifier", category: "social", value: -2 }],
          cooldown_remaining: 0,
        },
        {
          id: "origin_merchant_son_active",
          name: "挥金如土",
          kind: "active",
          effects: [{ kind: "meta", key: "shop_draft", value: 1 }],
          cost: { wealth: 20 },
          cooldown_cycles: 1,
          cooldown_remaining: 0,
        },
      ];
    case "official_decline":
      return [
        {
          id: "origin_official_decline_passive",
          name: "旧日荣光",
          kind: "passive",
          effects: [{ kind: "meta", key: "starting_connection", value: 1 }],
          cooldown_remaining: 0,
        },
        {
          id: "origin_official_decline_active",
          name: "故交旧识",
          kind: "active",
          effects: [{ kind: "intel_grant", dimension: "style", level: "full" }],
          cost: { fortune: 10 },
          cooldown_cycles: 1,
          cooldown_remaining: 0,
        },
      ];
  }
}
