"use client";

import { StatRow } from "@/components/game/StatRow";
import type { Stats, StatChanges } from "@/lib/game/schema";
import { STAT_BOUNDARIES } from "@/lib/game/constants";

interface StatPanelProps {
  portraitSrc: string;
  name: string;
  age: number;
  stats: Stats;
  deltas?: Partial<StatChanges>;
}

export function StatPanel({ portraitSrc, name, age, stats, deltas }: StatPanelProps) {
  return (
    <div className="relative">
      {/* Portrait */}
      <div className="aspect-[3/4] w-full max-h-[360px] md:max-h-none bg-ink border border-hairline overflow-hidden relative">
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(232,200,121,0.10),transparent_70%)]"
          aria-hidden="true"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={portraitSrc}
          alt={`Portrait of ${name}`}
          className="w-full h-full object-cover object-[50%_20%]"
        />
        {/* Gradient overlay at bottom */}
        <div
          className="absolute inset-0 bg-[linear-gradient(180deg,transparent_55%,rgba(15,12,8,0.75))] pointer-events-none"
          aria-hidden="true"
        />
        {/* Character name overlay */}
        <div className="absolute left-3.5 bottom-3 z-[2]">
          <span className="font-calli text-[24px] sm:text-[28px] text-gold-glow tracking-[0.12em] sm:tracking-[0.18em] drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            {name}
          </span>
          <span className="block font-mono text-[10px] text-bone-dim tracking-[0.18em] mt-1">
            {age}岁
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 flex flex-col gap-3">
        <StatRow
          slot="erudition"
          label="才学"
          value={stats.erudition}
          max={STAT_BOUNDARIES.erudition.max}
          delta={deltas?.erudition}
        />
        <StatRow
          slot="fortune"
          label="运势"
          value={stats.fortune}
          max={STAT_BOUNDARIES.fortune.max}
          delta={deltas?.fortune}
        />
        <StatRow
          slot="drive"
          label="心力"
          value={stats.drive}
          max={STAT_BOUNDARIES.drive.max}
          delta={deltas?.drive}
        />
        <StatRow
          slot="wealth"
          label="财富"
          value={stats.wealth}
          max={STAT_BOUNDARIES.wealth.max}
          delta={deltas?.wealth}
        />
      </div>
    </div>
  );
}
