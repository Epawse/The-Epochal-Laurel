/**
 * Reducer — the single entry point for all game state transitions.
 * Each function takes state + args and returns a new GameState.
 * Pure functions, no IO, no side effects.
 */

import type {
  GameState,
  Character,
  CurrentEvent,
  EventReward,
  Modifier,
  Stats,
  StatChanges,
  RelicDraft,
} from "@/lib/game/schema";
import type { Origin, ExamLevel, Season, Era } from "@/lib/game/constants";
import {
  ORIGINS,
  BASE_STATS,
  ACTIONS,
  EXAM_REWARDS,
  BLESSINGS,
  TITLE_RANK,
} from "@/lib/game/constants";
import { type Rng } from "./rng";
import {
  applyActionEffects,
  driveLossPerSeason,
  eventChancePerSeason,
  rollEventType,
  schemeExposureChance,
  schemeExposurePenalty,
  applyStatChanges,
  clampStats,
} from "./balance";
import {
  collectModifiers,
  hasMetaModifier,
  isActionBlocked,
  metaModifierValue,
  modifiersForBlessingIds,
  tickModifiers,
} from "./effects";
import { rollCheck, type RollCheckResult } from "./dice";
import { palaceRanking } from "./exam";
import {
  chooseHeirloomRelic,
  createRelicDraftFromIds,
  maybeCreateActionRelicDraft,
  queueRelicDraft,
} from "./relics";
import { findSkillById, originSkillKit } from "./skills";
import { maybeCreateWorldModifiers } from "./worldModifiers";
import { rollMaxAge, canMarry, rollFertileUntil, rollSonBirth, rollChildSurvival } from "./lineage";
import {
  calculateLegacyTokens,
  calculateBlessingPoints,
  heirStartingStats,
  applyGenerationDecay,
  shouldTransitionEra,
  rollNextEra,
  calculateOriginOptions,
  type LegacyTokens,
  type AchievementFlags,
  type BlessingBonuses,
} from "./inheritance";

// ── Season Cycle ───────────────────────────────────────────────────────────

const SEASON_ORDER: Season[] = ["spring", "summer", "autumn", "winter"];

export function nextSeason(current: Season): { season: Season; yearAdvanced: boolean } {
  const idx = SEASON_ORDER.indexOf(current);
  if (idx === 3) {
    return { season: "spring", yearAdvanced: true };
  }
  return { season: SEASON_ORDER[idx + 1], yearAdvanced: false };
}

// ── advanceSeason ──────────────────────────────────────────────────────────

export interface AdvanceSeasonResult {
  state: GameState;
  /** If an event should be triggered, this contains the event type */
  eventTrigger: string | null;
  /** Stat changes applied this turn (for UI delta display) */
  statChanges: StatChanges;
  /** Whether scheme exposure occurred */
  schemeExposed: boolean;
  /** Whether character died this turn */
  characterDied: boolean;
  /** Death reason if applicable */
  deathReason: "drive_zero" | "max_age" | null;
  /** If a relic draft was created, this contains the draft options */
  relicDraft: RelicDraft | null;
}

/**
 * Advance one season: apply action, decay drive, tick status effects,
 * roll for events, advance time, check death conditions.
 */
