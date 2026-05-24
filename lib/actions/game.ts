"use server";

import type { GameState, Npc, CurrentEvent } from "@/lib/game/schema";
import type { Origin, ExamLevel, EventType } from "@/lib/game/constants";
import { createCharacter, advanceSeason, applyEventChoice, resolveExam, resolvePalaceExam } from "@/lib/engine/reducer";
import { createRng } from "@/lib/engine/rng";
import { applyStatChanges } from "@/lib/engine/balance";
import { loadSave, createSave, upsertSave } from "@/lib/db/queries";
import { generateEvent } from "@/lib/ai/contracts/event";
import { evaluateEventFreeInput } from "@/lib/ai/contracts/eventEval";
import { generateNpcDialogue } from "@/lib/ai/contracts/npcDialogue";
import type { V1Input, N1Input } from "@/lib/ai/schema";

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

// ── NPC Name Pools ────────────────────────────────────────────────────────────

const NPC_SURNAMES = ["王", "李", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴"];
const NPC_GIVEN_NAMES = ["文远", "伯谦", "怀德", "子安", "明远", "仲达", "叔夜", "季常", "元亮", "公瑾"];
const NPC_PERSONALITIES = ["strict", "warm", "corrupt", "idealistic"] as const;

// ── newGame ───────────────────────────────────────────────────────────────────

export interface NewGameResult {
  id: string;
  state: GameState;
}

export async function newGame(
  familyName: string,
  origin: Origin
): Promise<NewGameResult> {
  const seed = Date.now() % 2147483647;
  const rng = createRng(seed);
  const state = createCharacter(familyName || "张", origin, rng);
  const id = await createSave(state);
  return { id, state };
}

// ── loadGame ─────────────────────────────────────────────────────────────────

export async function loadGame(saveId: string): Promise<GameState | null> {
  return loadSave(saveId);
}

// ── advanceTurn ───────────────────────────────────────────────────────────────

export interface AdvanceTurnResult {
  state: GameState;
  narration: string;
  npcDialogue: string | null;
  eventTrigger: string | null;
  statChanges: { erudition: number; fortune: number; drive: number; wealth: number };
  schemeExposed: boolean;
  characterDied: boolean;
  deathReason: "drive_zero" | "max_age" | null;
}

export async function advanceTurn(
  saveId: string,
  actionId: string
): Promise<AdvanceTurnResult> {
  const currentState = await loadSave(saveId);
  if (!currentState) throw new Error("save_not_found");

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

  // NPC interactions on socialize/scheme
  let npcDialogue: string | null = null;
  const npcRng = createRng(result.state.turn_number + 7777);

  if (actionId === "socialize") {
    // Try NPC dialogue with existing NPC
    const aliveNpcs = result.state.npcs.filter((n) => n.alive);
    if (aliveNpcs.length > 0) {
      const targetNpc = aliveNpcs[npcRng.nextInt(0, aliveNpcs.length - 1)];
      const dialogueInput: N1Input = {
        npc: {
          name: targetNpc.name,
          role: targetNpc.role,
          personality: targetNpc.personality,
          memory: targetNpc.memory.map((m) => ({ event: m.event, sentiment: m.sentiment })),
        },
        character_name: result.state.character.name,
        interaction_type: "greeting",
        world_context: {
          era: result.state.world.era,
          season: result.state.world.season,
        },
      };
      const dialogue = await generateNpcDialogue(dialogueInput);
      npcDialogue = `${targetNpc.name}：「${dialogue.dialogue}」`;

      // Apply relationship delta
      const npcIdx = result.state.npcs.findIndex((n) => n.id === targetNpc.id);
      if (npcIdx >= 0) {
        addNpcMemory(result.state.npcs[npcIdx], "交游互动", "positive", result.state.turn_number);
        // Update affinity in character relationships
        const rel = result.state.character.relationships.find((r) => r.npc_id === targetNpc.id);
        if (rel) {
          rel.affinity = Math.max(-50, Math.min(100, rel.affinity + dialogue.relationship_delta));
        }
      }

      // Court whims reveal via patron NPC
      if (targetNpc.role === "patron") {
        const rel = result.state.character.relationships.find((r) => r.npc_id === targetNpc.id);
        if (rel && rel.affinity >= 40 && result.state.world.court_whims_revealed.temperament_known !== "full") {
          result.state.world.court_whims_revealed.temperament_known = "full";
          result.state.world.court_whims_revealed.temperament_eliminated = [];
          npcDialogue += " （获悉圣上性情）";
        }
      }

      // Court whims partial reveal via socialize with fortune >= 30
      if (
        result.state.character.stats.fortune >= 30 &&
        result.state.world.court_whims_revealed.temperament_known === "hidden"
      ) {
        // Eliminate 2 of 4 temperament options
        const allTemperaments = ["ambitious", "lazy", "paranoid", "benevolent"];
        const actual = result.state.world.court_whims.emperor_temperament;
        const others = allTemperaments.filter((t) => t !== actual);
        // Pick 2 to eliminate
        const eliminated = others.slice(0, 2);
        result.state.world.court_whims_revealed.temperament_known = "partial";
        result.state.world.court_whims_revealed.temperament_eliminated = eliminated;
      }
    }

    // 30% chance to create a new friend NPC (if < 5 NPCs exist).
    // Friends are flavor NPCs — they get NO relationship entry. Relationships are
    // reserved for affinity-bearing roles (mentor/rival/spouse/patron), and the
    // RelationshipSchema enum has no "friend". Attaching a "mentor" relationship
    // here previously let an ordinary friend satisfy 恩师引荐.
    if (result.state.npcs.filter((n) => n.alive).length < 5 && npcRng.next() < 0.30) {
      const newNpc = createRandomNpc(result.state, npcRng, "friend");
      result.state.npcs.push(newNpc);
      if (!npcDialogue) {
        npcDialogue = `结识了${newNpc.name}（${npcRoleLabel(newNpc.role)}）。`;
      }
    }
  }

  if (actionId === "scheme") {
    // 20% chance to create a patron NPC
    if (result.state.npcs.filter((n) => n.alive).length < 5 && npcRng.next() < 0.20) {
      const newNpc = createRandomNpc(result.state, npcRng, "patron");
      result.state.npcs.push(newNpc);
      result.state.character.relationships.push({
        npc_id: newNpc.id,
        type: "patron",
        affinity: 25,
      });
      npcDialogue = `结识了${newNpc.name}（${npcRoleLabel(newNpc.role)}），或可为仕途助力。`;
    }
  }

  // Generate event if triggered
  if (result.eventTrigger && !result.characterDied) {
    const eventType = result.eventTrigger as EventType;
    const v1Input: V1Input = {
      character: {
        name: result.state.character.name,
        age: result.state.character.age,
        erudition: result.state.character.stats.erudition,
        fortune: result.state.character.stats.fortune,
        drive: result.state.character.stats.drive,
        titles: result.state.character.titles,
        traits: result.state.character.traits,
      },
      world: {
        era: result.state.world.era,
        season: result.state.world.season,
        year: result.state.world.year,
      },
      event_type: eventType,
      recent_events: result.state.world.events_this_era.slice(-3),
      available_npcs: result.state.npcs
        .filter((n) => n.alive)
        .map((n) => ({ name: n.name, role: n.role })),
    };

    const v1Event = await generateEvent(v1Input);

    // Map V1Event to CurrentEvent schema
    const currentEvent: CurrentEvent = {
      id: `evt_${result.state.turn_number}_${Date.now() % 10000}`,
      type: eventType,
      title: v1Event.title,
      description: v1Event.description,
      choices: v1Event.choices.map((c) => ({
        id: c.id,
        label: c.label,
        stat_changes: c.stat_changes,
        risk: null,
        narrative_hint: c.narrative_preview,
      })),
      allows_free_input: v1Event.allows_free_input,
      context_for_judge: {
        relevant_npcs: result.state.npcs.filter((n) => n.alive).map((n) => n.name),
        relevant_items: result.state.character.inventory.map((i) => i.name),
      },
    };

    result.state.current_event = currentEvent;
    result.state.world.events_this_era.push(v1Event.title);
  }

  // Persist updated state
  await upsertSave(saveId, result.state);

  return {
    state: result.state,
    narration,
    npcDialogue,
    eventTrigger: result.eventTrigger,
    statChanges: result.statChanges,
    schemeExposed: result.schemeExposed,
    characterDied: result.characterDied,
    deathReason: result.deathReason,
  };
}

// ── submitEventChoice ─────────────────────────────────────────────────────────

export interface EventChoiceResult {
  state: GameState;
  narration: string;
}

export async function submitEventChoice(
  saveId: string,
  choiceId: string
): Promise<EventChoiceResult> {
  const currentState = await loadSave(saveId);
  if (!currentState) throw new Error("save_not_found");

  const newState = applyEventChoice(currentState, choiceId);

  const choice = currentState.current_event?.choices.find((c) => c.id === choiceId);
  const narration = choice?.narrative_hint || "事情就这样过去了。";

  await upsertSave(saveId, newState);
  return { state: newState, narration };
}

// ── submitEventFreeInput ──────────────────────────────────────────────────────

export interface EventFreeInputResult {
  state: GameState;
  narration: string;
  success: boolean;
}

export async function submitEventFreeInput(
  saveId: string,
  freeText: string
): Promise<EventFreeInputResult> {
  const currentState = await loadSave(saveId);
  if (!currentState) throw new Error("save_not_found");

  if (!currentState.current_event) {
    return { state: currentState, narration: "没有待处理的事件。", success: false };
  }

  const event = currentState.current_event;

  const evalResult = await evaluateEventFreeInput({
    event_title: event.title,
    event_description: event.description,
    player_input: freeText,
    character_stats: {
      erudition: currentState.character.stats.erudition,
      fortune: currentState.character.stats.fortune,
      drive: currentState.character.stats.drive,
    },
    character_items: currentState.character.inventory.map((i) => i.name),
    available_npcs: currentState.npcs
      .filter((n) => n.alive)
      .map((n) => ({ name: n.name, role: n.role })),
  });

  const newState = structuredClone(currentState) as GameState;
  newState.character.stats = applyStatChanges(
    newState.character.stats,
    evalResult.stat_changes
  );

  if (evalResult.npc_reaction) {
    const npc = newState.npcs.find((n) => n.name === evalResult.npc_reaction!.npc_name);
    if (npc) {
      addNpcMemory(npc, evalResult.npc_reaction.reaction, "notable", newState.turn_number);
      const rel = newState.character.relationships.find((r) => r.npc_id === npc.id);
      if (rel) {
        rel.affinity = Math.max(-50, Math.min(100, rel.affinity + evalResult.npc_reaction.relationship_delta));
      }
    }
  }

  newState.current_event = null;
  await upsertSave(saveId, newState);

  return {
    state: newState,
    narration: evalResult.narrative_result,
    success: evalResult.success,
  };
}

// ── NPC Helpers ───────────────────────────────────────────────────────────────

function createRandomNpc(
  state: GameState,
  rng: { nextInt: (min: number, max: number) => number; next: () => number },
  role: Npc["role"]
): Npc {
  const surname = NPC_SURNAMES[rng.nextInt(0, NPC_SURNAMES.length - 1)];
  const given = NPC_GIVEN_NAMES[rng.nextInt(0, NPC_GIVEN_NAMES.length - 1)];
  const personality = NPC_PERSONALITIES[rng.nextInt(0, NPC_PERSONALITIES.length - 1)];

  return {
    id: `npc_${state.turn_number}_${rng.nextInt(1000, 9999)}`,
    name: `${surname}${given}`,
    role,
    personality,
    era_introduced: state.world.era,
    generation_introduced: state.character.generation,
    alive: true,
    memory: [],
  };
}

function addNpcMemory(npc: Npc, event: string, sentiment: string, turn: number): void {
  // Cap at 10 entries — drop oldest when full
  if (npc.memory.length >= 10) {
    npc.memory.shift();
  }
  npc.memory.push({ event, sentiment, turn });
}

function npcRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    mentor: "恩师",
    rival: "对手",
    patron: "贵人",
    friend: "友人",
    examiner: "考官",
    spouse: "配偶",
  };
  return labels[role] ?? role;
}

