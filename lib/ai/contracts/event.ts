// V1 — Random Event Generation (game-design/ai-contracts.md).
// AI proposes narrative + suggested stat deltas; the engine owns final numbers.
// Own-fallback pattern (backend/error-handling.md): degrades, never throws.

import { callLLM } from "../client";
import { buildV1Messages } from "../prompts";
import { V1EventSchema, extractJsonObject, type V1Event, type V1Input, type Season } from "../schema";
import { log } from "../../log";

export async function generateEvent(input: V1Input): Promise<V1Event> {
  try {
    const result = await callLLM("low", buildV1Messages(input), {
      contract: "V1",
      temperature: 0.8, // PT-V1
      maxTokens: 800,
      timeoutMs: 10_000, // global hard limit; DeepSeek non-thinking floor ~5s
      softBudgetMs: 1500, // ai-contracts V1 latency budget (warn only)
      responseFormat: "json",
      thinking: false,
    });
    return V1EventSchema.parse(JSON.parse(extractJsonObject(result.content)));
  } catch (err) {
    log.warn("ai.fallback", {
      contract: "V1",
      reason: err instanceof Error ? err.message : String(err),
    });
    return staticEvent(input);
  }
}

const SEASON_TEXT: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

type StaticEventTemplate = (input: V1Input, season: string) => V1Event;

const FALLBACK_RELIC_IDS = [
  "wenquxing_charm",
  "inkstone_of_focus",
  "banquet_tokens",
  "lucky_coin",
  "silver_abacus",
] as const;

