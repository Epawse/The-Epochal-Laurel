/**
 * Balance formulas — all numerical rules from game-design/balance.md.
 * Pure functions, no IO, no side effects.
 */

import type { Stats, StatChanges, Modifier, StatKey } from "@/lib/game/schema";
import type { ActionDef, EventType } from "@/lib/game/constants";
import { STAT_BOUNDARIES } from "@/lib/game/constants";
import type { Rng } from "./rng";
import { activeModifiers, applyActionDeltaModifiers } from "./effects";

// ── Diminishing Returns ────────────────────────────────────────────────────

/**
 * effective_gain = base_gain * (1 - current_value / (max_value * 1.5))
 * Only applies to positive gains.
 */
export function diminishingReturns(
  baseGain: number,
  currentValue: number,
  maxValue: number
): number {
  if (baseGain <= 0) return baseGain;
  const factor = 1 - currentValue / (maxValue * 1.5);
  return baseGain * Math.max(0, factor);
}

// ── Action Effects ─────────────────────────────────────────────────────────

/**
 * Resolve an action's stat effects using the RNG for ranges.
 * Applies diminishing returns to positive gains on erudition.
 */
export function applyActionEffects(
  action: ActionDef,
  stats: Stats,
  rng: Rng,
  modifiers: readonly Modifier[] = []
): StatChanges {
  const effects = action.effects;

  let erudition = resolveActionRange(action, "erudition", effects.erudition, rng, modifiers);
  const fortune = resolveActionRange(action, "fortune", effects.fortune, rng, modifiers);
  const drive = resolveActionRange(action, "drive", effects.drive, rng, modifiers);
  const wealth = resolveActionRange(action, "wealth", effects.wealth, rng, modifiers);

  // Apply diminishing returns to positive erudition gains (study action above 80)
  if (erudition > 0) {
    erudition = Math.round(
      diminishingReturns(erudition, stats.erudition, STAT_BOUNDARIES.erudition.max)
    );
  }

  return { erudition, fortune, drive, wealth };
}

function resolveRange(range: readonly [number, number], rng: Rng): number {
  const [a, b] = range;
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  if (min === max) return min;
  return rng.nextInt(min, max);
}

function resolveActionRange(
  action: ActionDef,
  stat: StatKey,
  range: readonly [number, number],
  rng: Rng,
  modifiers: readonly Modifier[]
): number {
  return applyActionDeltaModifiers(
    action.id,
    stat,
    resolveRange(range, rng),
    modifiers
  );
}

// ── Drive Decay ────────────────────────────────────────────────────────────

/**
 * drive_loss_per_year = max(1, (age - 20) / 10)
 * Returns the annual drive loss amount (positive number).
 */
export function driveLossPerYear(age: number): number {
  return Math.max(1, (age - 20) / 10);
}

/**
 * Drive loss per season = driveLossPerYear / 4
 * Returns the per-season drive loss (positive number, floored to at least 0).
 */
export function driveLossPerSeason(age: number): number {
  return driveLossPerYear(age) / 4;
}

// ── Event Chance ───────────────────────────────────────────────────────────

/**
 * event_chance_per_season = 0.20 + (fortune / 500)
 */
export function eventChancePerSeason(fortune: number): number {
  return 0.20 + fortune / 500;
}

/**
 * Event type distribution based on fortune range.
 * Returns weights: [opportunity, misfortune, social, political]
 */
export function eventTypeDistribution(
  fortune: number,
  modifiers: readonly Modifier[] = []
): Record<EventType, number> {
  const weights =
    fortune < 0
      ? { opportunity: 5, misfortune: 40, social: 40, political: 15 }
      : fortune <= 30
        ? { opportunity: 15, misfortune: 25, social: 45, political: 15 }
        : fortune <= 60
          ? { opportunity: 25, misfortune: 15, social: 40, political: 20 }
          : { opportunity: 35, misfortune: 10, social: 35, political: 20 };

  for (const modifier of activeModifiers(modifiers)) {
    const effect = modifier.effect;
    if (effect.kind !== "event_bias") continue;
    weights[effect.event_type] *= effect.weight_mult ?? 1;
    if (effect.event_type === "misfortune") {
      weights.misfortune *= effect.danger_mult ?? 1;
    }
  }

  return weights;
}

/**
 * Pick an event type using weighted distribution and RNG.
 */
export function rollEventType(
  fortune: number,
  rng: Rng,
  modifiers: readonly Modifier[] = []
): EventType {
  const weights = eventTypeDistribution(fortune, modifiers);
  const total = weights.opportunity + weights.misfortune + weights.social + weights.political;
  const roll = rng.nextFloat(0, total);

  let cumulative = 0;
  const entries: [EventType, number][] = [
    ["opportunity", weights.opportunity],
    ["misfortune", weights.misfortune],
    ["social", weights.social],
    ["political", weights.political],
  ];

  for (const [type, weight] of entries) {
    cumulative += weight;
    if (roll < cumulative) return type;
  }

  return "social"; // fallback
}

// ── Scheme Exposure ────────────────────────────────────────────────────────

/**
 * exposure_chance = 0.15 - (fortune * 0.001), clamped [0.05, 0.15]
 */
export function schemeExposureChance(fortune: number): number {
  const raw = 0.15 - fortune * 0.001;
  return Math.max(0.05, Math.min(0.15, raw));
}

/**
 * Scheme exposure penalty:
 * - Erudition -10
 * - Fortune -20
 * - Drive -15
 * - 30% chance of exam ban for 1 cycle
 */
export function schemeExposurePenalty(): StatChanges {
  return {
    erudition: -10,
    fortune: -20,
    drive: -15,
    wealth: 0,
  };
}

// ── Stat Clamping ──────────────────────────────────────────────────────────

/**
 * Clamp all stats to their defined boundaries.
 */
export function clampStats(stats: Stats): Stats {
  return {
    erudition: clamp(stats.erudition, STAT_BOUNDARIES.erudition.min, STAT_BOUNDARIES.erudition.max),
    fortune: clamp(stats.fortune, STAT_BOUNDARIES.fortune.min, STAT_BOUNDARIES.fortune.max),
    drive: clamp(stats.drive, STAT_BOUNDARIES.drive.min, STAT_BOUNDARIES.drive.max),
    wealth: clamp(stats.wealth, STAT_BOUNDARIES.wealth.min, STAT_BOUNDARIES.wealth.max),
  };
}

/**
 * Apply stat changes to current stats and clamp.
 */
export function applyStatChanges(stats: Stats, changes: StatChanges): Stats {
  return clampStats({
    erudition: stats.erudition + changes.erudition,
    fortune: stats.fortune + changes.fortune,
    drive: stats.drive + changes.drive,
    wealth: stats.wealth + changes.wealth,
  });
}

// ── Helpers ────────────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
