import { createClient } from "./client";
import { GameStateSchema, type GameState } from "@/lib/game/schema";

export interface LeaderboardEntry {
  session_id: string;
  family_name: string;
  tier: string;
  highest_title: string;
  generations: number;
  score: number;
}

/**
 * Load a saved game state by session ID.
 * Returns null if no save exists.
 */
export async function loadSave(sessionId: string): Promise<GameState | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("saves")
    .select("state")
    .eq("session_id", sessionId)
    .single();

  if (error || !data) {
    return null;
  }

  // Validate the stored state against schema
  const parsed = GameStateSchema.safeParse(data.state);
  if (!parsed.success) {
    console.error("Invalid saved state:", parsed.error.issues);
    return null;
  }

  return parsed.data;
}

/**
 * Upsert (insert or update) a game save.
 */
export async function upsertSave(
  sessionId: string,
  state: GameState
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("saves").upsert(
    {
      session_id: sessionId,
      state: state as unknown as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "session_id" }
  );

  if (error) {
    console.error("Failed to save game state:", error);
    throw new Error("Failed to save game state");
  }
}

/**
 * Get top scores from the leaderboard.
 */
export async function topScores(limit: number = 12): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leaderboard")
    .select("session_id, family_name, tier, highest_title, generations, score")
    .order("score", { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as LeaderboardEntry[];
}

/**
 * Record a victory on the leaderboard.
 */
export async function recordVictory(
  sessionId: string,
  entry: LeaderboardEntry
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("leaderboard").insert({
    session_id: sessionId,
    family_name: entry.family_name,
    tier: entry.tier,
    highest_title: entry.highest_title,
    generations: entry.generations,
    score: entry.score,
  });

  if (error) {
    console.error("Failed to record victory:", error);
    throw new Error("Failed to record victory");
  }
}
