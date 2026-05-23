/**
 * Inheritance system — legacy tokens, blessing points, heir stats, generation decay, era transitions.
 * Pure functions, no IO.
 */

import type { Character, Stats } from "@/lib/game/schema";
import type { Era, Origin } from "@/lib/game/constants";
import { TITLE_VALUES, ERA_TRANSITIONS, STAT_BOUNDARIES } from "@/lib/game/constants";
import { clamp } from "./balance";
import type { Rng } from "./rng";

// ── Legacy Token Calculation ───────────────────────────────────────────────

export interface LegacyTokens {
  books: number;
  land: number;
  reputation: number;
}

/**
 * Calculate legacy tokens from a character's end-of-life stats.
 * books = erudition * 0.8
 * land = wealth * 0.6
 * reputation = max(fortune * 0.3, highest_title_value)
 */
export function calculateLegacyTokens(character: Character): LegacyTokens {
  const highestTitleValue = getHighestTitleValue(character.titles);

  return {
    books: Math.round(character.stats.erudition * 0.8),
    land: Math.round(character.stats.wealth * 0.6),
    reputation: Math.round(Math.max(character.stats.fortune * 0.3, highestTitleValue)),
  };
}

function getHighestTitleValue(titles: string[]): number {
  let max = 0;
  for (const title of titles) {
    const value = TITLE_VALUES[title] ?? 0;
    if (value > max) max = value;
  }
  return max;
}

// ── Blessing Point Accumulation ────────────────────────────────────────────

export interface AchievementFlags {
  firstExamPass: boolean;
  survivedCatastrophe: boolean;
  reachedAge70: boolean;
  raised3Sons: boolean;
}

/**
 * blessing_points = books + land + reputation + achievement_bonus
 *
 * Achievement bonuses:
 * - First exam pass in family: +20
 * - Survived a catastrophic event: +10
 * - Reached age 70+: +15
 * - Raised 3+ sons to adulthood: +10
 */
export function calculateBlessingPoints(
  legacyTokens: LegacyTokens,
  achievements: AchievementFlags
): number {
  let points = legacyTokens.books + legacyTokens.land + legacyTokens.reputation;

  if (achievements.firstExamPass) points += 20;
  if (achievements.survivedCatastrophe) points += 10;
  if (achievements.reachedAge70) points += 15;
  if (achievements.raised3Sons) points += 10;

  return points;
}

// ── Heir Starting Stats ────────────────────────────────────────────────────

export interface BlessingBonuses {
  erudition: number;
  fortune: number;
  drive: number;
  wealth: number;
}

/**
 * starting_erudition = 10 + (books / 10) + blessing_bonuses
 * starting_fortune = 5 + (reputation / 20) + blessing_bonuses
 * starting_drive = 100 (always full)
 * starting_wealth = land * 0.5 + blessing_bonuses
 */
export function heirStartingStats(
  legacyTokens: LegacyTokens,
  blessingBonuses: BlessingBonuses
): Stats {
  return {
    erudition: clamp(
      Math.round(10 + legacyTokens.books / 10 + blessingBonuses.erudition),
      STAT_BOUNDARIES.erudition.min,
      STAT_BOUNDARIES.erudition.max
    ),
    fortune: clamp(
      Math.round(5 + legacyTokens.reputation / 20 + blessingBonuses.fortune),
      STAT_BOUNDARIES.fortune.min,
      STAT_BOUNDARIES.fortune.max
    ),
    drive: 100,
    wealth: clamp(
      Math.round(legacyTokens.land * 0.5 + blessingBonuses.wealth),
      STAT_BOUNDARIES.wealth.min,
      STAT_BOUNDARIES.wealth.max
    ),
  };
}

// ── Generation Decay ───────────────────────────────────────────────────────

/**
 * Each generation without exam progress:
 * books *= 0.7 (knowledge fades)
 * land *= 0.9 (land is stable)
 * reputation *= 0.4 (reputation fades fast)
 */
export function applyGenerationDecay(legacyTokens: LegacyTokens): LegacyTokens {
  return {
    books: Math.round(legacyTokens.books * 0.7),
    land: Math.round(legacyTokens.land * 0.9),
    reputation: Math.round(legacyTokens.reputation * 0.4),
  };
}

// ── Era Transitions ────────────────────────────────────────────────────────

/**
 * Era transition rules:
 * - generations_since_change < 2: no transition
 * - generations_since_change >= 3: forced transition
 * - generations_since_change == 2: transition if rng.next() < 0.5
 */
export function shouldTransitionEra(
  generationsSinceChange: number,
  rng: Rng
): boolean {
  if (generationsSinceChange < 2) return false;
  if (generationsSinceChange >= 3) return true;
  // generationsSinceChange === 2
  return rng.next() < 0.5;
}

/**
 * Roll next era using the constrained Markov chain from ERA_TRANSITIONS.
 */
export function rollNextEra(currentEra: Era, rng: Rng): Era {
  const transitions = ERA_TRANSITIONS[currentEra];

  // Calculate total weight
  const totalWeight = transitions.reduce((sum, t) => sum + t.weight, 0);
  const roll = rng.nextFloat(0, totalWeight);

  let cumulative = 0;
  for (const transition of transitions) {
    cumulative += transition.weight;
    if (roll < cumulative) return transition.next;
  }

  // Fallback (should not reach here)
  return transitions[transitions.length - 1].next;
}

// ── Origin Options for Next Generation ─────────────────────────────────────

/**
 * Calculate available origin options based on previous generation's ending state.
 * - Ended with 举人+ title -> farming_family or official_decline
 * - Ended with high wealth (>= 50) -> merchant_son or farming_family
 * - Ended with low wealth (< 10) and no title -> humble_scholar
 * - Player always gets 2-3 options (never forced into exactly one)
 */
export function calculateOriginOptions(
  titles: string[],
  wealth: number
): Origin[] {
  const hasHighTitle = titles.some(
    (t) => (TITLE_VALUES[t] ?? 0) >= TITLE_VALUES["举人"]
  );
  const highWealth = wealth >= 50;
  const lowWealthNoTitle = wealth < 10 && titles.length === 0;

  const options: Set<Origin> = new Set();

  if (hasHighTitle) {
    options.add("farming_family");
    options.add("official_decline");
  }

  if (highWealth) {
    options.add("merchant_son");
    options.add("farming_family");
  }

  if (lowWealthNoTitle) {
    options.add("humble_scholar");
  }

  // Ensure at least 2 options
  if (options.size < 2) {
    // Add defaults based on priority
    if (!options.has("farming_family")) options.add("farming_family");
    if (options.size < 2 && !options.has("humble_scholar")) options.add("humble_scholar");
    if (options.size < 2 && !options.has("merchant_son")) options.add("merchant_son");
  }

  // Cap at 3 options
  return Array.from(options).slice(0, 3);
}