// ── getExamQuestion ──────────────────────────────────────────────────────────

import { EXAM_REWARDS } from "@/lib/game/constants";
import {
  scoreFixedChoice,
  scoreFreeText,
  examThreshold,
  evaluateRiskCondition,
  type RiskCondition,
  type CourtWhims,
} from "@/lib/engine/exam";
import { generateExamQuestion } from "@/lib/ai/contracts/examQuestion";
import { evaluateFreeText } from "@/lib/ai/contracts/judge";
import { generateNarration } from "@/lib/ai/contracts/narrate";
import type { E1ExamQuestion } from "@/lib/ai/schema";

export async function getExamQuestion(
  saveId: string,
  examLevel: ExamLevel
): Promise<E1ExamQuestion> {
  const currentState = await loadSave(saveId);
  if (!currentState) throw new Error("save_not_found");

  const previousQuestions = currentState.character.exam_history
    .filter((e) => e.level === examLevel)
    .map(() => "");

  return generateExamQuestion({
    exam_level: examLevel,
    era: currentState.world.era,
    court_whims: {
      style: currentState.world.court_whims.style,
      emperor_temperament: currentState.world.court_whims.emperor_temperament,
    },
    year: currentState.world.year,
    character_erudition: currentState.character.stats.erudition,
    previous_questions_this_run: previousQuestions.filter(Boolean),
  });
}

