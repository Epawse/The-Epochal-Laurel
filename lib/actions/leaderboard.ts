"use server";

import { topScores, recordVictory } from "@/lib/db/queries";
import type { LeaderboardEntry } from "@/lib/db/queries";

export type { LeaderboardEntry };

/**
 * Fetch the top 12 leaderboard entries.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    return await topScores(12);
  } catch (e) {
    console.warn("Failed to fetch leaderboard:", e);
    return [];
  }
}

/**
 * Record a final score to the leaderboard table.
 */
export async function recordScore(
  familyName: string,
  tier: string,
  highestTitle: string,
  generations: number,
  score: number
): Promise<void> {
  try {
    await recordVictory({
      family_name: familyName,
      tier,
      highest_title: highestTitle,
      generations,
      score,
    });
  } catch (e) {
    console.warn("Failed to record score:", e);
  }
}