export function advanceSeason(
  state: GameState,
  actionId: string,
  rng: Rng
): AdvanceSeasonResult {
  const action = ACTIONS.find((a) => a.id === actionId);
  if (!action) {
    throw new Error(`Unknown action: ${actionId}`);
  }

  const newState = structuredClone(state) as GameState;
  let schemeExposed = false;
  let eventTrigger: string | null = null;
  let relicDraft: RelicDraft | null = null;
  const modifiers = collectModifiers(newState.character, newState.world);

  if (isActionBlocked(actionId, modifiers)) {
    throw new Error(`Action blocked by active modifier: ${actionId}`);
  }

  // 1. Apply action effects (with diminishing returns)
  const actionChanges = applyActionEffects(action, newState.character.stats, rng, modifiers);
  let totalChanges: StatChanges = { ...actionChanges };

  // 2. Check scheme exposure
  if (actionId === "scheme") {
    const exposureChance = Math.min(
      1,
      Math.max(
        0,
        schemeExposureChance(newState.character.stats.fortune) +
          metaModifierValue("scheme_exposure", modifiers)
      )
    );
    if (rng.next() < exposureChance) {
      schemeExposed = true;
      const penalty = schemeExposurePenalty();
      totalChanges = {
        erudition: totalChanges.erudition + penalty.erudition,
        fortune: totalChanges.fortune + penalty.fortune,
        drive: totalChanges.drive + penalty.drive,
        wealth: totalChanges.wealth + penalty.wealth,
      };

      // 30% chance of exam ban
      if (rng.next() < 0.30) {
        newState.character.status_effects.push({
          type: "exam_ban",
          turns_remaining: 12, // ~3 years in seasons
        });
        newState.character.modifiers.push({
          id: `tool_exam_ban_${newState.turn_number}`,
          source: { type: "tool", id: "scheme_exposure" },
          label: "科考禁令",
          effect: { kind: "meta", key: "exam_ban", value: 1 },
          turns_remaining: 12,
        });
      }
    }
  }

  // 3. Apply drive decay
  const driveDecay = driveLossPerSeason(newState.character.age);
  totalChanges = {
    ...totalChanges,
    drive: totalChanges.drive - Math.round(driveDecay),
  };

  // 4. Apply all stat changes
  newState.character.stats = applyStatChanges(newState.character.stats, totalChanges);

  // 5. Decrement status effects
  newState.character.status_effects = newState.character.status_effects
    .map((effect) => ({
      ...effect,
      turns_remaining: effect.turns_remaining - 1,
    }))
    .filter((effect) => effect.turns_remaining > 0);
  newState.character.modifiers = tickModifiers(newState.character.modifiers);
  newState.world.world_modifiers = tickModifiers(newState.world.world_modifiers);

  // Rest can produce a short-lived inspiration buff, giving recovery an
  // exam-relevant upside beyond refilling drive.
  if (actionId === "rest" && rng.next() < 0.15) {
    newState.character.modifiers.push({
      id: `event_inspiration_${newState.turn_number}`,
      source: { type: "event", id: "rest_inspiration" },
      label: "灵感乍现",
      effect: { kind: "exam_score", value: 5 },
      turns_remaining: 4,
    });
  }

  // 6. Roll for random event
  const eventChance = eventChancePerSeason(newState.character.stats.fortune);
  if (rng.next() < eventChance) {
    eventTrigger = rollEventType(newState.character.stats.fortune, rng, modifiers);
  }

  // 6b. Roll action-specific relic draft if no event is taking over the turn.
  if (!eventTrigger) {
    relicDraft = maybeCreateActionRelicDraft(newState, action.id, rng);
    if (relicDraft) {
      const withDraft = queueRelicDraft(newState, relicDraft);
      newState.pending_relic_draft = withDraft.pending_relic_draft;
      newState.character.seen_relic_ids = withDraft.character.seen_relic_ids;
    }
  }

  // 7. Advance season/year
  const { season: newSeason, yearAdvanced } = nextSeason(newState.world.season);
  newState.world.season = newSeason;
  if (yearAdvanced) {
    newState.world.year += 1;
    newState.world.era_year += 1;
    newState.character.age += 1;

    // 7b. Lineage: auto-marry when eligible and unmarried
    if (
      !newState.character.family.spouse &&
      newState.character.age >= 16 &&
      canMarry(newState.character.stats.fortune, newState.character.stats.wealth)
    ) {
      const fertileUntil = rollFertileUntil(newState.world.year, rng);
      newState.character.family.spouse = {
        npc_id: `spouse_${newState.turn_number}`,
        married_year: newState.world.year,
        fertile_until_year: fertileUntil,
      };
    }

    // 7c. Lineage: yearly birth roll if married and fertile
    const spouse = newState.character.family.spouse;
    if (spouse && newState.world.year <= spouse.fertile_until_year) {
      if (rollSonBirth(rng)) {
        const survives = rollChildSurvival(newState.world.era as Era, rng);
        newState.character.family.children.push({
          name: `${newState.dynasty.family_name}氏子`,
          born_year: newState.world.year,
          is_son: true,
          alive: survives,
        });
      }
    }
  }

  // 8. Update exam schedule countdown (decrement each season)
  newState.world.exam_schedule = {
    next_county: Math.max(0, newState.world.exam_schedule.next_county - 1),
    next_provincial: Math.max(0, newState.world.exam_schedule.next_provincial - 1),
    next_metropolitan: Math.max(0, newState.world.exam_schedule.next_metropolitan - 1),
  };

  // 9. Advance turn counter
  newState.turn_number += 1;

  // 10. Check death conditions
  let characterDied = false;
  let deathReason: "drive_zero" | "max_age" | null = null;

  if (newState.character.stats.drive <= 0) {
    characterDied = true;
    deathReason = "drive_zero";
  } else if (newState.character.age >= newState.character.max_age) {
    characterDied = true;
    deathReason = "max_age";
  }

  return {
    state: newState,
    eventTrigger,
    statChanges: totalChanges,
    schemeExposed,
    characterDied,
    deathReason,
    relicDraft,
  };
}

