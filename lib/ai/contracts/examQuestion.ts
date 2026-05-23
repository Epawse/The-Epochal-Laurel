// E1 — Exam Question Generation (game-design/ai-contracts.md).
// Model tier: Mid (deepseek-v4-pro). Temperature: 0.7.
// Fallback: static question pool per era/level.

import { callLLM } from "../client";
import { buildE1Messages } from "../prompts";
import {
  E1ExamQuestionSchema,
  extractJsonObject,
  type E1ExamQuestion,
  type E1Input,
} from "../schema";
import { log } from "../../log";

export async function generateExamQuestion(input: E1Input): Promise<E1ExamQuestion> {
  try {
    const result = await callLLM("mid", buildE1Messages(input), {
      contract: "E1",
      temperature: 0.7,
      maxTokens: 800,
      timeoutMs: 10_000,
      softBudgetMs: 3000,
      responseFormat: "json",
      thinking: false,
    });
    return E1ExamQuestionSchema.parse(JSON.parse(extractJsonObject(result.content)));
  } catch (err) {
    log.warn("ai.fallback", {
      contract: "E1",
      reason: err instanceof Error ? err.message : String(err),
    });
    return staticQuestion(input);
  }
}

// ── Static Fallback Pool ──────────────────────────────────────────────────────

interface StaticQ {
  era: string;
  level: string;
  question: E1ExamQuestion;
}

