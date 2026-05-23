"use server";

import { getSessionId } from "@/lib/db/client";
import { topScores, recordVictory } from "@/lib/db/queries";
import type { LeaderboardEntry } from "@/lib/db/queries";

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
  const sessionId = await getSessionId();

  try {
    await recordVictory(sessionId, {
      session_id: sessionId,
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

/**
 * Get the current player's session ID (for highlighting in leaderboard).
 */
export async function getPlayerSessionId(): Promise<string> {
  return getSessionId();
}
