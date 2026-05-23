// Prompt templates (game-design/prompt-library.md). Versioned — bump on change.
// PT-V1: Random Event Generation (v1.0). The template deliberately contains the
// word "json" + an example object (required for DeepSeek's json_object mode).

import type { ChatMessage } from "./providers";
import type { V1Input, Era, Season, EventType } from "./schema";

const ERA_DESCRIPTION: Record<Era, string> = {
  prosperity: "天下太平，文风鼎盛，朝廷重文轻武，诗赋策论皆为正道",
  decline: "朝纲渐弛，党争日烈，地方豪强割据，民间疾苦渐深",
  invasion: "外族铁骑南下，山河破碎，朝廷偏安一隅，忠义与苟且并存",
  restoration: "新朝初立，百废待兴，朝廷求贤若渴，务实之才最受青睐",
};

const SEASON_TEXT: Record<Season, string> = {
  spring: "春季",
  summer: "夏季",
  autumn: "秋季",
  winter: "冬季",
};

const EVENT_TYPE_TEXT: Record<EventType, string> = {
  opportunity: "机遇",
  misfortune: "灾厄",
  social: "社交",
  political: "政治",
};

export function buildV1Messages(input: V1Input): ChatMessage[] {
  const { character: c, world: w } = input;
  const npcs =
    input.available_npcs.map((n) => `${n.name}（${n.role}）`).join("、") || "（无）";
  const recent = input.recent_events.length ? input.recent_events.join("、") : "（无）";

  const system = `You are a narrative event generator for a Chinese historical life simulation game. Output strict json only — no commentary.

CHARACTER STATE:
- Name: ${c.name}
- Age: ${c.age}
- Erudition: ${c.erudition}/100
- Fortune: ${c.fortune}/100
- Drive: ${c.drive}/100
- Titles: ${c.titles.join("、") || "（无）"}
- Traits: ${c.traits.join("、") || "（无）"}

WORLD STATE:
- Era: ${w.era}（${ERA_DESCRIPTION[w.era]}）
- Season: ${SEASON_TEXT[w.season]}
- Year: ${w.year}

EVENT TYPE TO GENERATE: ${input.event_type}（${EVENT_TYPE_TEXT[input.event_type]}）
RECENT EVENTS (do NOT repeat): ${recent}
AVAILABLE NPCs: ${npcs}

RULES:
1. Generate ONE event matching the requested type, grounded in the character's situation.
2. Reference the character by name and the current season/era in the description.
3. Provide exactly 2-3 choices with clear trade-offs.
4. Each choice's stat_changes must keep every single value within ±15.
5. The event must NOT instantly kill the character or end the game.
6. Description: 2-3 vivid sentences. Title: ≤10 Chinese characters.
7. All player-facing text in Simplified Chinese.

OUTPUT FORMAT — respond with strict json in exactly this shape:
{
  "title": "≤10字标题",
  "description": "2-3句生动描述",
  "choices": [
    {"id": "a", "label": "≤20字选项", "stat_changes": {"erudition": 0, "fortune": 5, "drive": -5, "wealth": 0}, "narrative_preview": "一句后果提示"},
    {"id": "b", "label": "...", "stat_changes": {"erudition": 0, "fortune": 0, "drive": 0, "wealth": 0}, "narrative_preview": "..."}
  ],
  "allows_free_input": true,
  "free_input_context": "什么样的创意解法可能有效"
}`;

  const user = `请按上述规则与 json 格式，为「${c.name}」生成一个${SEASON_TEXT[w.season]}的${EVENT_TYPE_TEXT[input.event_type]}事件。`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
