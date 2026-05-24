"use client";

import type { ActionDef } from "@/lib/game/constants";

interface ActionCardProps {
  action: ActionDef;
  iconSrc: string;
  disabled?: boolean;
  locked?: boolean;
  lockReason?: string;
  onClick?: () => void;
}

export function ActionCard({
  action,
  iconSrc,
  disabled = false,
  locked = false,
  lockReason,
  onClick,
}: ActionCardProps) {
  const isInteractive = !disabled && !locked;

  return (
    <button
      type="button"
      className={`relative bg-paper-1 border border-hairline p-3 md:p-4 md:pt-4 pb-3.5 text-center min-h-[170px] sm:min-h-[190px] md:min-h-[220px] flex flex-col items-center gap-2 transition-all duration-250 ease-out overflow-hidden ${
        isInteractive
          ? "cursor-pointer hover:-translate-y-[3px] hover:border-gold-dim hover:bg-paper-2"
          : ""
      } ${disabled ? "opacity-45 cursor-not-allowed" : ""} ${
        locked ? "cursor-not-allowed saturate-[0.6]" : ""
      }`}
      disabled={disabled || locked}
      onClick={isInteractive ? onClick : undefined}
      aria-label={`${action.label} - ${action.labelEn}`}
    >
      {/* Corner label */}
      <span className="absolute top-1.5 left-1.5 font-mono text-[9px] tracking-[0.12em] text-bone-mute">
        {action.id.toUpperCase().slice(0, 3)}
      </span>

      {/* Icon medallion */}
      <div
        className={`w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full overflow-hidden bg-paper-bone grid place-items-center border border-hairline shadow-[inset_0_0_0_1px_rgba(201,165,90,0.18)] transition-transform duration-300 ease-out ${
          isInteractive ? "group-hover:scale-[1.04]" : ""
        } ${locked ? "bg-paper-2 relative" : ""}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={iconSrc}
          alt=""
          className="w-full h-full object-cover"
        />
        {locked && (
          <div className="absolute inset-0 grid place-items-center bg-[rgba(15,12,8,0.55)]">
            <span className="text-vermillion font-serif text-[28px]">&#10005;</span>
          </div>
        )}
      </div>

      {/* Title */}
      <span
        className={`font-serif text-base sm:text-lg md:text-xl tracking-[0.14em] md:tracking-[0.22em] mt-1 transition-colors duration-200 ${
          locked ? "text-bone-mute" : "text-bone"
        }`}
      >
        {action.label}
      </span>

      {/* Description */}
      <span className="text-xs text-bone-mute leading-relaxed tracking-[0.02em] min-h-[32px]">
        {action.labelEn}
      </span>

      {/* Stat preview */}
      {!locked && (
        <div className="flex justify-center gap-2 font-mono text-[10.5px] tracking-[0.06em] text-bone-dim pt-2 mt-auto border-t border-dashed border-hairline w-full flex-wrap">
          {Object.entries(action.effects).map(([stat, [min, max]]) => {
            if (min === 0 && max === 0) return null;
            const avg = (min + max) / 2;
            const colorClass = avg > 0 ? "text-jade" : "text-vermillion";
            const sign = avg > 0 ? "+" : "";
            return (
              <span key={stat} className={colorClass}>
                {stat.slice(0, 3)} {sign}{min === max ? min : `${min}~${max}`}
              </span>
            );
          })}
        </div>
      )}

      {/* Lock note */}
      {locked && lockReason && (
        <div className="mt-auto pt-2 border-t border-dashed border-hairline w-full text-center font-mono text-[9px] tracking-[0.08em] text-vermillion">
          {lockReason}
        </div>
      )}
    </button>
  );
}