const STATIC_QUESTIONS: StaticQ[] = [
  // prosperity + county
  {
    era: "prosperity",
    level: "county",
    question: {
      question_text: "今岁丰稳，百姓安居。然县中学风日弛，试问何以振兴文教？",
      topic_category: "governance",
      difficulty_hint: "Basic governance question for county level",
      choices: [
        { id: "a", label: "广设义学，延请名师", alignment: "partial", base_score: 45, risk: null },
        { id: "b", label: "严立考课，赏罚分明", alignment: "full", base_score: 55, risk: { condition: "temperament_mismatch", description: "严苛之策恐忤仁君", penalty: { drive: -5, fortune: -5 } } },
        { id: "c", label: "以身作则，亲自讲学", alignment: "none", base_score: 65, risk: { condition: "full_mismatch", description: "越俎代庖恐遭非议", penalty: { drive: -10, fortune: -5 } } },
      ],
      free_input_hint: "可从地方实际出发，提出具体可行之策",
    },
  },
  // prosperity + provincial
  {
    era: "prosperity",
    level: "provincial",
    question: {
      question_text: "盛世之下，商贾日富而士子日贫。朝廷当如何平衡士商之利？",
      topic_category: "economics",
      difficulty_hint: "Economic balance question",
      choices: [
        { id: "a", label: "重农抑商，固本培元", alignment: "none", base_score: 45, risk: null },
        { id: "b", label: "开放商税，以商养士", alignment: "partial", base_score: 55, risk: { condition: "style_mismatch", description: "言利之论恐遭清流鄙夷", penalty: { drive: -5, fortune: -8 } } },
        { id: "c", label: "士商并重，各安其业", alignment: "full", base_score: 65, risk: { condition: "temperament_mismatch", description: "折中之论恐显无主见", penalty: { drive: -8, fortune: -5 } } },
      ],
      free_input_hint: "若能引用前朝成例或提出创新制度设计，可获加分",
    },
  },
  // decline + county
  {
    era: "decline",
    level: "county",
    question: {
      question_text: "近年党争日烈，地方官吏多结党营私。为士者当如何自处？",
      topic_category: "ethics",
      difficulty_hint: "Ethics under political pressure",
      choices: [
        { id: "a", label: "洁身自好，不涉党争", alignment: "partial", base_score: 45, risk: null },
        { id: "b", label: "择善而从，匡扶正道", alignment: "full", base_score: 55, risk: { condition: "temperament_mismatch", description: "站队之举恐遭猜忌", penalty: { drive: -8, fortune: -5 } } },
        { id: "c", label: "韬光养晦，待时而动", alignment: "none", base_score: 65, risk: { condition: "full_mismatch", description: "消极避世恐失圣心", penalty: { drive: -10, fortune: -8 } } },
      ],
      free_input_hint: "可结合历史典故论述士人在乱世中的处世之道",
    },
  },
  // decline + provincial
  {
    era: "decline",
    level: "provincial",
    question: {
      question_text: "朝纲渐弛，豪强割据。试论如何重振中央权威而不失民心？",
      topic_category: "governance",
      difficulty_hint: "Balancing central authority with popular support",
      choices: [
        { id: "a", label: "以德服人，渐次收权", alignment: "partial", base_score: 45, risk: null },
        { id: "b", label: "雷厉风行，削藩平乱", alignment: "full", base_score: 60, risk: { condition: "temperament_mismatch", description: "激进之策恐引反弹", penalty: { drive: -10, fortune: -8 } } },
        { id: "c", label: "联弱制强，分化瓦解", alignment: "none", base_score: 55, risk: { condition: "style_mismatch", description: "权谋之术恐失正道", penalty: { drive: -5, fortune: -10 } } },
      ],
      free_input_hint: "可参考历代削藩之策，提出循序渐进的方案",
    },
  },
  // invasion + county
  {
    era: "invasion",
    level: "county",
    question: {
      question_text: "外族铁骑南下，百姓流离。为士者当以何策安民？",
      topic_category: "military",
      difficulty_hint: "Wartime civilian protection",
      choices: [
        { id: "a", label: "组织乡勇，据城自守", alignment: "partial", base_score: 50, risk: null },
        { id: "b", label: "疏散百姓，保全性命", alignment: "none", base_score: 45, risk: null },
        { id: "c", label: "联络义军，主动出击", alignment: "full", base_score: 65, risk: { condition: "temperament_mismatch", description: "冒进之举恐致全军覆没", penalty: { drive: -15, fortune: -10 } } },
      ],
      free_input_hint: "可从军事、民生、外交多角度提出综合方案",
    },
  },
  // invasion + provincial
  {
    era: "invasion",
    level: "provincial",
    question: {
      question_text: "山河破碎，朝廷偏安。是战是和，试论其利弊得失。",
      topic_category: "military",
      difficulty_hint: "War vs peace strategic debate",
      choices: [
        { id: "a", label: "主和以图休养生息", alignment: "none", base_score: 45, risk: null },
        { id: "b", label: "力主北伐收复失地", alignment: "full", base_score: 60, risk: { condition: "temperament_mismatch", description: "好战之论恐忤偏安之君", penalty: { drive: -10, fortune: -8 } } },
        { id: "c", label: "以和为表以战为里", alignment: "partial", base_score: 55, risk: { condition: "style_mismatch", description: "两面之策恐失信于人", penalty: { drive: -8, fortune: -5 } } },
      ],
      free_input_hint: "可从国力、民心、军事形势综合分析",
    },
  },
  // restoration + county
  {
    era: "restoration",
    level: "county",
    question: {
      question_text: "新朝初立，百废待兴。地方治理当以何为先？",
      topic_category: "governance",
      difficulty_hint: "Post-war reconstruction priorities",
      choices: [
        { id: "a", label: "兴修水利，恢复农耕", alignment: "full", base_score: 50, risk: null },
        { id: "b", label: "严明法纪，惩治贪腐", alignment: "partial", base_score: 55, risk: { condition: "temperament_mismatch", description: "严刑峻法恐失宽仁之意", penalty: { drive: -5, fortune: -5 } } },
        { id: "c", label: "广开言路，选贤任能", alignment: "none", base_score: 65, risk: { condition: "full_mismatch", description: "空谈之嫌恐遭务实派非议", penalty: { drive: -10, fortune: -8 } } },
      ],
      free_input_hint: "可结合新朝求贤若渴的背景提出务实方案",
    },
  },
  // restoration + provincial
  {
    era: "restoration",
    level: "provincial",
    question: {
      question_text: "中兴之世，朝廷求贤若渴。试论选才之法当如何革新？",
      topic_category: "governance",
      difficulty_hint: "Talent selection reform",
      choices: [
        { id: "a", label: "沿用旧制，稳中求进", alignment: "none", base_score: 45, risk: null },
        { id: "b", label: "广开科目，不拘一格", alignment: "full", base_score: 60, risk: { condition: "style_mismatch", description: "激进改革恐动摇根基", penalty: { drive: -8, fortune: -8 } } },
        { id: "c", label: "荐举与科举并行", alignment: "partial", base_score: 55, risk: { condition: "temperament_mismatch", description: "折中之策恐显优柔", penalty: { drive: -5, fortune: -5 } } },
      ],
      free_input_hint: "可参考历代选才制度的利弊得失",
    },
  },
  // metropolitan level questions
  {
    era: "prosperity",
    level: "metropolitan",
    question: {
      question_text: "天下承平日久，武备渐弛。然居安思危，试论太平之世当如何整军经武？",
      topic_category: "military",
      difficulty_hint: "Military preparedness in peacetime - high difficulty",
      choices: [
        { id: "a", label: "寓兵于农，平时务农战时为兵", alignment: "partial", base_score: 45, risk: null },
        { id: "b", label: "精兵简政，重质不重量", alignment: "full", base_score: 60, risk: { condition: "temperament_mismatch", description: "裁军之议恐触将门利益", penalty: { drive: -10, fortune: -8 } } },
        { id: "c", label: "大兴武举，文武并重", alignment: "none", base_score: 70, risk: { condition: "full_mismatch", description: "重武之论恐忤文治之朝", penalty: { drive: -15, fortune: -10 } } },
      ],
      free_input_hint: "可从制度设计、财政支撑、人才培养等多维度论述",
    },
  },
  {
    era: "decline",
    level: "metropolitan",
    question: {
      question_text: "民间疾苦日深，流民四起。朝廷当以何策安天下？",
      topic_category: "economics",
      difficulty_hint: "Crisis management at national level",
      choices: [
        { id: "a", label: "开仓赈济，安抚民心", alignment: "partial", base_score: 45, risk: null },
        { id: "b", label: "均田免赋，釜底抽薪", alignment: "full", base_score: 65, risk: { condition: "style_mismatch", description: "动摇田制恐遭豪强反扑", penalty: { drive: -12, fortune: -10 } } },
        { id: "c", label: "以工代赈，兴修大利", alignment: "none", base_score: 55, risk: { condition: "temperament_mismatch", description: "劳民之策恐加重负担", penalty: { drive: -8, fortune: -5 } } },
      ],
      free_input_hint: "可从短期救急与长期制度改革两方面论述",
    },
  },
];

