"use client";

import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { Character, Effect, Modifier, World } from "@/lib/game/schema";

// Left-column "持有·加成" panel for the daily loop. Pure presentation: it reads
// fields the server already computes on GameState (relics / skills / modifiers /
// status_effects / traits + world.world_modifiers) and renders compact chips.
// It NEVER computes game rules — components are dumb about balance. Empty
// sections are hidden; the whole panel collapses to just the shop CTA when the
// player holds nothing yet.
//
// Animation follows motion-patterns.md (transform+opacity only, reduced-motion
// honored). Colors come from design tokens.

const RARITY_TONE: Record<string, { dot: string; text: string; label: string }> = {
  common: { dot: "bg-bone-mute", text: "text-bone-dim", label: "寻常" },
  rare: { dot: "bg-jade", text: "text-jade", label: "稀有" },
  legendary: { dot: "bg-gold-glow", text: "text-gold-glow", label: "传世" },
};

const EFFECT_LABELS: Record<Effect["kind"], string> = {
  action_gain: "行动增益",
  action_cost: "行动减耗",
  action_block: "行动限制",
  exam_score: "科试加成",
  exam_threshold: "门槛变化",
  exam_alignment_relax: "圣意宽免",
  intel_grant: "情报揭示",
  dice_modifier: "骰运修正",
  event_bias: "世事偏移",
  meta: "特殊命数",
};

const STATUS_LABELS: Record<string, string> = {
  exam_ban: "禁考",
  mourning: "丁忧",
};

const SKILL_KIND_LABELS: Record<string, string> = {
  passive: "被动",
  active: "主动",
};

/** Conservative buff/debuff tone for a modifier. Only the unambiguous cases are
 *  colored positive/negative; everything else stays neutral (never assert a wrong
 *  color). This is display sugar, not a rule. */
function modifierTone(effect: Effect): "positive" | "negative" | "neutral" {
  switch (effect.kind) {
    case "action_block":
      return "negative";
    case "action_gain":
      if (typeof effect.value === "number") return effect.value >= 0 ? "positive" : "negative";
      if (typeof effect.mult === "number") return effect.mult >= 1 ? "positive" : "negative";
      return "neutral";
    case "action_cost":
      // Cost reductions are modeled here; a lower cost is a boon.
      return "positive";
    case "exam_score":
      if (typeof effect.value === "number") return effect.value >= 0 ? "positive" : "negative";
      if (typeof effect.mult === "number") return effect.mult >= 1 ? "positive" : "negative";
      return "neutral";
    case "exam_threshold":
      return effect.value <= 0 ? "positive" : "negative";
    case "dice_modifier":
      return effect.value >= 0 ? "positive" : "negative";
    default:
      return "neutral";
  }
}

const TONE_CLASS: Record<"positive" | "negative" | "neutral", string> = {
  positive: "text-jade border-jade/40 bg-jade/10",
  negative: "text-vermillion border-vermillion/40 bg-vermillion/10",
  neutral: "text-gold-dim border-gold-dim/40 bg-[rgba(201,165,90,0.06)]",
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[9px] tracking-[0.18em] text-bone-mute uppercase block">
      {children}
    </span>
  );
}