// ── applyEventChoice ───────────────────────────────────────────────────────

export interface EventChoiceResolution {
  state: GameState;
  statChanges: StatChanges;
  roll: RollCheckResult | null;
  relicDraft: RelicDraft | null;
}

/**
 * Apply a chosen event option's stat_changes to the game state.
 */
export function applyEventChoice(
  state: GameState,
  choiceId: string
): GameState {
  if (!state.current_event) {
    throw new Error("No current event to resolve");
  }

  const choice = state.current_event.choices.find((c) => c.id === choiceId);
  if (!choice) {
    throw new Error(`Unknown choice: ${choiceId}`);
  }

  const newState = structuredClone(state) as GameState;
  newState.character.stats = applyStatChanges(newState.character.stats, choice.stat_changes);
  newState.current_event = null;

  return newState;
}

/**
 * Resolve an event choice with the new dice/reward hooks. Legacy callers can
 * keep using applyEventChoice(); server actions should use this richer variant.
 */
export function applyEventChoiceWithResult(
  state: GameState,
  choiceId: string,
  rng: Rng
): EventChoiceResolution {
  if (!state.current_event) {
    throw new Error("No current event to resolve");
  }

  const event = state.current_event;
  const choice = event.choices.find((candidate) => candidate.id === choiceId);
  if (!choice) {
    throw new Error(`Unknown choice: ${choiceId}`);
  }

  let newState = structuredClone(state) as GameState;
  const modifiers = collectModifiers(newState.character, newState.world);
  let roll: RollCheckResult | null = null;
  let statChanges = choice.stat_changes;

  if (choice.check) {
    const statModifier = Math.round(newState.character.stats[choice.check.stat] / 10);
    roll = rollCheck({
      rng,
      dc: choice.check.dc,
      modifier: statModifier,
      category: "event",
      modifiers,
    });
    statChanges = choice.check.outcomes[roll.tier];
  }

  newState.character.stats = applyStatChanges(newState.character.stats, statChanges);
  const rewardDraft = applyEventReward(newState, event.reward ?? null, rng);
  newState.current_event = null;

  const hookResult = applyEventSystemHooks(newState, event, rng);
  newState = hookResult.state;

  return {
    state: newState,
    statChanges,
    roll,
    relicDraft: rewardDraft ?? hookResult.relicDraft,
  };
}

