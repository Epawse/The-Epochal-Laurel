"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

type StatSlot = "erudition" | "fortune" | "drive" | "wealth";

interface StatRowProps {
  slot: StatSlot;
  label: string;
  value: number;
  max: number;
  delta?: number;
}

const slotLabels: Record<StatSlot, string> = {
  erudition: "才学",
  fortune: "运势",
  drive: "心力",
  wealth: "财富",
};

const barGradients: Record<StatSlot, string> = {
  erudition: "linear-gradient(90deg, #6b4f2a, var(--gold-glow))",
  fortune: "linear-gradient(90deg, var(--vermillion-deep), var(--vermillion))",
  drive: "linear-gradient(90deg, #3e5942, var(--jade))",
  wealth: "linear-gradient(90deg, #6b5840, var(--bone-dim))",
};

const deltaChip = {
  initial: { opacity: 0, x: -4 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 4 },
  transition: { duration: 0.3 },
};

export function StatRow({ slot, label, value, max, delta }: StatRowProps) {
  const reduce = useReducedMotion();
  const [visibleDelta, setVisibleDelta] = useState<number | null>(
    delta !== undefined && delta !== 0 ? delta : null,
  );
  const [prevDelta, setPrevDelta] = useState(delta);
  const isDanger = slot === "drive" && value <= 25;
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  // Sync the shown delta when the prop changes — during render, not in an effect.
  if (delta !== prevDelta) {
    setPrevDelta(delta);
    setVisibleDelta(delta !== undefined && delta !== 0 ? delta : null);
  }

  // Auto-dismiss after 1.4s; setState lives in the async timer, not the effect body.
  useEffect(() => {
    if (visibleDelta === null) return;
    const timer = setTimeout(() => setVisibleDelta(null), 1400);
    return () => clearTimeout(timer);
  }, [visibleDelta]);

  return (
    <div
      className={`grid grid-cols-[44px_1fr_36px] items-center gap-2.5 ${
        isDanger ? "stat-spirit-danger" : ""
      }`}
    >
      {/* Label */}
      <span
        className={`font-serif text-sm tracking-[0.18em] ${
          isDanger ? "text-vermillion" : "text-bone"
        }`}
      >
        {label || slotLabels[slot]}
      </span>

      {/* Bar */}
      <div className="h-[5px] bg-paper-2 border border-hairline relative overflow-hidden bar">
        <i
          className="absolute top-0 left-0 bottom-0 transition-[width] duration-600 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{
            width: `${pct}%`,
            background: barGradients[slot],
          }}
        />
      </div>

      {/* Value + Delta */}
      <div className="flex items-center gap-1">
        <span className="font-mono text-[13px] text-gold tracking-[0.06em] text-right tabular-nums">
          {value}
        </span>
        <AnimatePresence>
          {visibleDelta !== null && visibleDelta !== 0 && (
            <motion.span
              key={visibleDelta}
              className={`font-mono text-[10px] tracking-[0.06em] ${
                visibleDelta > 0 ? "text-jade" : "text-vermillion"
              }`}
              initial={reduce ? false : deltaChip.initial}
              animate={deltaChip.animate}
              exit={deltaChip.exit}
              transition={deltaChip.transition}
            >
              {visibleDelta > 0 ? `+${visibleDelta}` : visibleDelta}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
