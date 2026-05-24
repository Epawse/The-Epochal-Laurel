import type {
  CourtStyle,
  EmperorTemperament,
  Era,
  ExamLevel,
} from "@/lib/game/constants";
import type { StatChanges } from "@/lib/game/schema";

export type StatKey = keyof StatChanges;

export const STAT_LABELS: Record<StatKey, string> = {
  erudition: "才学",
  fortune: "运势",
  drive: "心力",
  wealth: "银两",
};

export const ACTION_HINTS: Record<string, string> = {
  study: "研读经义，增长才学",
  socialize: "拜访士林，拓展声望",
  earn: "经营生计，积攒盘缠",
  rest: "调养身心，恢复心力",
  scheme: "打探门路，风险自负",
};

export const ORIGIN_FLAVORS: Record<string, string> = {
  humble_scholar: "困顿寒微，最知读书不易",
  farming_family: "耕读传家，根基稳固",
  merchant_son: "家资丰厚，士林眼冷",
  official_decline: "门第余荫，旧梦未醒",
};

export const COURT_STYLE_LABELS: Record<CourtStyle, string> = {
  pragmatic: "务实",
  ornate: "华丽",
  orthodox: "守正",
  radical: "激进",
};

export const EMPEROR_TEMPERAMENT_LABELS: Record<EmperorTemperament, string> = {
  ambitious: "进取",
  lazy: "怠政",
  paranoid: "多疑",
  benevolent: "仁厚",
};

export const ERA_LABELS: Record<Era, string> = {
  prosperity: "盛世",
  decline: "衰世",
  invasion: "乱世",
  restoration: "中兴",
};

export const EXAM_LEVEL_LABELS: Record<ExamLevel, string> = {
  county: "童试",
  provincial: "乡试",
  metropolitan: "会试",
  palace: "殿试",
};

export function formatStatLabel(stat: string): string {
  return STAT_LABELS[stat as StatKey] ?? stat;
}

export function formatCourtValue(value: string): string {
  if (value in COURT_STYLE_LABELS) {
    return COURT_STYLE_LABELS[value as CourtStyle];
  }
  if (value in EMPEROR_TEMPERAMENT_LABELS) {
    return EMPEROR_TEMPERAMENT_LABELS[value as EmperorTemperament];
  }
  return value;
}
