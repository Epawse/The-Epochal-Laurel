import { createClient } from "./client";
import { GameStateSchema, type GameState } from "@/lib/game/schema";

export interface LeaderboardEntry {
  family_name: string;
  tier: string;
  highest_title: string;
  generations: number;
  score: number;
}

/**
 * Load a saved game state by save ID (primary key).
 */
export async function loadSave(id: string): Promise<GameState | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("saves")
    .select("state")
    .eq("id", id)
    .single();

  if (error || !data) {
    return null;
  }

  const parsed = GameStateSchema.safeParse(data.state);
  if (!parsed.success) {
    console.error("Invalid saved state:", parsed.error.issues);
    return null;
  }

  return parsed.data;
}

/**
 * Create a new save row and return its UUID.
 */
export async function createSave(state: GameState): Promise<string> {
  const validated = GameStateSchema.parse(state);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("saves")
    .insert({
      slot: "default",
      state: validated as unknown as Record<string, unknown>,
      turn_number: validated.turn_number,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error("Failed to create save");
  }

  return data.id;
}

/**
 * Update an existing save by ID.
 */
export async function upsertSave(id: string, state: GameState): Promise<void> {
  const validated = GameStateSchema.parse(state);
  const supabase = await createClient();

  const { error } = await supabase
    .from("saves")
    .update({
      state: validated as unknown as Record<string, unknown>,
      turn_number: validated.turn_number,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
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
    .select("family_name, tier, highest_title, generations, score")
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
export async function recordVictory(entry: LeaderboardEntry): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from("leaderboard").insert({
    family_name: entry.family_name,
    tier: entry.tier,
    highest_title: entry.highest_title,
    generations: entry.generations,
    score: entry.score,
  });

  if (error) {
    throw new Error("Failed to record victory");
  }
}