const STATIC_EVENT_POOLS: Record<V1Input["event_type"], StaticEventTemplate[]> = {
  opportunity: [
    (input, season) => ({
      title: "旧柜微光",
      description: `${season}日，${input.character.name}在书斋角落翻出一只漆皮旧柜。柜中纸灰簌簌，竟压着几件前人遗物。`,
      choices: [
        {
          id: "a",
          label: "细查旧柜",
          stat_changes: { erudition: 1, fortune: 2, drive: -2, wealth: 0 },
          narrative_preview: "费些精神，或能择得一件有用旧物。",
        },
        {
          id: "b",
          label: "封存不动",
          stat_changes: { erudition: 0, fortune: 3, drive: 0, wealth: 0 },
          narrative_preview: "不扰旧物，心中倒多几分安稳。",
        },
      ],
      allows_free_input: false,
      free_input_context: "",
      reward: relicDraftReward(input),
    }),
    (input, season) => ({
      title: "渡口贵客",
      description: `${season}水涨，${input.character.name}在渡口替一位落难客商解围。对方衣摆沾泥，说话却像常在朱门里走动。`,
      choices: [
        {
          id: "a",
          label: "仗义相助",
          stat_changes: { erudition: 0, fortune: 0, drive: -2, wealth: -2 },
          narrative_preview: "此事成败，全看临场周旋。",
          check: {
            stat: "fortune",
            dc: 11,
            outcomes: {
              crit_success: { erudition: 0, fortune: 12, drive: 0, wealth: 5 },
              success: { erudition: 0, fortune: 7, drive: 0, wealth: 2 },
              fail: { erudition: 0, fortune: -3, drive: -2, wealth: -2 },
              crit_fail: { erudition: 0, fortune: -8, drive: -5, wealth: -4 },
            },
          },
        },
        {
          id: "b",
          label: "袖手旁观",
          stat_changes: { erudition: 0, fortune: -1, drive: 1, wealth: 0 },
          narrative_preview: "少惹麻烦，也少结一段缘。",
        },
      ],
      allows_free_input: true,
      free_input_context: "可尝试用家世、人情或银两替贵客周旋。",
      reward: relicDraftReward(input),
    }),
  ],
  misfortune: [
    (input, season) => ({
      title: "雨毁藏书",
      description: `${season}夜雨骤急，${input.character.name}醒来时，书箱已被屋漏浸湿。墨迹晕开，像一池乌云。`,
      choices: [
        {
          id: "a",
          label: "连夜抢救",
          stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: -2 },
          narrative_preview: "能救多少，全看手脚与心气。",
          check: {
            stat: "drive",
            dc: 12,
            outcomes: {
              crit_success: { erudition: 5, fortune: 1, drive: -2, wealth: 0 },
              success: { erudition: 2, fortune: 0, drive: -3, wealth: -1 },
              fail: { erudition: -4, fortune: -2, drive: -4, wealth: -2 },
              crit_fail: { erudition: -8, fortune: -5, drive: -8, wealth: -4 },
            },
          },
        },
        {
          id: "b",
          label: "先护家人",
          stat_changes: { erudition: -3, fortune: 2, drive: -1, wealth: -2 },
          narrative_preview: "书可再抄，人情不能再来。",
        },
      ],
      allows_free_input: true,
      free_input_context: "可描述如何借邻里、炭火或旧抄本补救损失。",
    }),
    (input, season) => ({
      title: "讣音入门",
      description: `${season}风冷，${input.character.name}忽闻家中长辈病逝。白布悬门，功名与亲情一时都压在心头。`,
      choices: [
        {
          id: "a",
          label: "依礼守孝",
          stat_changes: { erudition: 0, fortune: 4, drive: -4, wealth: -2 },
          narrative_preview: "名声稍安，仕途暂缓。",
        },
        {
          id: "b",
          label: "强忍读书",
          stat_changes: { erudition: 3, fortune: -6, drive: -6, wealth: 0 },
          narrative_preview: "书声未断，人言也不会断。",
        },
      ],
      allows_free_input: false,
      free_input_context: "",
    }),
  ],
  social: [
    (input, season) => ({
      title: "曲水小宴",
      description: `${season}日，${input.character.name}受邀赴一场曲水小宴。席间笑语轻飘，却人人都在暗暗掂量彼此斤两。`,
      choices: [
        {
          id: "a",
          label: "从容应酬",
          stat_changes: { erudition: 0, fortune: 0, drive: -1, wealth: -1 },
          narrative_preview: "谈吐若得体，或可多一条门路。",
          check: {
            stat: "fortune",
            dc: 10,
            outcomes: {
              crit_success: { erudition: 1, fortune: 12, drive: 0, wealth: 0 },
              success: { erudition: 1, fortune: 6, drive: -1, wealth: 0 },
              fail: { erudition: 0, fortune: -3, drive: -2, wealth: -1 },
              crit_fail: { erudition: 0, fortune: -8, drive: -5, wealth: -2 },
            },
          },
        },
        {
          id: "b",
          label: "只谈诗书",
          stat_changes: { erudition: 3, fortune: 1, drive: -2, wealth: 0 },
          narrative_preview: "不失体面，少些机巧。",
        },
      ],
      allows_free_input: true,
      free_input_context: "可自拟一段席间应答，试探众人风向。",
      reward: relicDraftReward(input),
    }),
  ],
  political: [
    (input, season) => ({
      title: "榜文换墨",
      description: `${season}日城门换榜，${input.character.name}挤在人群里看新政。墨迹未干，士子们的脸色已各不相同。`,
      choices: [
        {
          id: "a",
          label: "研读新政",
          stat_changes: { erudition: 4, fortune: 0, drive: -2, wealth: 0 },
          narrative_preview: "多懂一分时势，策论便少一分空泛。",
        },
        {
          id: "b",
          label: "探听口风",
          stat_changes: { erudition: 0, fortune: 0, drive: -2, wealth: -1 },
          narrative_preview: "消息真假混杂，需自己分辨。",
          check: {
            stat: "erudition",
            dc: 13,
            outcomes: {
              crit_success: { erudition: 2, fortune: 10, drive: 0, wealth: 0 },
              success: { erudition: 1, fortune: 5, drive: -1, wealth: 0 },
              fail: { erudition: 0, fortune: -4, drive: -2, wealth: -1 },
              crit_fail: { erudition: -2, fortune: -9, drive: -5, wealth: -2 },
            },
          },
        },
      ],
      allows_free_input: true,
      free_input_context: "可描述如何从榜文、士论或衙门小吏处判断风向。",
    }),
  ],
};

// Static fallback pool (ai-contracts.md V1 Fallback). The fallback mirrors the
// current contract: some choices use dice checks, and opportunity/social events
// can grant typed rewards. Selection is deterministic from input, not random.
function staticEvent(input: V1Input): V1Event {
  const season = SEASON_TEXT[input.world.season];
  const pool = STATIC_EVENT_POOLS[input.event_type];
  const index = stableEventIndex(input, pool.length);
  return pool[index](input, season);
}

function stableEventIndex(input: V1Input, length: number): number {
  const key = `${input.character.name}:${input.world.year}:${input.world.season}:${input.event_type}`;
  let hash = 0;
  for (const char of key) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % length;
}

function relicDraftReward(input: V1Input): NonNullable<V1Event["reward"]> {
  const relicIds = input.available_relic_pool?.length
    ? input.available_relic_pool.slice(0, 3)
    : [...FALLBACK_RELIC_IDS.slice(0, 3)];
  return {
    type: "relic_draft",
    relic_ids: relicIds,
    skill_id: null,
    buff: null,
  };
}
