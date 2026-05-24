/**
 * Headless balance simulation harness.
 * This is intentionally pure and deterministic: no AI, no persistence, no UI.
 */

import type { ExamLevel } from "@/lib/game/constants";
import type { Stats } from "@/lib/game/schema";
import { createRng } from "./rng";
import type { Rng } from "./rng";
import {
  examThreshold,
  palaceRanking,
  rollExamPerformance,
  scoreFixedChoice,
  type AlignmentLevel,
} from "./exam";

export interface BalanceSimulationReport {
  runs: number;
  countyFirstTryPassRate: number;
  provincialFirstTryPassRate: number;
  metropolitanFirstTryPassRate: number;
  singleGenerationZhuangyuanRate: number;
}

const ALIGNMENT_PROFILE: Record<ExamLevel, Record<AlignmentLevel, number>> = {
  county: { none: 45, partial: 35, full: 20 },
  provincial: { none: 55, partial: 35, full: 10 },
  metropolitan: { none: 75, partial: 20, full: 5 },
  palace: { none: 87, partial: 9, full: 4 },
};

export function simulateBalance(runs: number = 1000, seed: number = 20260524): BalanceSimulationReport {
  let countyPasses = 0;
  let provincialPasses = 0;
  let metropolitanPasses = 0;
  let zhuangyuanRuns = 0;

  for (let i = 0; i < runs; i++) {
    const rng = createRng(seed + i);
    if (simulateThresholdAttempt("county", rng)) countyPasses += 1;
    if (simulateThresholdAttempt("provincial", rng)) provincialPasses += 1;
    const metropolitanPassed = simulateThresholdAttempt("metropolitan", rng);
    if (metropolitanPassed) metropolitanPasses += 1;
    if (metropolitanPassed && simulatePalaceZhuangyuan(rng)) zhuangyuanRuns += 1;
  }

  return {
    runs,
    countyFirstTryPassRate: countyPasses / runs,
    provincialFirstTryPassRate: provincialPasses / runs,
    metropolitanFirstTryPassRate: metropolitanPasses / runs,
    singleGenerationZhuangyuanRate: zhuangyuanRuns / runs,
  };
}

function simulateThresholdAttempt(level: Exclude<ExamLevel, "palace">, rng: Rng): boolean {
  const stats = rollAttemptStats(level, rng);
  const alignment = rollAlignment(level, rng);
  const baseScore = rollChoiceBase(level, rng);
  const performance = rollExamPerformance(stats, [], rng);
  const score = scoreFixedChoice(baseScore, stats.erudition, alignment, level, [], {
    variance: performance.variance,
  });
  const threshold = examThreshold(level, "prosperity", 1, stats.fortune);
  if (threshold === null) return true;
  return score >= threshold;
}

function simulatePalaceZhuangyuan(rng: Rng): boolean {
  const stats: Stats = {
    erudition: rng.nextInt(82, 100),
    fortune: rng.nextInt(20, 75),
    drive: 80,
    wealth: rng.nextInt(5, 80),
  };
  const performance = rollExamPerformance(stats, [], rng);
  const playerScore = scoreFixedChoice(
    rollChoiceBase("palace", rng),
    stats.erudition,
    rollAlignment("palace", rng),
    "palace",
    [],
    { variance: performance.variance }
  );
  const rivals = [
    { name: "赵文渊", score: rng.nextInt(55, 80) },
    { name: "钱伯谦", score: rng.nextInt(55, 80) },
    { name: "孙怀德", score: rng.nextInt(55, 80) },
  ];
  return palaceRanking("Player", playerScore, rivals)[0].name === "Player";
}

function rollAttemptStats(level: Exclude<ExamLevel, "palace">, rng: Rng): Stats {
  switch (level) {
    case "county":
      return {
        erudition: rng.nextInt(20, 38),
        fortune: rng.nextInt(0, 60),
        drive: 80,
        wealth: rng.nextInt(0, 50),
      };
    case "provincial":
      return {
        erudition: rng.nextInt(50, 70),
        fortune: rng.nextInt(5, 70),
        drive: 80,
        wealth: rng.nextInt(0, 70),
      };
    case "metropolitan":
      return {
        erudition: rng.nextInt(80, 100),
        fortune: rng.nextInt(10, 80),
        drive: 80,
        wealth: rng.nextInt(0, 90),
      };
  }
}

function rollChoiceBase(level: ExamLevel, rng: Rng): number {
  if (level === "county") return rng.nextInt(40, 65);
  return rng.nextInt(40, 70);
}

function rollAlignment(level: ExamLevel, rng: Rng): AlignmentLevel {
  const profile = ALIGNMENT_PROFILE[level];
  const roll = rng.nextInt(1, 100);
  if (roll <= profile.none) return "none";
  if (roll <= profile.none + profile.partial) return "partial";
  return "full";
}
