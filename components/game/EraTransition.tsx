"use client";

import { useState, useEffect } from "react";
import type { Era } from "@/lib/game/constants";

const ERA_LABELS: Record<Era, string> = {
  prosperity: "盛世",
  decline: "衰世",
  invasion: "乱世",
  restoration: "中兴",
};

const ERA_QUOTES: Record<Era, string> = {
  prosperity: "天下太平，文风鼎盛，诗赋策论皆为正道。",
  decline: "朝纲渐弛，党争日烈，民间疾苦渐深。",
  invasion: "外族铁骑南下，山河破碎，忠义与苟且并存。",
  restoration: "新朝初立，百废待兴，务实之才最受青睐。",
};

function getEraImage(era: Era): string {
  if (era === "invasion") return "/assets/village--invasion.png";
  return "/assets/village.png";
}

interface EraTransitionProps {
  fromEra: Era;
  toEra: Era;
  onContinue: () => void;
}

export function EraTransition({ fromEra, toEra, onContinue }: EraTransitionProps) {
  const [contentVisible, setContentVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setContentVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      role="dialog"
      aria-label="Era transition"
    >
      {/* Old era image (faded) */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${getEraImage(fromEra)})`,
          filter: "saturate(0.6) brightness(0.55)",
        }}
        aria-hidden="true"
      />

      {/* New era image (ink-wipe reveal) */}
      <div
        className="absolute inset-0 bg-cover bg-center era-wipe"
        style={{
          backgroundImage: `url(${getEraImage(toEra)})`,
        }}
        aria-hidden="true"
      />

      {/* Dark overlay for text readability */}
      <div className="absolute inset-0 bg-[rgba(15,12,8,0.65)]" aria-hidden="true" />

      {/* Content */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 text-center px-8 max-w-[640px]"
        style={{
          opacity: contentVisible ? 1 : 0,
          transition: "opacity 0.8s ease-in-out",
        }}
      >
        {/* Label */}
        <span className="font-mono text-[11px] tracking-[0.3em] text-vermillion uppercase">
          ERA TRANSITION
        </span>

        {/* Title */}
        <h1
          className="font-calli text-gold-glow tracking-[0.2em] leading-tight"
          style={{ fontSize: "clamp(56px, 10vw, 132px)" }}
        >
          世道更替
        </h1>

        {/* From -> To */}
        <div className="flex items-center gap-4 font-serif text-[28px] text-bone tracking-[0.12em]">
          <span className="opacity-60">{ERA_LABELS[fromEra]}</span>
          <span className="text-gold-dim text-lg">→</span>
          <span>{ERA_LABELS[toEra]}</span>
        </div>

        {/* Quote */}
        <p className="font-serif text-base text-bone-mute italic tracking-[0.06em] leading-relaxed max-w-[480px]">
          {ERA_QUOTES[toEra]}
        </p>

        {/* Continue button */}
        <button
          type="button"
          onClick={onContinue}
          className="mt-4 px-8 py-3 border border-gold-dim bg-[rgba(201,165,90,0.08)] font-serif text-lg text-gold tracking-[0.22em] transition-all duration-200 hover:bg-[rgba(201,165,90,0.15)] hover:border-gold"
        >
          承之
        </button>
      </div>
    </div>
  );
}
