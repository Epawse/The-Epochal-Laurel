/**
 * Exam system — threshold calculation, scoring, risk evaluation, palace ranking.
 * Pure functions, no IO.
 */

import type { Era, ExamLevel } from "@/lib/game/constants";
import type { Modifier, Stats } from "@/lib/game/schema";
import { EXAM_THRESHOLDS, ERA_MODIFIERS } from "@/lib/game/constants";
import { clamp } from "./balance";
import type { Rng } from "./rng";
import {
  applyExamScoreModifiers,
  applyExamThresholdModifiers,
  isExamAlignmentRelaxed,
} from "./effects";
import { rollCheck } from "./dice";

const FIXED_CHOICE_BASE_WEIGHT = 0.4;
const EXAM_ERUDITION_WEIGHT = 0.4;
const FREE_TEXT_JUDGE_WEIGHT = 0.55;
const METROPOLITAN_ALIGNMENT_CAP = 55;
const PALACE_ALIGNMENT_CAP = 50;
const FREE_TEXT_ALIGNMENT_NONE_MAX = 7;
const FREE_TEXT_ALIGNMENT_PARTIAL_MAX = 17;

// ── Exam Threshold ─────────────────────────────────────────────────────────

/**
 * threshold = base_threshold + era_modifier + (generation-1)*2 - fortune/10
 * Palace exam has no threshold (returns null).
 */
export function examThreshold(
  level: ExamLevel,
  era: Era,
  generation: number,
  fortune: number,
  modifiers: readonly Modifier[] = []
): number | null {
  const base = EXAM_THRESHOLDS[level];
  if (base === null) return null; // palace exam — ranking only

  const eraModifier = ERA_MODIFIERS[era].exam_threshold_modifier;
  const generationModifier = (generation - 1) * 2;
  const fortuneBonus = fortune / 10;

  const threshold = base + eraModifier + generationModifier - fortuneBonus;
  return applyExamThresholdModifiers(level, threshold, modifiers);
}

// ── Player Score Calculation ───────────────────────────────────────────────

export function scoreFixedChoice(
  choiceBaseValue: number,
  erudition: number,
  alignment: AlignmentLevel,
  examLevel: ExamLevel,
  modifiers: readonly Modifier[] = [],
  options: { variance?: number; cheatSheetActive?: boolean } = {}
): number {
  const eruditionTerm = erudition * EXAM_ERUDITION_WEIGHT * (options.cheatSheetActive ? 2 : 1);
  const raw =
    choiceBaseValue * FIXED_CHOICE_BASE_WEIGHT +
    eruditionTerm +
    alignmentTerm(examLevel, alignment) +
    (options.variance ?? 0);
  const modified = applyExamScoreModifiers(examLevel, raw, modifiers);
  return applyAlignmentGate(examLevel, alignment, clamp(modified, 0, 100), modifiers);
}

export function scoreFreeText(
  judgeLmScore: number,
  erudition: number,
  examLevel: ExamLevel,
  modifiers: readonly Modifier[] = [],
  options: { variance?: number; cheatSheetActive?: boolean; judgeAlignmentScore?: number } = {}
): number {
  const eruditionTerm = erudition * EXAM_ERUDITION_WEIGHT * (options.cheatSheetActive ? 2 : 1);
  const raw =
    judgeLmScore * FREE_TEXT_JUDGE_WEIGHT +
    eruditionTerm +
    (options.variance ?? 0);
  const modified = applyExamScoreModifiers(examLevel, raw, modifiers);
  const alignment = alignmentFromJudgeScore(options.judgeAlignmentScore);
  return applyAlignmentGate(examLevel, alignment, clamp(modified, 0, 100), modifiers);
}

/**
 * Cheat sheet bonus under the new formula: erudition uses W_ERUDITION * 2.
 * Returns the modified erudition bonus value.
 */
export function cheatSheetBonus(erudition: number): number {
  return erudition * EXAM_ERUDITION_WEIGHT * 2;
}

export interface ExamPerformance {
  roll: number;
  total: number;
  modifier: number;
  tier: "crit_success" | "success" | "normal" | "fail" | "crit_fail";
  variance: number;
  label: "超常发挥" | "发挥良好" | "正常发挥" | "发挥失常" | "严重失常";
}

export function rollExamPerformance(
  stats: Stats,
  modifiers: readonly Modifier[],
  rng: Rng
): ExamPerformance {
  const baseModifier = Math.round((stats.erudition + stats.fortune) / 20);
  const roll = rollCheck({
    rng,
    dc: 15,
    modifier: baseModifier,
    category: "exam",
    modifiers,
  });
  const natural = roll.rolls[0];

  if (natural === 20) {
    return { roll: natural, total: roll.total, modifier: roll.modifier, tier: "crit_success", variance: 12, label: "超常发挥" };
  }
  if (natural === 1) {
    return { roll: natural, total: roll.total, modifier: roll.modifier, tier: "crit_fail", variance: -15, label: "严重失常" };
  }
  if (roll.total >= 15) {
    return { roll: natural, total: roll.total, modifier: roll.modifier, tier: "success", variance: 6, label: "发挥良好" };
  }
  if (roll.total >= 8) {
    return { roll: natural, total: roll.total, modifier: roll.modifier, tier: "normal", variance: 0, label: "正常发挥" };
  }
  return { roll: natural, total: roll.total, modifier: roll.modifier, tier: "fail", variance: -8, label: "发挥失常" };
}

