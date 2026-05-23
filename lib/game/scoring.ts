import { TITLE_VALUES, VICTORY_TIERS } from "@/lib/game/constants";

/**
 * Calculate the final score for a completed dynasty run.
 *
 * Formula: highest_title_value * tier_multiplier * (1 + total_generations * 0.1)
 */
export function calculateScore(
  highestTitle: string,
  tier: string,
  totalGenerations: number
): number {
  const titleValue = TITLE_VALUES[highestTitle] ?? 0;
  const tierDef = VICTORY_TIERS.find((t) => t.tier === tier);
  const multiplier = tierDef?.multiplier ?? 0;
  const generationsBonus = 1 + totalGenerations * 0.1;

  return Math.round(titleValue * multiplier * generationsBonus);
}
