import { createClient } from "./client";
import { GameStateSchema, type GameState } from "@/lib/game/schema";

export interface LeaderboardEntry {
  family_name: string;
  tier: string;
  highest_title: string;
  generations: number;
  score: number;
}

const globalForDev = globalThis as unknown as {
  __memorySaves?: Map<string, GameState>;
  __memoryLeaderboard?: LeaderboardEntry[];
};

const memorySaves: Map<string, GameState> =
  globalForDev.__memorySaves ?? (globalForDev.__memorySaves = new Map());
const memoryLeaderboard: LeaderboardEntry[] =
  globalForDev.__memoryLeaderboard ?? (globalForDev.__memoryLeaderboard = []);
const PERSISTENCE_UNAVAILABLE = "persistence_unavailable";

function canUseMemoryFallback(): boolean {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.SUPABASE_MEMORY_FALLBACK === "true"
  );
}

function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function describeError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const err = error as {
    code?: unknown;
    message?: unknown;
    details?: unknown;
    hint?: unknown;
    name?: unknown;
    status?: unknown;
  };

  return {
    code: err.code,
    message: err.message,
    details: err.details,
    hint: err.hint,
    name: err.name,
    status: err.status,
  };
}

function logPersistenceFailure(
  operation: string,
  error: unknown,
  extra: Record<string, unknown> = {}
): void {
  console.warn(
    JSON.stringify({
      event: "supabase.persistence_fallback",
      operation,
      memoryFallbackEnabled: canUseMemoryFallback(),
      error: describeError(error),
      ...extra,
    })
  );
}

async function getSupabaseClient(operation: string) {
  if (!hasSupabaseConfig()) {
    console.warn(
      JSON.stringify({
        event: "supabase.persistence_fallback",
        operation,
        memoryFallbackEnabled: canUseMemoryFallback(),
        reason: "missing_supabase_config",
      })
    );
    return null;
  }

  try {
    return await createClient();
  } catch (error) {
    logPersistenceFailure(operation, error);
    return null;
  }
}

function cloneState(state: GameState): GameState {
  return GameStateSchema.parse(structuredClone(state));
}

function createMemorySave(state: GameState): string {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `memory-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  memorySaves.set(id, cloneState(state));
  return id;
}

function createFallbackSave(operation: string, state: GameState): string {
  if (canUseMemoryFallback()) {
    return createMemorySave(state);
  }

  logPersistenceFailure(operation, "Supabase unavailable in production");
  throw new Error(PERSISTENCE_UNAVAILABLE);
}

function updateFallbackSave(
  operation: string,
  id: string,
  state: GameState
): void {
  if (canUseMemoryFallback()) {
    memorySaves.set(id, cloneState(state));
    return;
  }

  logPersistenceFailure(operation, "Supabase unavailable in production", {
    saveId: id,
  });
  throw new Error(PERSISTENCE_UNAVAILABLE);
}

function isMissingRowError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "PGRST116"
  );
}

/**
 * Load a saved game state by save ID (primary key).
 */
export async function loadSave(id: string): Promise<GameState | null> {
  const memoryState = memorySaves.get(id);
  if (memoryState) {
    return cloneState(memoryState);
  }

  const supabase = await getSupabaseClient("load_save");
  if (!supabase) {
    if (canUseMemoryFallback()) return null;
    throw new Error(PERSISTENCE_UNAVAILABLE);
  }

  const { data, error } = await supabase
    .from("saves")
    .select("state")
    .eq("id", id)
    .single();

  if (error || !data) {
    if (error) {
      logPersistenceFailure("load_save", error, { saveId: id });
      if (!canUseMemoryFallback() && !isMissingRowError(error)) {
        throw new Error(PERSISTENCE_UNAVAILABLE);
      }
    }
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
  const supabase = await getSupabaseClient("create_save");
  if (!supabase) {
    return createFallbackSave("create_save", validated);
  }

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
    logPersistenceFailure("create_save", error ?? "No row returned from insert", {
      expectedColumns: ["id"],
    });
    return createFallbackSave("create_save", validated);
  }

  return data.id;
}

/**
 * Update an existing save by ID.
 */
export async function upsertSave(id: string, state: GameState): Promise<void> {
  const validated = GameStateSchema.parse(state);
  const hasMemorySave = memorySaves.has(id);
  if (hasMemorySave) {
    memorySaves.set(id, cloneState(validated));
    return;
  }

  const supabase = await getSupabaseClient("update_save");
  if (!supabase) {
    updateFallbackSave("update_save", id, validated);
    return;
  }

  const { error } = await supabase
    .from("saves")
    .update({
      state: validated as unknown as Record<string, unknown>,
      turn_number: validated.turn_number,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    logPersistenceFailure("update_save", error, { saveId: id });
    updateFallbackSave("update_save", id, validated);
  }
}

/**
 * Get top scores from the leaderboard.
 */
export async function topScores(limit: number = 12): Promise<LeaderboardEntry[]> {
  const supabase = await getSupabaseClient("top_scores");
  if (!supabase) {
    if (!canUseMemoryFallback()) return [];
    return memoryLeaderboard
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  const { data, error } = await supabase
    .from("leaderboard")
    .select("family_name, tier, highest_title, generations, score")
    .order("score", { ascending: false })
    .limit(limit);

  if (error || !data) {
    if (error) {
      logPersistenceFailure("top_scores", error, { limit });
    }
    if (!canUseMemoryFallback()) return [];
    return memoryLeaderboard
      .slice()
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  return data as LeaderboardEntry[];
}

/**
 * Record a victory on the leaderboard.
 */
export async function recordVictory(entry: LeaderboardEntry): Promise<void> {
  const supabase = await getSupabaseClient("record_victory");
  if (!supabase) {
    if (!canUseMemoryFallback()) return;
    memoryLeaderboard.push(entry);
    return;
  }

  const { error } = await supabase.from("leaderboard").insert({
    family_name: entry.family_name,
    tier: entry.tier,
    highest_title: entry.highest_title,
    generations: entry.generations,
    score: entry.score,
  });

  if (error) {
    logPersistenceFailure("record_victory", error, { familyName: entry.family_name });
    if (!canUseMemoryFallback()) return;
    memoryLeaderboard.push(entry);
  }
}