// ── submitExamAnswer ─────────────────────────────────────────────────────────

export interface ExamResult {
  passed: boolean;
  score: number;
  threshold: number | null;
  title: string | null;
  narration: string;
  soundCue: string;
  statChanges: { erudition: number; fortune: number; drive: number; wealth: number };
  judgeNarrative: string | null;
  riskTriggered: boolean;
  riskPenalty: { drive: number; fortune: number } | null;
  state: GameState;
}

export async function submitExamAnswer(
  saveId: string,
  examLevel: ExamLevel,
  question: E1ExamQuestion,
  choiceId: string | null,
  freeText: string | null,
  cheatSheetActive: boolean
): Promise<ExamResult> {
  const currentState = await loadSave(saveId);
  if (!currentState) throw new Error("save_not_found");
  const { character, world } = currentState;
  const erudition = character.stats.erudition;

  let score: number;
  let judgeNarrative: string | null = null;
  let riskTriggered = false;
  let riskPenalty: { drive: number; fortune: number } | null = null;

  if (freeText && freeText.trim().length > 0) {
    // ── Free-text path: call E2 Judge ──
    const judgeResult = await evaluateFreeText({
      question_text: question.question_text,
      player_answer: freeText,
      court_whims: {
        style: world.court_whims.style,
        emperor_temperament: world.court_whims.emperor_temperament,
      },
      exam_level: examLevel,
      character_erudition: erudition,
      character_items: character.inventory.map((i) => i.name),
    });

    // Free-text score: judge_lm_score * 0.7 + erudition * 0.3
    // With cheat sheet: erudition * 0.6 instead of * 0.3
    const eruditionBonus = cheatSheetActive ? erudition * 0.6 : erudition * 0.3;
    score = Math.round(
      Math.max(0, Math.min(100, judgeResult.total_score * 0.7 + eruditionBonus))
    );
    judgeNarrative = judgeResult.judge_narrative;
    // No risk evaluation for free-text answers
  } else if (choiceId) {
    // ── Fixed choice path ──
    const choice = question.choices.find((c) => c.id === choiceId);
    if (!choice) {
      throw new Error(`Invalid choice ID: ${choiceId}`);
    }

    // Court whims alignment bonus
    let courtWhimsBonus = 0;
    if (choice.alignment === "full") courtWhimsBonus = 20;
    else if (choice.alignment === "partial") courtWhimsBonus = 10;

    // Fixed choice score: base + erudition*0.3 + court_whims_bonus
    // With cheat sheet: erudition*0.6 instead of *0.3
    const eruditionBonus = cheatSheetActive ? erudition * 0.6 : erudition * 0.3;
    score = Math.round(
      Math.max(0, Math.min(100, choice.base_score + eruditionBonus + courtWhimsBonus))
    );

    // Evaluate risk condition
    if (choice.risk) {
      const courtWhims: CourtWhims = {
        style: world.court_whims.style,
        emperor_temperament: world.court_whims.emperor_temperament,
      };
      // For risk evaluation: the choice's alignment field tells us how well it
      // aligns with court preferences. We construct a ChoiceAlignment object
      // that the engine's evaluateRiskCondition can check.
      const choiceAlignment = {
        style: choice.alignment === "full" || choice.alignment === "partial"
          ? world.court_whims.style
          : undefined,
        temperament: choice.alignment === "full"
          ? world.court_whims.emperor_temperament
          : undefined,
      };

      const triggered = evaluateRiskCondition(
        choice.risk.condition as RiskCondition,
        courtWhims,
        choiceAlignment
      );

      if (triggered) {
        riskTriggered = true;
        riskPenalty = {
          drive: choice.risk.penalty.drive,
          fortune: choice.risk.penalty.fortune,
        };
      }
    }
  } else {
    throw new Error("Must provide either choiceId or freeText");
  }

  // Determine pass/fail
  const threshold = examThreshold(
    examLevel,
    world.era,
    character.generation,
    character.stats.fortune
  );
  const passed = threshold === null ? true : score >= threshold;

  // Delegate state mutations to engine (awards title, records history, resets schedule)
  const riskPenaltyChanges = riskTriggered && riskPenalty
    ? { erudition: 0, fortune: riskPenalty.fortune, drive: riskPenalty.drive, wealth: 0 }
    : undefined;
  const resolution = resolveExam(currentState, examLevel, score, passed, riskPenaltyChanges);
  const newState = resolution.state;

  // Drive cost for taking exam
  const examDriveCost = -5;
  newState.character.stats = applyStatChanges(newState.character.stats, {
    erudition: 0, fortune: 0, drive: examDriveCost, wealth: 0,
  });

  const statChanges = { erudition: 0, fortune: 0, drive: examDriveCost, wealth: 0 };
  if (riskTriggered && riskPenalty) {
    statChanges.drive += riskPenalty.drive;
    statChanges.fortune = riskPenalty.fortune;
  }

  const narrationResult = await generateNarration({
    event_type: passed ? "exam_pass" : "exam_fail",
    context: {
      character_name: character.name,
      detail: `${examLevel} exam (non-ranking threshold exam), score ${score}/${threshold ?? 100}. ${resolution.titleAwarded ? `Awarded title: ${resolution.titleAwarded}.` : ""} Do not mention rank or first place.`,
    },
    tone: passed ? "triumphant" : "tragic",
  });

  await upsertSave(saveId, newState);

  return {
    passed,
    score,
    threshold,
    title: resolution.titleAwarded,
    narration: narrationResult.narration,
    soundCue: narrationResult.sound_cue,
    statChanges,
    judgeNarrative,
    riskTriggered,
    riskPenalty,
    state: newState,
  };
}