function applyEventReward(
  state: GameState,
  reward: EventReward | null,
  rng: Rng
): RelicDraft | null {
  if (!reward) return null;

  if (reward.type === "buff" && reward.buff) {
    state.character.modifiers.push(reward.buff);
    return null;
  }

  if (reward.type === "skill_grant" && reward.skill_id) {
    const skill = findSkillById(reward.skill_id);
    if (skill && !state.character.skills.some((existing) => existing.id === skill.id)) {
      state.character.skills.push(skill);
    }
    return null;
  }

  if (reward.type === "relic_draft" && !state.pending_relic_draft) {
    const draft = createRelicDraftFromIds(state, rng, "event", reward.relic_ids);
    if (!draft) return null;
    const queued = queueRelicDraft(state, draft);
    state.pending_relic_draft = queued.pending_relic_draft;
    state.character.seen_relic_ids = queued.character.seen_relic_ids;
    return draft;
  }

  return null;
}

function applyEventSystemHooks(
  state: GameState,
  event: CurrentEvent,
  rng: Rng
): { state: GameState; relicDraft: RelicDraft | null } {
  if (isMourningEvent(event)) {
    return { state: applyMourning(state), relicDraft: null };
  }

  if (isCatastropheEvent(event)) {
    return applyCatastrophe(state, rng);
  }

  return { state, relicDraft: null };
}

function isMourningEvent(event: CurrentEvent): boolean {
  const text = `${event.id} ${event.title}`;
  return /parent_death|mourning|丁忧|守孝|父丧|母丧|讣音|病逝/.test(text);
}

function isCatastropheEvent(event: CurrentEvent): boolean {
  const text = `${event.id} ${event.title}`;
  return /catastrophe|flood|plague|war|灾|洪水|瘟|兵燹|战乱|旱/.test(text);
}

export function applyMourning(state: GameState): GameState {
  const newState = structuredClone(state) as GameState;
  const modifiers = collectModifiers(newState.character, newState.world);

  if (hasMetaModifier("skip_mourning", modifiers)) {
    newState.character.stats = applyStatChanges(newState.character.stats, {
      erudition: 0,
      fortune: 10,
      drive: 0,
      wealth: 0,
    });
    return newState;
  }

  newState.character.modifiers.push({
    id: `event_mourning_${newState.turn_number}`,
    source: { type: "event", id: "parent_death" },
    label: "丁忧守孝",
    effect: { kind: "action_block", actions: ["socialize", "scheme"] },
    turns_remaining: 12,
  });
  return newState;
}

export function applyCatastrophe(
  state: GameState,
  rng: Rng,
  statPenalty: StatChanges = { erudition: -5, fortune: -12, drive: -10, wealth: -10 }
): { state: GameState; statChanges: StatChanges; relicDraft: RelicDraft | null } {
  let newState = structuredClone(state) as GameState;
  newState.character.stats = applyStatChanges(newState.character.stats, statPenalty);
  newState.character.modifiers.push(catastropheSurvivorModifier(newState.turn_number));

  let relicDraft: RelicDraft | null = null;
  if (!newState.pending_relic_draft) {
    relicDraft = createRelicDraftFromIds(newState, rng, "catastrophe", [
      "survivors_tablet",
      "traveling_medicine",
      "lucky_coin",
    ]);
    if (relicDraft) {
      newState = queueRelicDraft(newState, relicDraft);
    }
  }

  return { state: newState, statChanges: statPenalty, relicDraft };
}

function catastropheSurvivorModifier(turnNumber: number): Modifier {
  return {
    id: `event_catastrophe_survivor_${turnNumber}`,
    source: { type: "event", id: "catastrophe" },
    label: "劫后余生",
    effect: { kind: "meta", key: "catastrophe_survivor", value: 1 },
    turns_remaining: null,
  };
}

// ── resolveExam ────────────────────────────────────────────────────────────

export interface ExamResolution {
  state: GameState;
  passed: boolean;
  score: number;
  titleAwarded: string | null;
}

/**
 * Resolve an exam attempt: update title, history, stats.
 */
