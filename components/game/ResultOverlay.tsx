"use client";

import { motion } from "framer-motion";

interface ResultOverlayProps {
  passed: boolean;
  title?: string;
  narration: string;
  statChanges: { erudition: number; fortune: number; drive: number; wealth: number };
  score: number;
  threshold?: number;
  judgeNarrative?: string;
  onDismiss: () => void;
}

const STAT_LABELS: Record<string, string> = {
  erudition: "学识",
  fortune: "运势",
  drive: "心力",
  wealth: "银两",
};

export function ResultOverlay({
  passed,
  title,
  narration,
  statChanges,
  score,
  threshold,
  judgeNarrative,
  onDismiss,
}: ResultOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Scrim */}
      <motion.div
        className="absolute inset-0 bg-[rgba(8,6,4,0.85)]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        aria-hidden="true"
      />

      {/* Card */}
      <motion.div
        className="relative z-10 w-full max-w-[1100px] mx-4 grid grid-cols-1 md:grid-cols-[1fr_1.2fr] bg-paper-1 border border-gold-dim overflow-hidden"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
      >
        {/* Left — Image */}
        <div className="relative hidden md:block min-h-[400px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('${passed ? "/assets/exam-pass.png" : "/assets/exam-fail.png"}')`,
            }}
          />
          {/* Gradient fade-right */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-paper-1" />
        </div>

        {/* Right — Body */}
        <div className="relative p-8 md:p-10 flex flex-col justify-center">
          {/* Label */}
          <span className="font-mono text-[10px] tracking-[0.2em] text-vermillion uppercase mb-2">
            EXAM RESULT
          </span>

          {/* Title */}
          <h2
            id="result-title"
            className={`font-calli text-[72px] md:text-[88px] tracking-[0.18em] leading-none mb-4 ${
              passed ? "text-gold-glow" : "text-bone-mute"
            }`}
          >
            {passed ? "高中" : "落第"}
          </h2>

          {/* Awarded title */}
          {passed && title && (
            <p className="font-serif text-lg text-gold-dim tracking-[0.12em] mb-3">
              授「{title}」
            </p>
          )}

          {/* Score */}
          <p className="font-mono text-xs text-bone-mute tracking-[0.08em] mb-4">
            得分 {score}{threshold ? ` / 及格线 ${Math.round(threshold)}` : ""}
          </p>

          {/* Narration */}
          <p className="font-serif text-base text-bone-dim leading-[1.85] tracking-[0.04em] mb-4">
            {narration}
          </p>

          {/* Judge narrative */}
          {judgeNarrative && (
            <p className="font-serif text-sm text-bone-mute italic tracking-[0.04em] mb-4">
              考官评语：{judgeNarrative}
            </p>
          )}

          {/* Stat changes */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {(Object.entries(statChanges) as [string, number][]).map(([stat, delta]) => (
              <div key={stat} className="flex flex-col items-center gap-1">
                <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase">
                  {STAT_LABELS[stat] ?? stat}
                </span>
                <span
                  className={`font-mono text-sm tracking-[0.06em] ${
                    delta > 0
                      ? "text-jade"
                      : delta < 0
                        ? "text-vermillion"
                        : "text-bone-mute"
                  }`}
                >
                  {delta > 0 ? `+${delta}` : delta === 0 ? "-" : delta}
                </span>
              </div>
            ))}
          </div>

          {/* Stamp */}
          <motion.div
            className="absolute top-6 right-6 w-20 h-20 md:w-24 md:h-24"
            initial={{ scale: 2.4, opacity: 0, rotate: -15 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.6, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div
              className="w-full h-full bg-contain bg-center bg-no-repeat flex items-center justify-center"
              style={{ backgroundImage: "url('/assets/seal-blank-red.png')" }}
            >
              <span className="font-calli text-[18px] md:text-[22px] text-bone tracking-[0.08em]">
                {passed ? (title ?? "中") : "落"}
              </span>
            </div>
          </motion.div>

          {/* Return button */}
          <button
            type="button"
            onClick={onDismiss}
            className="self-start px-6 py-2.5 bg-paper-2 border border-hairline font-serif text-sm text-bone tracking-[0.12em] hover:border-gold-dim transition-colors"
          >
            返回
          </button>
        </div>
      </motion.div>
    </div>
  );
}
