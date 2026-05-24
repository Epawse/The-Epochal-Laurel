"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { Effect, RelicDraft } from "@/lib/game/schema";

const SOURCE_LABELS: Record<string, string> = {
  action: "机缘所得",
  event: "事件馈赠",
  shop: "钱庄暗柜",
  exam: "科场赏赐",
  catastrophe: "劫后余生",
  start: "开局命数",
  skill: "技艺牵引",
};

const RARITY_LABELS: Record<string, string> = {
  common: "寻常",
  rare: "稀有",
  legendary: "传世",
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

interface RelicDraftModalProps {
  draft: RelicDraft;
  disabled?: boolean;
  onChoose: (relicId: string) => void;
}

export function RelicDraftModal({
  draft,
  disabled = false,
  onChoose,
}: RelicDraftModalProps) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          className="absolute inset-0 bg-[rgba(8,6,4,0.78)] backdrop-blur-[6px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          aria-hidden="true"
        />

        <motion.div
          className="relative z-10 w-full max-w-[940px] mx-4 bg-paper-1 border border-gold-dim p-6 md:p-8 overflow-y-auto max-h-[90vh]"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="relic-draft-title"
        >
          <span className="font-mono text-[10px] tracking-[0.2em] text-vermillion uppercase">
            {SOURCE_LABELS[draft.source] ?? draft.source}
          </span>
          <h2
            id="relic-draft-title"
            className="font-calli text-[38px] md:text-[44px] text-gold-glow tracking-[0.18em] mt-2 mb-4 leading-tight"
          >
            奇物择一
          </h2>
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gold-dim to-transparent mb-5" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {draft.options.map((option) => (
              <button
                type="button"
                key={option.relic.id}
                disabled={disabled}
                onClick={() => onChoose(option.relic.id)}
                className="bg-paper-2 border border-hairline p-4 text-left cursor-pointer transition-all duration-200 flex flex-col gap-3 min-h-[220px] hover:border-gold hover:bg-paper-3 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait disabled:hover:translate-y-0 disabled:hover:border-hairline disabled:hover:bg-paper-2"
                aria-label={`选择奇物：${option.relic.name}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-[10px] tracking-[0.18em] text-vermillion">
                    {RARITY_LABELS[option.relic.rarity] ?? option.relic.rarity}
                  </span>
                  {option.cost > 0 && (
                    <span className="font-mono text-[10px] tracking-[0.08em] text-gold">
                      银两 {option.cost}
                    </span>
                  )}
                </div>

                <span className="font-serif text-[19px] text-bone tracking-[0.1em] leading-tight">
                  {option.relic.name}
                </span>

                <p className="m-0 font-serif text-[13px] text-bone-dim tracking-[0.04em] leading-relaxed flex-1">
                  {option.relic.flavor}
                </p>

                <div className="pt-3 border-t border-dashed border-hairline flex flex-wrap gap-1.5">
                  {option.relic.effects.map((effect, index) => (
                    <span
                      key={`${option.relic.id}_${index}`}
                      className="font-mono text-[10px] text-jade border border-hairline px-1.5 py-0.5 tracking-[0.06em]"
                    >
                      {EFFECT_LABELS[effect.kind]}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