export function resolveExam(
  state: GameState,
  examLevel: ExamLevel,
  score: number,
  passed: boolean,
  riskPenalty?: StatChanges
): ExamResolution {
  const newState = structuredClone(state) as GameState;

  // Award title if passed
  let titleAwarded: string | null = null;
  if (passed) {
    const title = EXAM_REWARDS[examLevel];
    if (!newState.character.titles.includes(title)) {
      newState.character.titles.push(title);
      titleAwarded = title;
    }
  }

  // Add exam history entry
  newState.character.exam_history.push({
    level: examLevel,
    year: newState.world.year,
    result: passed ? "pass" : "fail",
    score,
  });

  // Apply risk penalty if applicable
  if (riskPenalty) {
    newState.character.stats = applyStatChanges(
      newState.character.stats,
      riskPenalty
    );
  }

  // Reset exam schedule for this level (next cycle in 3 years = 12 seasons)
  if (examLevel === "county") {
    newState.world.exam_schedule.next_county = 12;
  } else if (examLevel === "provincial") {
    newState.world.exam_schedule.next_provincial = 12;
  } else if (examLevel === "metropolitan") {
    newState.world.exam_schedule.next_metropolitan = 12;
  }

  return { state: newState, passed, score, titleAwarded };
}

// ── resolvePalaceExam ──────────────────────────────────────────────────────

export interface PalaceExamResolution {
  state: GameState;
  ranking: ReturnType<typeof palaceRanking>;
  playerRank: number;
  playerTitle: string;
}

/**
 * Resolve palace exam: ranking only, no pass/fail threshold.
 * All finalists receive at least 进士.
 */
export function resolvePalaceExam(
  state: GameState,
  playerScore: number,
  rivals: Array<{ name: string; score: number }>
): PalaceExamResolution {
  const newState = structuredClone(state) as GameState;

  const ranking = palaceRanking(
    newState.character.name,
    playerScore,
    rivals
  );

  // Find player's entry
  const playerEntry = ranking.find((r) => r.name === newState.character.name);
  const playerRank = playerEntry?.rank ?? ranking.length;
  const playerTitle = playerEntry?.title ?? "进士";

  // Award title
  if (!newState.character.titles.includes(playerTitle)) {
    newState.character.titles.push(playerTitle);
  }

  // Add exam history
  newState.character.exam_history.push({
    level: "palace",
    year: newState.world.year,
    result: "pass",
    score: playerScore,
    rank: playerRank,
    title: playerTitle,
    rivals: rivals.map((r) => ({ name: r.name, score: r.score })),
  });

  // Update dynasty highest title (shared TITLE_RANK — see constants.ts)
  if ((TITLE_RANK[playerTitle] ?? 0) > (TITLE_RANK[newState.dynasty.highest_title_ever] ?? 0)) {
    newState.dynasty.highest_title_ever = playerTitle;
  }

  return { state: newState, ranking, playerRank, playerTitle };
}

// ── resolveInheritance ─────────────────────────────────────────────────────

export interface InheritanceResolution {
  state: GameState;
  legacyTokens: LegacyTokens;
  eraTransitioned: boolean;
  newEra: string | null;
}

export interface HeirData {
  name: string;
  traits: string[];
  starting_bonus: { stat: "erudition" | "fortune" | "drive"; value: number };
}

/**
 * Resolve inheritance: calculate legacy, create new character, check era transition.
 */
