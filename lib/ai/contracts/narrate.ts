// R1 — Result Narration (game-design/ai-contracts.md).
// Model tier: Low (deepseek-v4-flash). Temperature: 0.9.
// Fallback: pre-written narration templates (5 per event_type).

import { callLLM } from "../client";
import { buildR1Messages } from "../prompts";
import {
  R1NarrationSchema,
  extractJsonObject,
  type R1Narration,
  type R1Input,
} from "../schema";
import { log } from "../../log";

export async function generateNarration(input: R1Input): Promise<R1Narration> {
  try {
    const result = await callLLM("low", buildR1Messages(input), {
      contract: "R1",
      temperature: 0.9,
      maxTokens: 500,
      timeoutMs: 10_000,
      softBudgetMs: 1500,
      responseFormat: "json",
      thinking: false,
    });
    return R1NarrationSchema.parse(JSON.parse(extractJsonObject(result.content)));
  } catch (err) {
    log.warn("ai.fallback", {
      contract: "R1",
      reason: err instanceof Error ? err.message : String(err),
    });
    return staticNarration(input);
  }
}

// ── Static Fallback Templates ─────────────────────────────────────────────────

const PASS_NARRATIONS: string[] = [
  "三声炮响，报喜人骑快马直奔家门！金榜题名，光宗耀祖！",
  "红榜高悬，锣鼓喧天。多年寒窗苦读，终得一朝扬名。",
  "喜报传来，阖家欢庆。街坊邻里纷纷道贺，门庭若市。",
  "金榜题名日，春风得意时。十年磨一剑，今朝试锋芒。",
  "报喜人敲锣打鼓而来，高呼捷报。老母闻讯，喜极而泣。",
];

const FAIL_NARRATIONS: string[] = [
  "榜上无名，心中五味杂陈。然天道酬勤，来日方长。",
  "名落孙山，黯然神伤。但见同窗中榜，强颜欢笑道贺。",
  "落第归来，闭门不出。窗外春光正好，心中却是寒冬。",
  "又是一年科场梦碎。收拾心情，重新翻开书卷。",
  "未能如愿，但求无愧于心。来年再战，定当一雪前耻。",
];

const INHERITANCE_NARRATIONS: string[] = [
  "弥留之际，他握着儿子的手，将毕生所学托付于后人。",
  "一代人的故事落幕，但家族的薪火不会熄灭。",
  "临终遗言犹在耳畔，后辈当继承先人遗志，再攀高峰。",
  "香火延续，家学传承。虽人已去，但精神长存。",
  "落叶归根，魂归故里。留给后人的，是满架诗书与未竟之志。",
];

const ERA_CHANGE_NARRATIONS: string[] = [
  "天地变色，风云际会。旧时代的帷幕缓缓落下，新的篇章即将开启。",
  "朝堂更迭，世事无常。唯有读书人的笔墨，记录着这沧桑巨变。",
  "一个时代的终结，往往是另一个时代的开始。",
  "风起云涌，天下大势已变。顺势而为者昌，逆势而行者亡。",
  "旧朝已逝如流水，新朝初立待英才。",
];

const DEATH_NARRATIONS: string[] = [
  "油尽灯枯，一生功过，自有后人评说。",
  "走完了这一生的路，留下的是未竟的遗憾与不灭的希望。",
  "人生如白驹过隙，转眼已是暮年。但家族的故事，还在继续。",
  "灯火渐暗，呼吸渐弱。他最后望了一眼书架上的经卷，安然闭目。",
  "此生已矣，但血脉不断，家学不绝。后人当奋发图强。",
];

function staticNarration(input: R1Input): R1Narration {
  let pool: string[];
  let soundCue: R1Narration["sound_cue"];

  switch (input.event_type) {
    case "exam_pass":
      pool = PASS_NARRATIONS;
      soundCue = "celebration";
      break;
    case "exam_fail":
      pool = FAIL_NARRATIONS;
      soundCue = "mourning";
      break;
    case "inheritance":
      pool = INHERITANCE_NARRATIONS;
      soundCue = "mourning";
      break;
    case "era_change":
      pool = ERA_CHANGE_NARRATIONS;
      soundCue = "tension";
      break;
    case "death":
      pool = DEATH_NARRATIONS;
      soundCue = "mourning";
      break;
    default:
      pool = PASS_NARRATIONS;
      soundCue = "neutral";
  }

  // Simple deterministic pick based on character name length
  const idx = input.context.character_name.length % pool.length;
  return { narration: pool[idx], sound_cue: soundCue };
}
