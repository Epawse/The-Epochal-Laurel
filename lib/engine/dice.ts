/**
 * Seeded dice checks used by events, scheme/social rolls, and exam variance.
 */

import type { DiceCategory } from "@/lib/game/schema";
import type { Rng } from "./rng";
import { diceModifierFor } from "./effects";
import type { Modifier } from "@/lib/game/schema";

export type DiceTier = "crit_success" | "success" | "fail" | "crit_fail";

export interface DiceSpec {
  count: number;
  sides: number;
  bonus?: number;
}

export interface RollCheckInput {
  rng: Rng;
  dc: number;
  modifier?: number;
  dice?: DiceSpec;
  category?: DiceCategory;
  modifiers?: readonly Modifier[];
}

export interface RollCheckResult {
  rolls: number[];
  natural: number;
  modifier: number;
  total: number;
  dc: number;
  tier: DiceTier;
}

const DEFAULT_DICE: DiceSpec = { count: 1, sides: 20 };

export function rollCheck(input: RollCheckInput): RollCheckResult {
  const dice = input.dice ?? DEFAULT_DICE;
  validateDice(dice);

  const rolls: number[] = [];
  for (let i = 0; i < dice.count; i++) {
    rolls.push(input.rng.nextInt(1, dice.sides));
  }

  const natural = rolls.reduce((sum, roll) => sum + roll, 0);
  const modifier =
    (input.modifier ?? 0) +
    (dice.bonus ?? 0) +
    (input.category && input.modifiers
      ? diceModifierFor(input.category, input.modifiers)
      : 0);
  const total = natural + modifier;
  const minNatural = dice.count;
  const maxNatural = dice.count * dice.sides;

  return {
    rolls,
    natural,
    modifier,
    total,
    dc: input.dc,
    tier: classifyTier(total, input.dc, natural, minNatural, maxNatural),
  };
}

function classifyTier(
  total: number,
  dc: number,
  natural: number,
  minNatural: number,
  maxNatural: number
): DiceTier {
  if (natural === minNatural) return "crit_fail";
  if (natural === maxNatural) return "crit_success";
  if (total >= dc + 5) return "crit_success";
  if (total < dc - 5) return "crit_fail";
  if (total >= dc) return "success";
  return "fail";
}

function validateDice(dice: DiceSpec): void {
  if (!Number.isInteger(dice.count) || dice.count < 1) {
    throw new Error(`Invalid dice count: ${dice.count}`);
  }
  if (!Number.isInteger(dice.sides) || dice.sides < 2) {
    throw new Error(`Invalid dice sides: ${dice.sides}`);
  }
}