export function resolveInheritance(
  state: GameState,
  heirIndex: number,
  purchasedBlessings: string[],
  rng: Rng,
  heirData?: HeirData,
  heirloomRelicId: string | null = null
): InheritanceResolution {
  const newState = structuredClone(state) as GameState;
  const oldCharacter = newState.character;
  const heirloomRelic = chooseHeirloomRelic(newState, heirloomRelicId);
  newState.dynasty.pending_heirloom = heirloomRelic;
  const activeBlessingIds = new Set([
    ...newState.dynasty.legacy.ancestral_blessings.map((blessing) => blessing.id),
    ...purchasedBlessings,
  ]);

  // 1. Calculate legacy tokens
  const legacyTokens = calculateLegacyTokens(oldCharacter);

  // 2. Apply generation decay
  const decayedTokens = applyGenerationDecay(legacyTokens);

  // 3. Calculate blessing bonuses from purchased blessings
  const blessingBonuses: BlessingBonuses = { erudition: 0, fortune: 0, drive: 0, wealth: 0 };
  for (const blessingId of activeBlessingIds) {
    const blessing = BLESSINGS.find((b) => b.id === blessingId);
    if (blessing) {
      // Parse blessing effects
      if (blessing.effect.includes("starting_erudition_+")) {
        const val = parseInt(blessing.effect.split("+")[1]);
        blessingBonuses.erudition += val;
      } else if (blessing.effect.includes("starting_wealth_+")) {
        const val = parseInt(blessing.effect.split("+")[1]);
        blessingBonuses.wealth += val;
      }
    }
  }

  // 4. Calculate heir starting stats
  const heirStats = heirStartingStats(decayedTokens, blessingBonuses);

  // 5. Determine origin options for next generation
  const originOptions = calculateOriginOptions(
    oldCharacter.titles,
    oldCharacter.stats.wealth
  );
  const heirOrigin = originOptions[Math.min(heirIndex, originOptions.length - 1)];

  // 6. Apply origin modifiers
  const originDef = ORIGINS[heirOrigin];
  const finalStats: Stats = clampStats({
    erudition: heirStats.erudition + originDef.modifiers.erudition,
    fortune: heirStats.fortune + originDef.modifiers.fortune,
    drive: Math.min(100, heirStats.drive + originDef.modifiers.drive),
    wealth: heirStats.wealth + originDef.modifiers.wealth,
  });

  // 7. Calculate max_age for new character
  const originAgeModifier = heirOrigin === "official_decline" ? -2 : 0;
  const blessingAgeModifier = activeBlessingIds.has("iron_constitution") ? 10 : 0;
  const newMaxAge = rollMaxAge(rng, 0, originAgeModifier, blessingAgeModifier);

  // 8. Archive old character as ancestor
  newState.dynasty.ancestors.push({
    name: oldCharacter.name,
    generation: oldCharacter.generation,
    highest_title: oldCharacter.titles[oldCharacter.titles.length - 1] ?? "白身",
    cause_of_end: oldCharacter.stats.drive <= 0 ? "drive_exhausted" : "natural_death",
    notable_achievement: oldCharacter.exam_history.length > 0
      ? `Passed ${oldCharacter.exam_history.filter((e) => e.result === "pass").length} exams`
      : "None",
    years_lived: `${oldCharacter.age} years`,
  });

  // 9. Apply heir starting bonus to stats
  if (heirData?.starting_bonus) {
    const { stat, value } = heirData.starting_bonus;
    finalStats[stat] = Math.min(100, finalStats[stat] + value);
  }

  // 10. Create new character
  const newGeneration = oldCharacter.generation + 1;
  newState.character = {
    id: `gen_${newGeneration}_${rng.nextInt(1000, 9999)}`,
    name: heirData?.name ?? `${newState.dynasty.family_name}氏第${newGeneration}代`,
    generation: newGeneration,
    age: 16,
    max_age: newMaxAge,
    gender: "male",
    origin: heirOrigin,
    origin_effects_applied: true,
    stats: finalStats,
    titles: [],
    exam_history: [],
    relationships: [],
    inventory: [],
    relics: heirloomRelic ? [heirloomRelic] : [],
    heirloom_relic_id: null,
    seen_relic_ids: heirloomRelic ? [heirloomRelic.id] : [],
    traits: heirData?.traits ?? [originDef.trait],
    skills: originSkillKit(heirOrigin),
    status_effects: [],
    modifiers: modifiersForBlessingIds(activeBlessingIds),
    family: { spouse: null, children: [] },
  };

  // 10. Update dynasty
  newState.dynasty.total_generations = newGeneration;
  newState.dynasty.pending_heirloom = null;
  for (const blessingId of purchasedBlessings) {
    const blessing = BLESSINGS.find((b) => b.id === blessingId);
    if (!blessing) continue;

    const existing = newState.dynasty.legacy.ancestral_blessings.some(
      (ancestral) => ancestral.id === blessingId
    );
    if (!existing) {
      newState.dynasty.legacy.ancestral_blessings.push({
        id: blessing.id,
        name: blessing.name,
        effect: blessing.effect,
        unlocked_gen: newGeneration,
      });
    }

    const available = newState.dynasty.available_blessings.find((candidate) => candidate.id === blessingId);
    if (available) {
      available.unlocked = true;
    }
  }
  newState.dynasty.legacy = {
    ...newState.dynasty.legacy,
    books: decayedTokens.books,
    land: decayedTokens.land,
    reputation: decayedTokens.reputation,
  };

  // 11. Calculate and add blessing points
  const achievements: AchievementFlags = {
    firstExamPass: oldCharacter.exam_history.some((e) => e.result === "pass") &&
      newState.dynasty.ancestors.every((a) => a.highest_title === "白身" || a.generation === oldCharacter.generation),
    survivedCatastrophe: hasMetaModifier(
      "catastrophe_survivor",
      collectModifiers(oldCharacter, newState.world)
    ),
    reachedAge70: oldCharacter.age >= 70,
    raised3Sons: oldCharacter.family.children.filter((c) => c.is_son && c.alive).length >= 3,
  };
  const blessingPointsEarned = calculateBlessingPoints(legacyTokens, achievements);
  newState.dynasty.blessing_points += blessingPointsEarned;

  // Deduct cost of purchased blessings
  for (const blessingId of purchasedBlessings) {
    const blessing = BLESSINGS.find((b) => b.id === blessingId);
    if (blessing) {
      newState.dynasty.blessing_points -= blessing.cost;
    }
  }

  // 12. Check era transition
  const generationsSinceChange =
    newState.dynasty.total_generations - newState.dynasty.last_era_change_generation;
  const eraTransitioned = shouldTransitionEra(generationsSinceChange, rng);
  let newEra: string | null = null;

  if (eraTransitioned) {
    const nextEra = rollNextEra(newState.world.era, rng);
    newState.world.era = nextEra;
    newState.world.era_year = 0;
    newState.dynasty.last_era_change_generation = newState.dynasty.total_generations;
    newEra = nextEra;

    // Reset court whims on era change
    const styles = ["pragmatic", "ornate", "orthodox", "radical"] as const;
    const temperaments = ["ambitious", "lazy", "paranoid", "benevolent"] as const;
    newState.world.court_whims = {
      style: styles[rng.nextInt(0, 3)],
      intensity: rng.nextInt(30, 80),
      emperor_temperament: temperaments[rng.nextInt(0, 3)],
    };
    newState.world.court_whims_revealed = {
      style_known: false,
      temperament_known: "hidden",
      temperament_eliminated: [],
    };
    newState.world.world_modifiers = maybeCreateWorldModifiers(nextEra, rng);
  }

  // 13. Reset auxiliary tools
  newState.world.auxiliary_tools = resetAuxiliaryTools(newState.world.year);

  // 14. Reset exam schedule
  newState.world.exam_schedule = initExamSchedule(rng);

  return { state: newState, legacyTokens, eraTransitioned, newEra };
}