// ── useTool ──────────────────────────────────────────────────────────────────

export interface ToolResult {
  success: boolean;
  message: string;
  effect?: string;
  state: GameState;
  bestChoice?: string;
  exposed?: boolean;
  reEvalPassed?: boolean;
}

export async function applyToolAction(
  saveId: string,
  toolId: string,
  context?: {
    examLevel?: ExamLevel;
    question?: E1ExamQuestion;
  }
): Promise<ToolResult> {
  const currentState = await loadSave(saveId);
  if (!currentState) throw new Error("save_not_found");
  const newState = structuredClone(currentState) as GameState;
  const rng = createRng(newState.rng_seed);

  switch (toolId) {
    case "cheat_sheet": {
      if (newState.world.auxiliary_tools.cheat_sheet_used_this_cycle) {
        return { success: false, message: "本轮已使用过小抄。", state: currentState };
      }
      if (newState.character.stats.fortune < 10) {
        return { success: false, message: "运势不足，无法使用小抄。", state: currentState };
      }

      // Apply cost: Fortune -10
      newState.character.stats = applyStatChanges(newState.character.stats, {
        erudition: 0, fortune: -10, drive: 0, wealth: 0,
      });
      newState.world.auxiliary_tools.cheat_sheet_used_this_cycle = true;

      // Check exposure (15% chance)
      const exposureRoll = rng.nextFloat(0, 1);
      const exposed = exposureRoll < 0.15;

      if (exposed) {
        // Exposure penalty: exam ban 1 cycle + drive -20 + fortune -15
        newState.character.stats = applyStatChanges(newState.character.stats, {
          erudition: 0, fortune: -15, drive: -20, wealth: 0,
        });
        newState.character.status_effects.push({
          type: "exam_ban",
          turns_remaining: 12,
        });
        newState.rng_seed = rng.nextInt(0, 2147483647);
        await upsertSave(saveId, newState);
        return {
          success: false,
          message: "东窗事发！夹带被搜出，考官震怒，逐出考场！",
          effect: "exam_ban",
          state: newState,
          exposed: true,
        };
      }

      newState.rng_seed = rng.nextInt(0, 2147483647);
      await upsertSave(saveId, newState);
      return {
        success: true,
        message: "小抄藏好，心中稍安。学识加成翻倍。",
        effect: "erudition_doubled",
        state: newState,
        exposed: false,
      };
    }

    case "insider_tip": {
      if (newState.world.auxiliary_tools.insider_tip_used_this_cycle) {
        return { success: false, message: "本轮已使用过榜眼引路。", state: currentState };
      }
      if (newState.character.stats.wealth < 15) {
        return { success: false, message: "银两不足，无法打点。", state: currentState };
      }

      // Apply cost: Wealth -15
      newState.character.stats = applyStatChanges(newState.character.stats, {
        erudition: 0, fortune: 0, drive: 0, wealth: -15,
      });
      newState.world.auxiliary_tools.insider_tip_used_this_cycle = true;

      // Find the best-aligned choice from the question
      let bestChoice = "a";
      if (context?.question) {
        const choices = context.question.choices;
        const fullMatch = choices.find((c) => c.alignment === "full");
        if (fullMatch) {
          bestChoice = fullMatch.id;
        } else {
          const partialMatch = choices.find((c) => c.alignment === "partial");
          if (partialMatch) bestChoice = partialMatch.id;
        }
      }

      newState.rng_seed = rng.nextInt(0, 2147483647);
      await upsertSave(saveId, newState);
      return {
        success: true,
        message: `消息灵通人士透露：选「${bestChoice.toUpperCase()}」最合圣意。`,
        effect: "choice_revealed",
        state: newState,
        bestChoice,
      };
    }

    case "mentor_plea": {
      if (newState.world.auxiliary_tools.mentor_plea_used_this_cycle) {
        return { success: false, message: "本轮已使用过恩师引荐。", state: currentState };
      }

      // Find mentor with affinity >= 60
      const mentorRel = newState.character.relationships.find(
        (r) => r.type === "mentor" && r.affinity >= 60
      );
      if (!mentorRel) {
        return { success: false, message: "无恩师可引荐，或恩师情谊不足。", state: currentState };
      }

      // Check if last exam was a failure
      const lastExam = newState.character.exam_history[newState.character.exam_history.length - 1];
      if (!lastExam || lastExam.result !== "fail") {
        return { success: false, message: "恩师引荐仅在落第后可用。", state: currentState };
      }

      // Apply cost: mentor affinity -20
      mentorRel.affinity -= 20;
      newState.world.auxiliary_tools.mentor_plea_used_this_cycle = true;

      // Re-evaluate with threshold -15
      const examLevel = lastExam.level as ExamLevel;
      const originalThreshold = examThreshold(
        examLevel,
        newState.world.era,
        newState.character.generation,
        newState.character.stats.fortune
      );

      if (originalThreshold === null) {
        return { success: false, message: "殿试不可使用恩师引荐。", state: currentState };
      }

      const newThreshold = originalThreshold - 15;
      const reEvalPassed = lastExam.score >= newThreshold;

      if (reEvalPassed) {
        lastExam.result = "pass";
        const title = EXAM_REWARDS[examLevel];
        if (title && !newState.character.titles.includes(title)) {
          newState.character.titles.push(title);
        }
      }

      newState.rng_seed = rng.nextInt(0, 2147483647);
      await upsertSave(saveId, newState);
      return {
        success: true,
        message: reEvalPassed
          ? "恩师力荐，考官复阅卷宗，终得通过！"
          : "恩师虽已尽力，奈何差距太大，仍未通过。",
        effect: reEvalPassed ? "re_eval_pass" : "re_eval_fail",
        state: newState,
        reEvalPassed,
      };
    }

    default:
      return { success: false, message: `未知工具: ${toolId}`, state: currentState };
  }
}