/**
 * Mentor's plea: threshold reduced by 15.
 */
export function mentorPleaThreshold(originalThreshold: number): number {
  return originalThreshold - 15;
}

// ── Court Whims Alignment ──────────────────────────────────────────────────

export type AlignmentLevel = "none" | "partial" | "full";

export interface CourtWhims {
  style: string;
  emperor_temperament: string;
}

export interface ChoiceAlignment {
  style?: string;
  temperament?: string;
}

/**
 * Court whims alignment scoring:
 * - Style match: +10
 * - Temperament match: +10
 * - Both match: +20 (capped, not +25)
 * - No match: 0
 */
export function courtWhimsAlignment(
  choice: ChoiceAlignment,
  courtWhims: CourtWhims
): { level: AlignmentLevel; bonus: number } {
  let bonus = 0;

  if (choice.style && choice.style === courtWhims.style) {
    bonus += 10;
  }
  if (choice.temperament && choice.temperament === courtWhims.emperor_temperament) {
    bonus += 10;
  }

  let level: AlignmentLevel;
  if (bonus === 20) {
    level = "full";
  } else if (bonus === 10) {
    level = "partial";
  } else {
    level = "none";
  }

  return { level, bonus };
}

function alignmentTerm(level: ExamLevel, alignment: AlignmentLevel): number {
  if (alignment === "none") return 0;
  const highLevelExam = level === "metropolitan" || level === "palace";
  if (alignment === "partial") return highLevelExam ? 12 : 8;
  return highLevelExam ? 24 : 16;
}

function applyAlignmentGate(
  level: ExamLevel,
  alignment: AlignmentLevel,
  score: number,
  modifiers: readonly Modifier[]
): number {
  if (alignment !== "none" || isExamAlignmentRelaxed(level, modifiers)) {
    return score;
  }
  if (level === "metropolitan") return Math.min(score, METROPOLITAN_ALIGNMENT_CAP);
  if (level === "palace") return Math.min(score, PALACE_ALIGNMENT_CAP);
  return score;
}

function alignmentFromJudgeScore(score: number | undefined): AlignmentLevel {
  if (score === undefined) return "full";
  if (score <= FREE_TEXT_ALIGNMENT_NONE_MAX) return "none";
  if (score <= FREE_TEXT_ALIGNMENT_PARTIAL_MAX) return "partial";
  return "full";
}

// ── Risk Evaluation ────────────────────────────────────────────────────────

export type RiskCondition = "temperament_mismatch" | "style_mismatch" | "full_mismatch";

/**
 * Evaluate whether a risk condition triggers a penalty.
 * Returns true if the penalty should be applied.
 */
export function evaluateRiskCondition(
  riskCondition: RiskCondition,
  courtWhims: CourtWhims,
  choiceAlignment: ChoiceAlignment
): boolean {
  switch (riskCondition) {
    case "temperament_mismatch":
      // Triggers when choice alignment does NOT match emperor_temperament
      return (
        !choiceAlignment.temperament ||
        choiceAlignment.temperament !== courtWhims.emperor_temperament
      );
    case "style_mismatch":
      // Triggers when choice alignment does NOT match style
      return (
        !choiceAlignment.style ||
        choiceAlignment.style !== courtWhims.style
      );
    case "full_mismatch":
      // Triggers when NEITHER style nor temperament matches
      return (
        (!choiceAlignment.style || choiceAlignment.style !== courtWhims.style) &&
        (!choiceAlignment.temperament || choiceAlignment.temperament !== courtWhims.emperor_temperament)
      );
    default:
      return false;
  }
}

// ── Palace Ranking ─────────────────────────────────────────────────────────

export interface RankingEntry {
  name: string;
  score: number;
  rank: number;
  title: string;
}

const PALACE_TITLES = ["状元", "榜眼", "探花", "进士"] as const;

/**
 * Palace exam ranking — no threshold, purely competitive.
 * Sorts all candidates by score descending and assigns titles.
 * Returns sorted ranking with title assignments.
 */
export function palaceRanking(
  playerName: string,
  playerScore: number,
  rivals: Array<{ name: string; score: number }>
): RankingEntry[] {
  const allCandidates = [
    { name: playerName, score: playerScore },
    ...rivals,
  ];

  // Sort by score descending
  allCandidates.sort((a, b) => b.score - a.score);

  return allCandidates.map((candidate, index) => ({
    name: candidate.name,
    score: candidate.score,
    rank: index + 1,
    title: index < PALACE_TITLES.length ? PALACE_TITLES[index] : "进士",
  }));
}
