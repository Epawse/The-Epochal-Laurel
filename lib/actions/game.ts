"use server";

import type { GameState } from "@/lib/game/schema";
import type { Origin, ExamLevel } from "@/lib/game/constants";
import { createCharacter, advanceSeason } from "@/lib/engine/reducer";
import { createRng } from "@/lib/engine/rng";
import { getSessionId } from "@/lib/db/client";
import { loadSave, upsertSave } from "@/lib/db/queries";

// ── Template Narrations ───────────────────────────────────────────────────────

const ACTION_NARRATIONS: Record<string, string[]> = {
  study: [
    "秉烛夜读，略有所得。",
    "翻阅经典，心有所悟。",
    "苦读诗书，渐有长进。",
    "研习策论，文思渐开。",
    "默诵经义，烂熟于胸。",
  ],
  socialize: [
    "与友人把酒言欢。",
    "拜访名士，获益匪浅。",
    "结交同窗，互通有无。",
    "诗会雅集，谈笑风生。",
    "登门拜谒，略有所获。",
  ],
  earn: [
    "经营有方，略有进账。",
    "辛勤劳作，小有积蓄。",
    "买卖周转，家用渐丰。",
    "代人写信，赚取润笔。",
    "教授蒙童，束脩入账。",
  ],
  rest: [
    "闭门养神，精力渐复。",
    "游山玩水，心旷神怡。",
    "静坐冥想，气定神闲。",
    "品茗听雨，悠然自得。",
    "归家省亲，身心舒畅。",
  ],
  scheme: [
    "暗中筹谋，小有收获。",
    "四处打点，关系渐通。",
    "上下活动，略有门路。",
    "觅得门路，暗自欣喜。",
    "打探消息，心中有数。",
  ],
};

// ── newGame ───────────────────────────────────────────────────────────────────

export async function newGame(
  familyName: string,
  origin: Origin
): Promise<GameState> {
  const sessionId = await getSessionId();

  // Use a time-based seed for initial RNG
  const seed = Date.now() % 2147483647;
  const rng = createRng(seed);

  const state = createCharacter(familyName || "张", origin, rng);

  // Persist to database
  try {
    await upsertSave(sessionId, state);
  } catch (e) {
    // If DB is not configured, continue without persistence
    console.warn("Failed to persist new game:", e);
  }

  return state;
}

// ── advanceTurn ───────────────────────────────────────────────────────────────

export interface AdvanceTurnResult {
  state: GameState;
  narration: string;
  eventTrigger: string | null;
  statChanges: { erudition: number; fortune: number; drive: number; wealth: number };
  schemeExposed: boolean;
  characterDied: boolean;
  deathReason: "drive_zero" | "max_age" | null;
}

export async function advanceTurn(
  currentState: GameState,
  actionId: string
): Promise<AdvanceTurnResult> {
  const sessionId = await getSessionId();

  // Create RNG from the game state's seed
  const rng = createRng(currentState.rng_seed);

  // Advance the season using the engine
  const result = advanceSeason(currentState, actionId, rng);

  // Update the RNG seed in the new state for next turn
  result.state.rng_seed = rng.nextInt(0, 2147483647);

  // Pick a narration template
  const narrations = ACTION_NARRATIONS[actionId] ?? ["时光流转。"];
  const narrationRng = createRng(result.state.turn_number);
  const narrationIndex = narrationRng.nextInt(0, narrations.length - 1);
  let narration = narrations[narrationIndex];

  // Add scheme exposure narration if applicable
  if (result.schemeExposed) {
    narration = "东窗事发！" + narration + " 然而行迹败露，名声大损。";
  }

  // Persist updated state
  try {
    await upsertSave(sessionId, result.state);
  } catch (e) {
    console.warn("Failed to persist game state:", e);
  }

  return {
    state: result.state,
    narration,
    eventTrigger: result.eventTrigger,
    statChanges: result.statChanges,
    schemeExposed: result.schemeExposed,
    characterDied: result.characterDied,
    deathReason: result.deathReason,
  };
}

// ── Placeholder stubs ─────────────────────────────────────────────────────────

export async function submitExamAnswer(
  _examLevel: ExamLevel,
  _choiceId: string,
  _freeText?: string
): Promise<{ error: string }> {
  return { error: "Not implemented yet — Task 5" };
}

export async function chooseHeir(
  _heirIndex: number,
  _blessingIds: string[]
): Promise<{ error: string }> {
  return { error: "Not implemented yet — Task 7" };
}

export async function useTool(
  _toolId: string
): Promise<{ error: string }> {
  return { error: "Not implemented yet — Task 5" };
}