// ── generateHeirsAction ──────────────────────────────────────────────────────

import { generateHeirs as generateHeirsAI } from "@/lib/ai/contracts/heirs";
import { countHeirs, canAdopt } from "@/lib/engine/lineage";
import {
  calculateLegacyTokens,
  calculateBlessingPoints,
  type LegacyTokens,
  type AchievementFlags,
} from "@/lib/engine/inheritance";
import { resolveInheritance } from "@/lib/engine/reducer";
import type { I1Input, I1Heirs } from "@/lib/ai/schema";

export interface GenerateHeirsResult {
  heirs: I1Heirs["heirs"];
  legacyTokens: LegacyTokens;
  blessingPoints: number;
  isAdoption: boolean;
  gameOver: boolean;
  deathReason: InheritanceTrigger;
}

export type InheritanceTrigger = "drive_zero" | "max_age" | "victory";

export async function generateHeirsAction(
  saveId: string,
  deathReason: InheritanceTrigger
): Promise<GenerateHeirsResult> {
  const currentState = await loadSave(saveId);
  if (!currentState) throw new Error("save_not_found");
  const { character, dynasty, world } = currentState;

  // Calculate legacy tokens
  const legacyTokens = calculateLegacyTokens(character);

  // Calculate achievements for blessing points
  const achievements: AchievementFlags = {
    firstExamPass: character.exam_history.some((e) => e.result === "pass") &&
      dynasty.ancestors.every((a) => a.highest_title === "白身" || a.generation === character.generation),
    survivedCatastrophe: character.status_effects.some((e) => e.type === "catastrophe_survivor"),
    reachedAge70: character.age >= 70,
    raised3Sons: character.family.children.filter((c) => c.is_son && c.alive).length >= 3,
  };
  const blessingPoints = calculateBlessingPoints(legacyTokens, achievements) + dynasty.blessing_points;

  // Count surviving sons
  const numHeirs = countHeirs(character.family.children);

  // Sonless path
  if (numHeirs === 0) {
    const reputation = Math.round(Math.max(character.stats.fortune * 0.3, 0));
    const effectiveReputation = Math.max(reputation, dynasty.legacy.reputation);

    if (canAdopt(effectiveReputation)) {
      // Adoption path
      const i1Input: I1Input = {
        parent: {
          name: character.name,
          traits: character.traits,
          highest_title: character.titles[character.titles.length - 1] ?? "白身",
          erudition: character.stats.erudition,
        },
        dynasty: {
          family_name: dynasty.family_name,
          generation: character.generation + 1,
          era: world.era,
        },
        num_heirs: 1,
        is_adoption: true,
      };
      const result = await generateHeirsAI(i1Input);
      return {
        heirs: result.heirs,
        legacyTokens,
        blessingPoints,
        isAdoption: true,
        gameOver: false,
        deathReason,
      };
    } else {
      // Game over — family line dies out
      return {
        heirs: [],
        legacyTokens,
        blessingPoints,
        isAdoption: false,
        gameOver: true,
        deathReason,
      };
    }
  }

  // Normal heir generation
  const i1Input: I1Input = {
    parent: {
      name: character.name,
      traits: character.traits,
      highest_title: character.titles[character.titles.length - 1] ?? "白身",
      erudition: character.stats.erudition,
    },
    dynasty: {
      family_name: dynasty.family_name,
      generation: character.generation + 1,
      era: world.era,
    },
    num_heirs: numHeirs,
    is_adoption: false,
  };
  const result = await generateHeirsAI(i1Input);

  return {
    heirs: result.heirs,
    legacyTokens,
    blessingPoints,
    isAdoption: false,
    gameOver: false,
    deathReason,
  };
}

