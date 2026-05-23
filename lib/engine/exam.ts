/**
 * Exam system — threshold calculation, scoring, risk evaluation, palace ranking.
 * Pure functions, no IO.
 */

import type { Era, ExamLevel } from "@/lib/game/constants";
import { EXAM_THRESHOLDS, ERA_MODIFIERS } from "@/lib/game/constants";
import { clamp } from "./balance";

// ── Exam Threshold ─────────────────────────────────────────────────────────

/**
 * threshold = base_threshold + era_modifier + (generation-1)*2 - fortune/10
 * Palace exam has no threshold (returns null).
 */
export function examThreshold(
  level: ExamLevel,
  era: Era,
  generation: number,
  fortune: number
): number | null {
  const base = EXAM_THRESHOLDS[level];
  if (base === null) return null; // palace exam — ranking only

  const eraModifier = ERA_MODIFIERS[era].exam_threshold_modifier;
  const generationModifier = (generation - 1) * 2;
  const fortuneBonus = fortune / 10;

  return base + eraModifier + generationModifier - fortuneBonus;
}

// ── Player Score Calculation ───────────────────────────────────────────────

/**
 * Fixed choice score:
 * raw_score = choice_base_value + erudition * 0.3 + court_whims_bonus
 * score = clamp(raw_score, 0, 100)
 */
export function scoreFixedChoice(
  choiceBaseValue: number,
  erudition: number,
  courtWhimsBonus: number
): number {
  const raw = choiceBaseValue + erudition * 0.3 + courtWhimsBonus;
  return clamp(Math.round(raw), 0, 100);
}

/**
 * Free text score:
 * raw_score = judge_lm_score * 0.7 + erudition * 0.3
 * score = clamp(raw_score, 0, 100)
 */
export function scoreFreeText(judgeLmScore: number, erudition: number): number {
  const raw = judgeLmScore * 0.7 + erudition * 0.3;
  return clamp(Math.round(raw), 0, 100);
}

/**
 * Cheat sheet bonus: erudition_bonus uses erudition * 0.6 instead of * 0.3
 * Returns the modified erudition bonus value.
 */
export function cheatSheetBonus(erudition: number): number {
  return erudition * 0.6;
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