function staticQuestion(input: E1Input): E1ExamQuestion {
  // Find a matching question for era + level
  const matches = STATIC_QUESTIONS.filter(
    (q) => q.era === input.era && q.level === input.exam_level
  );
  if (matches.length > 0) {
    // Pick one that hasn't been used (by checking previous_questions)
    const unused = matches.filter(
      (q) => !input.previous_questions_this_run.includes(q.question.question_text)
    );
    if (unused.length > 0) return unused[0].question;
    return matches[0].question;
  }

  // Ultimate fallback — generic question
  return {
    question_text: "治国之道，在于用人。试论何为贤才，当如何识之用之？",
    topic_category: "governance",
    difficulty_hint: "Generic governance question (fallback)",
    choices: [
      { id: "a", label: "德才兼备，以德为先", alignment: "partial", base_score: 45, risk: null },
      { id: "b", label: "唯才是举，不拘小节", alignment: "full", base_score: 55, risk: { condition: "temperament_mismatch", description: "轻德之论恐遭非议", penalty: { drive: -5, fortune: -5 } } },
      { id: "c", label: "因材施用，各尽其能", alignment: "none", base_score: 65, risk: { condition: "full_mismatch", description: "空泛之论恐显无主见", penalty: { drive: -10, fortune: -8 } } },
    ],
    free_input_hint: "可结合具体历史人物论述用人之道",
  };
}