// ── chooseHeir ──────────────────────────────────────────────────────────────

export interface ChooseHeirResult {
  state: GameState;
  eraTransitioned: boolean;
  oldEra: string;
  newEra: string | null;
}

export interface HeirInput {
  name: string;
  traits: string[];
  starting_bonus: { stat: "erudition" | "fortune" | "drive"; value: number };
}

export async function chooseHeir(
  saveId: string,
  heirIndex: number,
  purchasedBlessingIds: string[],
  heirInput?: HeirInput
): Promise<ChooseHeirResult> {
  const currentState = await loadSave(saveId);
  if (!currentState) throw new Error("save_not_found");
  const rng = createRng(currentState.rng_seed);

  const result = resolveInheritance(currentState, heirIndex, purchasedBlessingIds, rng, heirInput);

  // Handle NPC era-change rules
  if (result.eraTransitioned) {
    applyNpcEraChange(result.state, rng);
  }

  // Update RNG seed
  result.state.rng_seed = rng.nextInt(0, 2147483647);

  await upsertSave(saveId, result.state);

  return {
    state: result.state,
    eraTransitioned: result.eraTransitioned,
    oldEra: currentState.world.era,
    newEra: result.newEra,
  };
}

// ── NPC Era-Change Rules ─────────────────────────────────────────────────────

