"use client";

import type { CurrentEvent } from "@/lib/game/schema";

type EventChoiceData = CurrentEvent["choices"][number];

interface EventChoiceProps {
  choice: EventChoiceData;
  index: number;
  onClick: (id: string) => void;
}

const keyLabels = ["其一", "其二", "其三"];

export function EventChoice({ choice, index, onClick }: EventChoiceProps) {
  return (
    <button
      type="button"
      className="bg-paper-2 border border-hairline p-3.5 pb-3 text-left cursor-pointer transition-all duration-200 ease-out flex flex-col gap-2 relative min-h-[132px] hover:border-gold hover:bg-paper-3 hover:-translate-y-0.5"
      onClick={() => onClick(choice.id)}
      aria-label={`${keyLabels[index]}: ${choice.label}`}
    >
      {/* Key label */}
      <span className="font-mono text-[10px] tracking-[0.2em] text-vermillion">
        {keyLabels[index] ?? `其${index + 1}`}
      </span>

      {/* Title */}
      <span className="font-serif text-[17px] text-bone tracking-[0.1em] leading-tight">
        {choice.label}
      </span>

      {/* Stat preview */}
      <div className="mt-auto font-mono text-[10.5px] tracking-[0.06em] text-bone-dim pt-2 border-t border-dashed border-hairline flex gap-2 flex-wrap">
        {Object.entries(choice.stat_changes).map(([stat, val]) => {
          if (val === 0) return null;
          const colorClass = val > 0 ? "text-jade" : "text-vermillion";
          const sign = val > 0 ? "+" : "";
          return (
            <span key={stat} className={colorClass}>
              {stat.slice(0, 3)} {sign}
              {val}
            </span>
          );
        })}
      </div>
    </button>
  );
}