// ── createCharacter ────────────────────────────────────────────────────────

/**
 * Create the initial GameState for a new dynasty (generation 1).
 */
export function createCharacter(
  familyName: string,
  origin: Origin,
  rng: Rng
): GameState {
  const originDef = ORIGINS[origin];

  // Apply origin modifiers to base stats
  const stats: Stats = clampStats({
    erudition: BASE_STATS.erudition + originDef.modifiers.erudition,
    fortune: BASE_STATS.fortune + originDef.modifiers.fortune,
    // Drive: positive origin bonuses are capped by full-Drive start (100)
    drive: Math.min(100, BASE_STATS.drive + originDef.modifiers.drive),
    wealth: BASE_STATS.wealth + originDef.modifiers.wealth,
  });

  // Roll max_age
  const originAgeModifier = origin === "official_decline" ? -2 : 0;
  const maxAge = rollMaxAge(rng, 0, originAgeModifier, 0);

  // Roll court whims
  const styles = ["pragmatic", "ornate", "orthodox", "radical"] as const;
  const temperaments = ["ambitious", "lazy", "paranoid", "benevolent"] as const;

  const character: Character = {
    id: `gen_1_${rng.nextInt(1000, 9999)}`,
    name: `${familyName}氏第一代`,
    generation: 1,
    age: 16,
    max_age: maxAge,
    gender: "male",
    origin,
    origin_effects_applied: true,
    stats,
    titles: [],
    exam_history: [],
    relationships: [],
    inventory: [],
    relics: [],
    heirloom_relic_id: null,
    seen_relic_ids: [],
    traits: [originDef.trait],
    skills: originSkillKit(origin),
    status_effects: [],
    modifiers: [],
    family: { spouse: null, children: [] },
  };

  const examSchedule = initExamSchedule(rng);
  const worldModifiers = maybeCreateWorldModifiers("prosperity", rng);

  const gameState: GameState = {
    version: "0.2.0",
    character,
    world: {
      era: "prosperity",
      era_year: 1,
      dynasty: familyName,
      year: 1,
      season: "spring",
      court_whims: {
        style: styles[rng.nextInt(0, 3)],
        intensity: rng.nextInt(30, 80),
        emperor_temperament: temperaments[rng.nextInt(0, 3)],
      },
      court_whims_revealed: {
        style_known: false,
        temperament_known: "hidden",
        temperament_eliminated: [],
      },
      events_this_era: [],
      world_modifiers: worldModifiers,
      exam_schedule: examSchedule,
      auxiliary_tools: resetAuxiliaryTools(1),
    },
    dynasty: {
      family_name: familyName,
      total_generations: 1,
      highest_title_ever: "白身",
      last_era_change_generation: 0,
      legacy: {
        books: 0,
        land: 0,
        reputation: 0,
        ancestral_blessings: [],
      },
      ancestors: [],
      blessing_points: 0,
      available_blessings: BLESSINGS.map((b) => ({
        id: b.id,
        name: b.name,
        cost: b.cost,
        effect: b.effect,
        unlocked: false,
      })),
      pending_heirloom: null,
    },
    npcs: [],
    current_event: null,
    pending_event_type: null,
    pending_event_action_id: null,
    event_cache: {},
    pending_npc_dialogue: null,
    pending_relic_draft: null,
    turn_number: 0,
    rng_seed: rng.nextInt(0, 2147483647),
  };

  return gameState;
}

// ── initExamSchedule ───────────────────────────────────────────────────────

/**
 * Initialize exam schedule with randomized countdowns.
 * County: every 2-3 years, Provincial: every 3 years, Metropolitan: every 3 years.
 */
export function initExamSchedule(rng: Rng): {
  next_county: number;
  next_provincial: number;
  next_metropolitan: number;
} {
  return {
    next_county: rng.nextInt(4, 8),         // 1-2 years in seasons
    next_provincial: rng.nextInt(8, 12),     // 2-3 years in seasons
    next_metropolitan: rng.nextInt(10, 14),  // 2.5-3.5 years in seasons
  };
}

// ── resetAuxiliaryTools ────────────────────────────────────────────────────

/**
 * Reset auxiliary tools for a new exam cycle.
 */
export function resetAuxiliaryTools(year: number): {
  cheat_sheet_used_this_cycle: boolean;
  insider_tip_used_this_cycle: boolean;
  mentor_plea_used_this_cycle: boolean;
  current_exam_cycle_start_year: number;
} {
  return {
    cheat_sheet_used_this_cycle: false,
    insider_tip_used_this_cycle: false,
    mentor_plea_used_this_cycle: false,
    current_exam_cycle_start_year: year,
  };
}