function applyNpcEraChange(
  state: GameState,
  rng: { next: () => number }
): void {
  for (const npc of state.npcs) {
    if (!npc.alive) continue;

    switch (npc.role) {
      case "examiner":
        // Examiners are all removed (replaced next era)
        npc.alive = false;
        break;
      case "mentor":
      case "patron":
        // 50% death chance
        if (rng.next() < 0.5) {
          npc.alive = false;
        }
        break;
      case "rival":
        // Persist but memory reset
        npc.memory = [];
        break;
      case "spouse":
      case "friend":
        // Persist
        break;
    }

    // All surviving NPCs gain era_change memory
    if (npc.alive) {
      if (npc.memory.length >= 10) {
        npc.memory.shift();
      }
      npc.memory.push({ event: "era_change", sentiment: "uncertain", turn: state.turn_number });
    }
  }

  // Remove dead NPCs from character relationships
  const aliveNpcIds = new Set(state.npcs.filter((n) => n.alive).map((n) => n.id));
  state.character.relationships = state.character.relationships.filter(
    (r) => aliveNpcIds.has(r.npc_id)
  );
}

// ── submitPalaceExam ────────────────────────────────────────────────────────

import { generatePalaceRivals, getRivalStrength } from "@/lib/ai/contracts/palaceRivals";
import { type RankingEntry } from "@/lib/engine/exam";
import type { E3Input } from "@/lib/ai/schema";

export type VictoryTier = "S" | "A" | "B" | "C" | "D" | "F" | null;

export interface PalaceExamResult {
  playerScore: number;
  ranking: RankingEntry[];
  playerRank: number;
  playerTitle: string;
  narration: string;
  soundCue: string;
  victoryTier: VictoryTier;
  state: GameState;
  judgeNarrative: string | null;
}

