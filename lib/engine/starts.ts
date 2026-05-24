/**
 * Rollable generation-1 starting packages. This keeps creation randomness in
 * the engine so a visible seed reproduces the same starting state.
 */

import type { GameState, Relic, Skill, StatChanges } from "@/lib/game/schema";
import type { Rng } from "./rng";
import { applyStatChanges } from "./balance";
import { pickStartingRelic } from "./relics";
import { SKILL_CATALOG } from "./skills";

export interface StartingPackage {
  seed: number;
  statJitter: StatChanges;
  bonusRelic: Relic | null;
  bonusSkill: Skill;
  bonusTrait: string;
}

const STARTING_TRAITS = [
  "早慧",
  "胆大",
  "谨慎",
  "善记",
  "耐劳",
] as const;

export function applyStartingPackage(
  state: GameState,
  rng: Rng,
  seed: number
): { state: GameState; startingPackage: StartingPackage } {
  const next = structuredClone(state) as GameState;
  const statJitter = rollStatJitter(rng);
  const bonusRelic = pickStartingRelic(next, rng);
  const bonusSkill = structuredClone(
    SKILL_CATALOG[rng.nextInt(0, SKILL_CATALOG.length - 1)]
  ) as Skill;
  const bonusTrait = STARTING_TRAITS[rng.nextInt(0, STARTING_TRAITS.length - 1)];

  next.character.stats = applyStatChanges(next.character.stats, statJitter);
  if (bonusRelic) {
    next.character.relics.push(bonusRelic);
    next.character.seen_relic_ids = [...new Set([...next.character.seen_relic_ids, bonusRelic.id])];
  }
  if (!next.character.skills.some((skill) => skill.id === bonusSkill.id)) {
    next.character.skills.push(bonusSkill);
  }
  if (!next.character.traits.includes(bonusTrait)) {
    next.character.traits.push(bonusTrait);
  }
  next.rng_seed = rng.nextInt(0, 2147483647);

  return {
    state: next,
    startingPackage: {
      seed,
      statJitter,
      bonusRelic,
      bonusSkill,
      bonusTrait,
    },
  };
}

function rollStatJitter(rng: Rng): StatChanges {
  return {
    erudition: rng.nextInt(-2, 4),
    fortune: rng.nextInt(-5, 8),
    drive: rng.nextInt(-6, 4),
    wealth: rng.nextInt(0, 8),
  };
}
