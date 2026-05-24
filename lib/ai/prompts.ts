// Prompt templates (game-design/prompt-library.md). Versioned — bump on change.
// PT-V1: Random Event Generation (v1.0)
// PT-V2: Event Free-Input Evaluation (v1.0)
// PT-N1: NPC Dialogue (v1.0)
// PT-E1: Exam Question Generation (v1.0)
// PT-E2: Free-Text Answer Evaluation / Judge (v1.0)
// PT-R1: Result Narration (v1.0)
// The templates deliberately contain the word "json" + example objects
// (required for DeepSeek's json_object mode).

import type { ChatMessage } from "./providers";
import type { V1Input, V2Input, N1Input, E1Input, E2Input, R1Input, I1Input, E3Input, Era, Season, EventType } from "./schema";

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
  const relicPool = input.available_relic_pool?.length
    ? input.available_relic_pool.join("、")
    : "（无）";
  const skills = input.character_skills?.length ? input.character_skills.join("、") : "（无）";
  const relics = input.character_relics?.length ? input.character_relics.join("、") : "（无）";

  const system = `You are a narrative event generator for a Chinese historical life simulation game. Output strict json only — no commentary.

CHARACTER STATE:
- Name: ${c.name}
- Age: ${c.age}
- Erudition: ${c.erudition}/100
- Fortune: ${c.fortune}/100
- Drive: ${c.drive}/100
- Titles: ${c.titles.join("、") || "（无）"}
- Traits: ${c.traits.join("、") || "（无）"}
- Skills: ${skills}
- Relics: ${relics}

WORLD STATE:
- Era: ${w.era}（${ERA_DESCRIPTION[w.era]}）
- Season: ${SEASON_TEXT[w.season]}
- Year: ${w.year}
- World modifier: ${input.world_modifier ?? "（无）"}

EVENT TYPE TO GENERATE: ${input.event_type}（${EVENT_TYPE_TEXT[input.event_type]}）
RECENT EVENTS (do NOT repeat): ${recent}
AVAILABLE NPCs: ${npcs}
AVAILABLE RELIC IDs FOR REWARD: ${relicPool}

RULES:
1. Generate ONE event matching the requested type, grounded in the character's situation.
2. Reference the character by name and the current season/era in the description.
3. Provide exactly 2-3 choices with clear trade-offs.
4. HARD LIMIT: every single stat value in EVERY stat_changes object (choice-level AND inside check.outcomes) must be an integer within ±15. Never emit a value below -15 or above 15 — out-of-range values are rejected.
5. The event must NOT instantly kill the character or end the game.
6. Description: 2-3 vivid sentences. Title: ≤10 Chinese characters.
7. All player-facing text in Simplified Chinese.
8. A choice MAY include "check" for a visible dice roll. If a choice includes "check", dc must be an integer 6-16 and "outcomes" MUST contain ALL FOUR tables — crit_success, success, fail, AND crit_fail — each a full stat_changes object. Never emit a partial outcomes object. If you do not want a dice roll, set "check": null instead.
9. "reward" is optional. Only opportunity/social events may use relic_draft rewards, and relic_ids must come from AVAILABLE RELIC IDs.

OUTPUT FORMAT — respond with strict json in exactly this shape:
{
  "title": "≤10字标题",
  "description": "2-3句生动描述",
  "choices": [
    {"id": "a", "label": "≤20字选项", "stat_changes": {"erudition": 0, "fortune": 5, "drive": -5, "wealth": 0}, "narrative_preview": "一句后果提示", "check": null},
    {"id": "b", "label": "...", "stat_changes": {"erudition": 0, "fortune": 0, "drive": 0, "wealth": 0}, "narrative_preview": "..."}
  ],
  "allows_free_input": true,
  "free_input_context": "什么样的创意解法可能有效",
  "reward": null
}`;

  const user = `请按上述规则与 json 格式，为「${c.name}」生成一个${SEASON_TEXT[w.season]}的${EVENT_TYPE_TEXT[input.event_type]}事件。`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

// ── PT-E1: Exam Question Generation ──────────────────────────────────────────

const EXAM_LEVEL_TEXT: Record<string, string> = {
  county: "童试",
  provincial: "乡试",
  metropolitan: "会试",
  palace: "殿试",
};