export async function submitPalaceExam(
  saveId: string,
  question: E1ExamQuestion,
  choiceId: string | null,
  freeText: string | null,
  cheatSheetActive: boolean
): Promise<PalaceExamResult> {
  const currentState = await loadSave(saveId);
  if (!currentState) throw new Error("save_not_found");
  const { character, world, dynasty } = currentState;
  const erudition = character.stats.erudition;

  // ── Step 1: Score the player's answer (same as regular exam) ──
  let playerScore: number;
  let judgeNarrative: string | null = null;

  if (freeText && freeText.trim().length > 0) {
    const judgeResult = await evaluateFreeText({
      question_text: question.question_text,
      player_answer: freeText,
      court_whims: {
        style: world.court_whims.style,
        emperor_temperament: world.court_whims.emperor_temperament,
      },
      exam_level: "palace",
      character_erudition: erudition,
      character_items: character.inventory.map((i) => i.name),
    });

    const eruditionBonus = cheatSheetActive ? erudition * 0.6 : erudition * 0.3;
    playerScore = Math.round(
      Math.max(0, Math.min(100, judgeResult.total_score * 0.7 + eruditionBonus))
    );
    judgeNarrative = judgeResult.judge_narrative;
  } else if (choiceId) {
    const choice = question.choices.find((c) => c.id === choiceId);
    if (!choice) throw new Error(`Invalid choice ID: ${choiceId}`);

    let courtWhimsBonus = 0;
    if (choice.alignment === "full") courtWhimsBonus = 20;
    else if (choice.alignment === "partial") courtWhimsBonus = 10;

    const eruditionBonus = cheatSheetActive ? erudition * 0.6 : erudition * 0.3;
    playerScore = Math.round(
      Math.max(0, Math.min(100, choice.base_score + eruditionBonus + courtWhimsBonus))
    );
  } else {
    throw new Error("Must provide either choiceId or freeText");
  }

  // ── Step 2: Generate 3 AI rivals (E3 does NOT receive player score) ──
  const rivalStrength = getRivalStrength(dynasty.total_generations);
  const e3Input: E3Input = {
    question_text: question.question_text,
    court_whims: {
      style: world.court_whims.style,
      emperor_temperament: world.court_whims.emperor_temperament,
    },
    dynasty_generation: dynasty.total_generations,
    era: world.era,
    rival_strength: rivalStrength,
  };
  const rivalsResult = await generatePalaceRivals(e3Input);

  // ── Step 3: Delegate state mutations to engine (ranking, title, history, dynasty) ──
  const rivals = rivalsResult.rivals.map((r) => ({ name: r.name, score: r.score }));
  const resolution = resolvePalaceExam(currentState, playerScore, rivals);
  const { state: newState, ranking, playerRank, playerTitle } = resolution;

  // Drive cost for taking exam (not handled by engine)
  newState.character.stats = applyStatChanges(newState.character.stats, {
    erudition: 0, fortune: 0, drive: -5, wealth: 0,
  });

  // ── Step 4: Generate narration via R1 (include emperor's 御评) ──
  const champion = ranking[0];
  const narrationResult = await generateNarration({
    event_type: "exam_pass",
    context: {
      character_name: character.name,
      detail: `殿试 palace exam. Player ranked #${playerRank} (${playerTitle}), score ${playerScore}. Champion: ${champion.name} (${champion.title}, score ${champion.score}). Include emperor's 御评 on the champion's answer.`,
    },
    tone: playerRank === 1 ? "triumphant" : "bittersweet",
  });

  // ── Step 5: Evaluate victory condition ──
  const victoryTier = evaluateVictory(newState);

  await upsertSave(saveId, newState);

  return {
    playerScore,
    ranking,
    playerRank,
    playerTitle,
    narration: narrationResult.narration,
    soundCue: narrationResult.sound_cue,
    victoryTier,
    state: newState,
    judgeNarrative,
  };
}

// ── evaluateVictory ─────────────────────────────────────────────────────────

/**
 * Evaluate the dynasty's victory tier based on achievements across all generations.
 * Returns null if the game is still in progress (no victory/defeat condition met).
 *
 * Victory tiers (core-loop.md):
 * - S: 状元 in <= 3 generations
 * - A: 状元 in any generation
 * - B: 进士 in <= 3 generations
 * - C: 进士 in any generation
 * - D: 举人 but never 进士 (10 gen limit reached)
 * - F: Family line dies out
 */
function evaluateVictory(state: GameState): VictoryTier {
  const { dynasty, character } = state;
  const totalGenerations = dynasty.total_generations;

  // Check current character's titles + all ancestors
  const allTitles: string[] = [...character.titles];
  for (const ancestor of dynasty.ancestors) {
    if (ancestor.highest_title) {
      allTitles.push(ancestor.highest_title);
    }
  }

  const hasZhuangyuan = allTitles.includes("状元");
  const hasJinshi = allTitles.includes("进士") || hasZhuangyuan;
  const hasJuren = allTitles.includes("举人") || allTitles.includes("贡士") || hasJinshi;

  // S: 状元 in <= 3 generations
  if (hasZhuangyuan && totalGenerations <= 3) return "S";

  // A: 状元 in any generation
  if (hasZhuangyuan) return "A";

  // B: 进士 in <= 3 generations
  if (hasJinshi && totalGenerations <= 3) return "B";

  // C: 进士 in any generation
  if (hasJinshi) return "C";

  // D: 举人 but never 进士 (only if 10 gen limit reached)
  if (hasJuren && totalGenerations >= 10) return "D";

  // F: Family line dies out (checked externally when heirs = 0)
  // This is evaluated in generateHeirsAction when gameOver = true

  // Game still in progress
  return null;
}