function Chip({
  children,
  tone = "neutral",
  title,
}: {
  children: React.ReactNode;
  tone?: "positive" | "negative" | "neutral";
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 border font-serif text-[11px] tracking-[0.04em] leading-none ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

interface HoldingsPanelProps {
  character: Character;
  world: World;
  /** Shop CTA — wired to handleOpenMerchantShop on the play page. */
  onOpenShop: () => void;
  shopDisabled: boolean;
}

export function HoldingsPanel({ character, world, onOpenShop, shopDisabled }: HoldingsPanelProps) {
  const reduce = useReducedMotion();

  const relics = character.relics ?? [];
  const skills = character.skills ?? [];
  const modifiers = character.modifiers ?? [];
  const statusEffects = character.status_effects ?? [];
  const traits = character.traits ?? [];
  const worldModifiers = world.world_modifiers ?? [];

  const canShop = !shopDisabled && character.stats.wealth >= 15;
  const hasAnything =
    relics.length > 0 ||
    skills.length > 0 ||
    modifiers.length > 0 ||
    statusEffects.length > 0 ||
    traits.length > 0 ||
    worldModifiers.length > 0;

  return (
    <motion.section
      className="border border-hairline bg-paper-1 flex flex-col"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.01 : 0.4, ease: [0.2, 0.7, 0.2, 1] }}
      aria-label="持有与加成"
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-hairline-soft">
        <span className="w-1 h-4 bg-vermillion" aria-hidden="true" />
        <span className="font-mono text-[9px] tracking-[0.18em] text-bone-mute uppercase">
          持有 · 加成
        </span>
      </div>

      {/* Shop CTA — clear "merchant" entry: abacus glyph + title + one-liner. */}
      <button
        type="button"
        onClick={onOpenShop}
        disabled={!canShop}
        className="group m-3 flex items-center gap-3 border border-hairline bg-paper-2 px-3 py-2.5 text-left transition-colors hover:border-gold-dim hover:bg-paper-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-hairline disabled:hover:bg-paper-2"
        aria-label="打开钱庄暗柜"
      >
        <span
          className="shrink-0 w-9 h-9 grid place-items-center rounded-full bg-[rgba(201,165,90,0.1)] border border-gold-dim text-gold-glow font-calli text-lg leading-none group-disabled:text-bone-mute"
          aria-hidden="true"
        >
          算
        </span>
        <span className="flex flex-col gap-0.5 min-w-0">
          <span className="font-serif text-sm text-bone tracking-[0.08em] group-disabled:text-bone-mute">
            钱庄暗柜
          </span>
          <span className="font-mono text-[9px] tracking-[0.08em] text-bone-mute">
            {canShop ? "以银钱易奇物" : "银两不足（需15）"}
          </span>
        </span>
      </button>

      <div className="px-3 pb-3 flex flex-col gap-3">
        {/* Relics */}
        {relics.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>遗物</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {relics.map((relic) => {
                const tone = RARITY_TONE[relic.rarity] ?? RARITY_TONE.common;
                const effectText = relic.effects
                  .map((e) => EFFECT_LABELS[e.kind])
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <div
                    key={relic.id}
                    title={relic.flavor || undefined}
                    className="flex items-center gap-2 border border-hairline bg-paper-2 px-2 py-1.5"
                  >
                    <span className={`shrink-0 w-1.5 h-1.5 rounded-full ${tone.dot}`} aria-hidden="true" />
                    <span className={`font-serif text-[12px] tracking-[0.04em] ${tone.text} truncate`}>
                      {relic.name}
                      {relic.id === character.heirloom_relic_id && (
                        <span className="ml-1 font-mono text-[8px] text-gold-dim">传家</span>
                      )}
                    </span>
                    {effectText && (
                      <span className="ml-auto shrink-0 font-mono text-[8.5px] tracking-[0.06em] text-bone-mute">
                        {effectText}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>技艺</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <Chip
                  key={skill.id}
                  tone={skill.kind === "active" ? "positive" : "neutral"}
                  title={skill.cooldown_remaining > 0 ? `冷却 ${skill.cooldown_remaining}` : undefined}
                >
                  <span className="font-mono text-[8px] tracking-[0.08em] opacity-70">
                    {SKILL_KIND_LABELS[skill.kind] ?? skill.kind}
                  </span>
                  {skill.name}
                  {skill.cooldown_remaining > 0 && (
                    <span className="font-mono text-[8px] text-bone-mute">·{skill.cooldown_remaining}</span>
                  )}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Modifiers (buffs / debuffs) */}
        {modifiers.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>加成 · 损益</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {modifiers.map((mod: Modifier) => {
                const tone = modifierTone(mod.effect);
                return (
                  <Chip key={mod.id} tone={tone}>
                    {mod.label}
                    {mod.turns_remaining !== null && (
                      <span className="font-mono text-[8px] text-bone-mute">
                        {mod.turns_remaining}季
                      </span>
                    )}
                  </Chip>
                );
              })}
            </div>
          </div>
        )}

        {/* Status effects */}
        {statusEffects.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>状态</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {statusEffects.map((status, i) => (
                <Chip key={`${status.type}_${i}`} tone="negative">
                  {STATUS_LABELS[status.type] ?? status.type}
                  {status.turns_remaining > 0 && (
                    <span className="font-mono text-[8px] text-bone-mute">
                      {status.turns_remaining}季
                    </span>
                  )}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Traits */}
        {traits.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>特质</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {traits.map((trait, i) => (
                <Chip key={`${trait}_${i}`} tone="neutral">
                  {trait}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* World modifiers */}
        {worldModifiers.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>世道加成</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {worldModifiers.map((mod: Modifier) => (
                <Chip key={mod.id} tone={modifierTone(mod.effect)} title="随世道流转">
                  {mod.label}
                  {mod.turns_remaining !== null && (
                    <span className="font-mono text-[8px] text-bone-mute">{mod.turns_remaining}季</span>
                  )}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Empty state — nothing held yet (shop CTA still shows above) */}
        {!hasAnything && (
          <p className="px-1 font-serif text-[12px] text-bone-mute tracking-[0.04em]">
            暂无遗物或加成，且以行动积累。
          </p>
        )}
      </div>
    </motion.section>
  );
}
