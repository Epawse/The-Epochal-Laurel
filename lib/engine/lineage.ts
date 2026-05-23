/**
 * Lineage system — max_age, marriage, fertility, births, child survival, heirs.
 * Pure functions, no IO.
 */

import type { Era } from "@/lib/game/constants";
import { ERA_MODIFIERS } from "@/lib/game/constants";
import type { Child } from "./types";
import { clamp } from "./balance";
import type { Rng } from "./rng";

// ── Max Age ────────────────────────────────────────────────────────────────

/**
 * max_age = 55 + random(-8..+12) + trait_modifier + origin_modifier + blessing_modifier
 * Clamped to [40, 80].
 */
export function rollMaxAge(
  rng: Rng,
  traitModifier: number = 0,
  originModifier: number = 0,
  blessingModifier: number = 0
): number {
  const base = 55;
  const randomSpread = rng.nextInt(-8, 12);
  const raw = base + randomSpread + traitModifier + originModifier + blessingModifier;
  return clamp(raw, 40, 80);
}

// ── Marriage ───────────────────────────────────────────────────────────────

/**
 * Marriage requires Fortune >= 15 and Wealth >= 10.
 */
export function canMarry(fortune: number, wealth: number): boolean {
  return fortune >= 15 && wealth >= 10;
}

// ── Fertility ──────────────────────────────────────────────────────────────

/**
 * fertile_until_year = married_year + random(14..20)
 */
export function rollFertileUntil(marriedYear: number, rng: Rng): number {
  return marriedYear + rng.nextInt(14, 20);
}

// ── Births ─────────────────────────────────────────────────────────────────

/**
 * son_birth_chance_per_year = 0.30
 * Returns true if a son is born this year.
 */
export function rollSonBirth(rng: Rng): boolean {
  return rng.next() < 0.30;
}

// ── Child Survival ─────────────────────────────────────────────────────────

/**
 * child_survival_rate = era_survival[era]
 * prosperity 0.70 | decline 0.60 | invasion 0.45 | restoration 0.65
 */
export function rollChildSurvival(era: Era, rng: Rng): boolean {
  const survivalRate = ERA_MODIFIERS[era].child_survival_rate;
  return rng.next() < survivalRate;
}

// ── Heir Count ─────────────────────────────────────────────────────────────

/**
 * num_heirs = clamp(count(surviving_sons), 0, 3)
 * If more than 3 sons survive, the first 3 are offered.
 */
export function countHeirs(children: Child[]): number {
  const survivingSons = children.filter((c) => c.is_son && c.alive);
  return clamp(survivingSons.length, 0, 3);
}

/**
 * Get the actual heir candidates (up to 3 surviving sons).
 */
export function getHeirCandidates(children: Child[]): Child[] {
  const survivingSons = children.filter((c) => c.is_son && c.alive);
  return survivingSons.slice(0, 3);
}

// ── Adoption ───────────────────────────────────────────────────────────────

/**
 * Adoption is offered when dynasty.legacy.reputation >= 20.
 */
export function canAdopt(reputation: number): boolean {
  return reputation >= 20;
}