export function buildE1Messages(input: E1Input): ChatMessage[] {
  const previousQs = input.previous_questions_this_run.length
    ? input.previous_questions_this_run.join("；")
    : "（无）";

  const system = `You are an imperial examination question designer for a Chinese historical simulation game. Output strict json only — no commentary.

CONTEXT:
- Era: ${input.era}（${ERA_DESCRIPTION[input.era]}）
- Court style preference: ${input.court_whims.style}
- Emperor temperament: ${input.court_whims.emperor_temperament}
- Exam level: ${input.exam_level}（${EXAM_LEVEL_TEXT[input.exam_level]}）
- Year: ${input.year}

RULES:
1. Generate ONE exam question appropriate for the ${EXAM_LEVEL_TEXT[input.exam_level]} level
2. The question must relate to governance, ethics, military, economics, or philosophy
3. Tone should match the era (prosperous era = elegant topics; wartime = urgent practical topics)
4. The question should be 1-3 sentences in classical Chinese style but readable to modern speakers
5. Generate exactly 3 answer choices with different risk/reward profiles
6. Each choice must have a clear alignment with court_whims (full/partial/none)
7. Do NOT repeat these previous questions: ${previousQs}

OUTPUT FORMAT (strict JSON):
{
  "question_text": "...",
  "topic_category": "governance|ethics|military|economics|philosophy",
  "difficulty_hint": "...",
  "choices": [
    {"id": "a", "label": "...", "alignment": "full|partial|none", "base_score": 45, "risk": null},
    {"id": "b", "label": "...", "alignment": "partial|none|full", "base_score": 55, "risk": {"condition": "temperament_mismatch|style_mismatch|full_mismatch", "description": "≤30字风险提示", "penalty": {"drive": -10, "fortune": -5}}},
    {"id": "c", "label": "...", "alignment": "none|partial|full", "base_score": 65, "risk": {"condition": "full_mismatch", "description": "≤30字风险提示", "penalty": {"drive": -15, "fortune": -10}}}
  ],
  "free_input_hint": "..."
}

RISK RULES:
- At least one choice MUST have risk: null (a safe option always exists)
- Higher base_score choices should carry risk; safe choices have lower base_score
- base_score range: 40-70
- condition types: "temperament_mismatch" (triggers if emperor temperament doesn't match), "style_mismatch" (court style doesn't match), "full_mismatch" (neither matches)
- penalty.drive: -15 to 0; penalty.fortune: -10 to 0`;

  const user = `请为${EXAM_LEVEL_TEXT[input.exam_level]}生成一道考题。考生学识水平：${input.character_erudition}/100。`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

// ── PT-E2: Free-Text Answer Evaluation (Judge) ───────────────────────────────

export function buildE2Messages(input: E2Input): ChatMessage[] {
  const items = input.character_items.length
    ? input.character_items.join("、")
    : "（无）";

  const system = `You are an impartial imperial examination judge. Evaluate the candidate's answer strictly and fairly.

EXAM CONTEXT:
- Question: ${input.question_text}
- Exam level: ${input.exam_level}（${EXAM_LEVEL_TEXT[input.exam_level] ?? input.exam_level}）
- Court style preference: ${input.court_whims.style}
- Emperor temperament: ${input.court_whims.emperor_temperament}
- Candidate's erudition level: ${input.character_erudition}/100
- Candidate's known items: ${items}

CANDIDATE'S ANSWER:
${input.player_answer}

EVALUATION RUBRIC (score each dimension 0-25):
1. Relevance (切题): Does the answer directly address the question asked?
2. Cleverness (巧思): Is the approach creative, strategic, or shows lateral thinking?
3. Alignment (迎合): Does it match the court's current style and emperor's temperament?
4. Audacity (胆识): Does it take bold positions that demonstrate conviction?

SCORING GUIDELINES:
- 0-5: Completely off-topic, gibberish, or empty
- 6-12: Mediocre, generic, or only tangentially related
- 13-18: Competent and relevant but unremarkable
- 19-22: Impressive, showing genuine insight or creativity
- 23-25: Exceptional, would stand out among thousands of candidates

SPECIAL DETECTION:
- If the answer references the examiner's own works or known preferences: flag "impressed_examiner": true
- If the answer directly contradicts the emperor's known views: flag "offended_emperor": true
- If the answer copies a well-known classical text verbatim without attribution: flag "plagiarism_detected": true

OUTPUT FORMAT (strict JSON, no other text):
{
  "scores": {"relevance": 15, "cleverness": 12, "alignment": 18, "audacity": 10},
  "total_score": 55,
  "judge_narrative": "一句话描述考官反应",
  "special_flags": {"offended_emperor": false, "impressed_examiner": false, "plagiarism_detected": false}
}`;

  const user = `请评判以上考生答卷。`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

// ── PT-R1: Result Narration ──────────────────────────────────────────────────

export function buildR1Messages(input: R1Input): ChatMessage[] {
  const system = `You are a dramatic narrator for a Chinese historical simulation game. Generate vivid, evocative narration for a key moment. Output strict json only — no commentary.

EVENT TYPE: ${input.event_type}
CONTEXT: Character name: ${input.context.character_name}. Detail: ${input.context.detail}
REQUESTED TONE: ${input.tone}

RULES:
1. Write 2-4 sentences of dramatic narration matching the requested tone
2. Use classical Chinese literary imagery where appropriate
3. Keep under 300 characters total
4. For exam_pass: include traditional celebration imagery (报喜、锣鼓、红榜)
5. Do not invent rankings for 童试/乡试/会试. These exams only award pass/fail plus a title; avoid words like 第一名、榜首、案首 unless the detail explicitly says 殿试 or ranked #.
6. For 殿试 only, ranking/title language such as 状元、榜眼、探花、进士 is allowed when provided in the detail.
7. For death/inheritance: reference the continuity of the family line
8. For era_change: convey the weight of historical transition
9. All text in Simplified Chinese

OUTPUT FORMAT (strict JSON):
{
  "narration": "叙事文本",
  "sound_cue": "celebration|mourning|tension|neutral"
}`;

  const user = `请为「${input.context.character_name}」的${input.event_type === "exam_pass" ? "金榜题名" : input.event_type === "exam_fail" ? "名落孙山" : input.event_type}时刻撰写叙事。`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

// ── PT-V2: Event Free-Input Evaluation (v1.0) ─────────────────────────────

export function buildV2Messages(input: V2Input): ChatMessage[] {
  const items = input.character_items.length
    ? input.character_items.join("、")
    : "（无）";
  const npcs = input.available_npcs.length
    ? input.available_npcs.map((n) => `${n.name}（${n.role}）`).join("、")
    : "（无）";

  const system = `You are evaluating a player's creative solution to a life event in a Chinese historical simulation. Output strict json only — no commentary.

EVENT CONTEXT:
- Title: ${input.event_title}
- Description: ${input.event_description}
- Character stats: Erudition ${input.character_stats.erudition}, Fortune ${input.character_stats.fortune}, Drive ${input.character_stats.drive}
- Character items: ${items}
- Available NPCs: ${npcs}

PLAYER'S CREATIVE SOLUTION:
${input.player_input}

EVALUATION RULES:
1. Judge plausibility (0-100): Is this solution logical given the character's resources, relationships, and situation?
2. If plausibility < 30: success MUST be false
3. If player references an item/person they don't have access to: success = false, explain why
4. Stat changes must not exceed ±20 for any single stat
5. Reward creativity and lateral thinking — unusual but logical solutions should score high
6. The narrative result should be vivid and specific (2-3 sentences max, under 200 chars)

OUTPUT FORMAT — respond with strict json in exactly this shape:
{
  "success": true,
  "plausibility_score": 75,
  "stat_changes": {"erudition": 0, "fortune": 10, "drive": -5, "wealth": 5},
  "narrative_result": "结果描述",
  "npc_reaction": null
}

If an NPC is involved, npc_reaction can be:
{"npc_name": "某人", "reaction": "反应描述", "relationship_delta": 3}`;

  const user = `请评估玩家对事件「${input.event_title}」的创意解法：「${input.player_input}」`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

// ── PT-N1: NPC Dialogue (v1.0) ────────────────────────────────────────────

const INTERACTION_TYPE_TEXT: Record<string, string> = {
  greeting: "问候",
  advice: "请教",
  request: "请求",
  gossip: "闲谈",
};

export function buildN1Messages(input: N1Input): ChatMessage[] {
  const { npc, world_context: w } = input;
  const memory = npc.memory.length
    ? npc.memory.map((m) => `${m.event}（${m.sentiment}）`).join("；")
    : "（初次见面）";

  const system = `You are voicing an NPC in a Chinese historical simulation game. Output strict json only — no commentary.

NPC PROFILE:
- Name: ${npc.name}
- Role: ${npc.role}
- Personality: ${npc.personality}
- Memory of player: ${memory}

INTERACTION CONTEXT:
- Player name: ${input.character_name}
- Interaction type: ${input.interaction_type}（${INTERACTION_TYPE_TEXT[input.interaction_type] ?? input.interaction_type}）
- Era: ${w.era}（${ERA_DESCRIPTION[w.era]}）
- Season: ${SEASON_TEXT[w.season]}

RULES:
1. Stay in character — a ${npc.personality} ${npc.role} speaks accordingly
2. Reference past interactions from memory if relevant
3. Keep dialogue to 1-3 sentences
4. If this NPC has useful information (court_whims, upcoming events), they may hint at it naturally
5. Do not break the fourth wall or reference game mechanics

OUTPUT FORMAT — respond with strict json in exactly this shape:
{
  "dialogue": "对话内容",
  "mood": "friendly",
  "hint": null,
  "relationship_delta": 0
}

mood must be one of: friendly, neutral, hostile, mysterious
hint is null or a string with a subtle hint about court preferences or upcoming events
relationship_delta is an integer from -5 to 5`;

  const user = `请为NPC「${npc.name}」生成一段与「${input.character_name}」${INTERACTION_TYPE_TEXT[input.interaction_type] ?? "交流"}时的对话。`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

// ── PT-I1: Heir Generation (v1.0) ────────────────────────────────────────

export function buildI1Messages(input: I1Input): ChatMessage[] {
  const system = `You are generating heir candidates for a generational Chinese historical simulation. Output strict json only — no commentary.

PARENT INFO:
- Name: ${input.parent.name}
- Family name: ${input.dynasty.family_name}
- Traits: ${input.parent.traits.join("、") || "（无）"}
- Highest title: ${input.parent.highest_title}
- Erudition at death: ${input.parent.erudition}

DYNASTY INFO:
- Generation: ${input.dynasty.generation}
- Current era: ${input.dynasty.era}（${ERA_DESCRIPTION[input.dynasty.era]}）
- Adoption case: ${input.is_adoption}

Generate exactly ${input.num_heirs} heir candidate${input.num_heirs > 1 ? "s" : ""}. Each heir should feel distinct and offer a different strategic choice.

RULES:
1. All heirs share the family surname: ${input.dynasty.family_name}
2. Each heir has 1-2 traits (mix positive and negative)
3. At least one heir should have a clear academic strength
4. At least one heir should have a non-academic advantage (social, lucky, resilient)
5. Personality hints should be vivid and specific (1 sentence)
6. Do NOT duplicate the parent's exact trait combination
7. Names should be era-appropriate and distinct from each other
8. If is_adoption is true, generate a single adopted heir who does NOT carry the parent's blood traits — use clan/era-appropriate traits, and let the personality hint reflect an adopted outsider

OUTPUT FORMAT (strict JSON):
{
  "heirs": [
    {"name": "全名", "traits": ["trait1", "trait2"], "personality_hint": "一句性格描述", "starting_bonus": {"stat": "erudition|fortune|drive", "value": 5}}
  ]
}

starting_bonus.stat must be one of: erudition, fortune, drive
starting_bonus.value must be an integer between 3 and 8`;

  const user = `请为${input.dynasty.family_name}氏第${input.dynasty.generation}代生成${input.num_heirs}位${input.is_adoption ? "过继" : ""}继承人候选。`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

// ── PT-E3: Palace Exam Rival Answers (v1.0) ─────────────────────────────

export function buildE3Messages(input: E3Input): ChatMessage[] {
  const system = `You are simulating the rival candidates in a Chinese imperial Palace Examination (殿试). Output strict json only — no commentary.

EXAM CONTEXT:
- Question: ${input.question_text}
- Era: ${input.era}（${ERA_DESCRIPTION[input.era]}）
- Court style preference: ${input.court_whims.style}
- Emperor temperament: ${input.court_whims.emperor_temperament}
- Rival strength level: ${input.rival_strength}

TASK:
1. Generate exactly 3 rival candidates with distinct answering styles
2. Each rival writes a brief answer summary (1 sentence describing their approach)
3. Assign each rival a score based on rival_strength:
   - moderate: scores range 55-80
   - strong: scores range 65-90
   - elite: scores range 75-95

RULES:
- Rival names must be era-appropriate Chinese full names (surname + given name)
- Each rival must have a distinct style: conservative, bold, sycophantic, or scholarly
- Score each rival on their own merits — you are NOT given the player's score, and must NOT try to guess or target it
- Scores must be integers
- Do NOT rank candidates or assign titles — the game engine merges these rivals with the player's score and ranks all four

OUTPUT FORMAT (strict JSON):
{
  "rivals": [
    {"name": "全名", "answer_summary": "一句话描述其答题思路", "score": 72, "style": "conservative|bold|sycophantic|scholarly"},
    {"name": "...", "answer_summary": "...", "score": 68, "style": "..."},
    {"name": "...", "answer_summary": "...", "score": 60, "style": "..."}
  ]
}`;

  const user = `请为本次殿试生成3位竞争对手。对手强度：${input.rival_strength}。`;

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}
