"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getLeaderboard } from "@/lib/actions/leaderboard";
import { useSessionJSON } from "@/hooks/useSessionJSON";
import type { LeaderboardEntry } from "@/lib/db/queries";

interface DynastySummary {
  familyName: string;
  tier: "S" | "A" | "B" | "C" | "D" | "F";
  highestTitle: string;
  generations: number;
  score: number;
}

const TIER_NOTES: Record<string, string> = {
  S: "一代状元，旷世奇才",
  A: "状元及第，光宗耀祖",
  B: "三代进士，家学渊源",
  C: "进士及第，功成名就",
  D: "举人止步，壮志未酬",
  F: "家道中落，后继无人",
};

export default function LeaderboardPage() {
  const dynastySummary = useSessionJSON<DynastySummary>("dynasty_summary");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setEntries(await getLeaderboard());
      } catch (e) {
        console.warn("Failed to fetch leaderboard:", e);
        setError("暂无法连接排行榜");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-6 md:gap-8 max-w-[960px] mx-auto w-full py-6 md:py-8 px-4 md:px-6">
      {/* Header */}
      <header className="text-center">
        <span className="font-mono text-[10px] tracking-[0.3em] text-vermillion uppercase block mb-2">
          流芳名录
        </span>
        <h1 className="font-calli text-[38px] text-gold-glow tracking-[0.22em]">
          百世流芳榜
        </h1>
        <p className="font-serif text-sm text-bone-mute tracking-[0.08em] mt-1">
          一门功名，万世留名
        </p>
      </header>

      {/* Dynasty Summary Card */}
      {dynastySummary && (
        <section className="border border-gold-dim bg-paper-1 p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-4 md:gap-6">
            {/* Left: Seal */}
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="relative w-[88px] h-[88px]">
                <img
                  src="/assets/seal-blank-red.png"
                  alt=""
                  className="w-full h-full object-contain opacity-80"
                  aria-hidden="true"
                />
                <span className="absolute inset-0 flex items-center justify-center font-calli text-[28px] text-bone leading-none">
                  {dynastySummary.familyName}
                </span>
              </div>
            </div>

            {/* Right: Info */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="font-serif text-xl text-bone tracking-[0.12em]">
                  {dynastySummary.familyName}氏
                </span>
                <StatusBadge tier={dynastySummary.tier} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mt-2">
                <div>
                  <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase block">
                    最高功名
                  </span>
                  <span className="font-serif text-base text-gold tracking-[0.06em]">
                    {dynastySummary.highestTitle}
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase block">
                    传承世代
                  </span>
                  <span className="font-serif text-base text-bone tracking-[0.06em]">
                    {dynastySummary.generations}世
                  </span>
                </div>
                <div>
                  <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase block">
                    总分
                  </span>
                  <span className="font-mono text-base text-gold-glow tracking-[0.06em]">
                    {dynastySummary.score}
                  </span>
                </div>
              </div>

              <p className="font-serif text-xs text-bone-mute tracking-[0.04em] mt-1 italic">
                {TIER_NOTES[dynastySummary.tier] ?? ""}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Leaderboard Table */}
      <section>
        <span className="font-mono text-[9px] tracking-[0.18em] text-bone-mute uppercase block mb-4">
          名门排行
        </span>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-gold-dim border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="border border-hairline bg-paper-1 p-8 text-center">
            <p className="font-serif text-sm text-bone-mute tracking-[0.06em]">
              {error}
            </p>
            <p className="font-mono text-[10px] text-bone-mute tracking-[0.08em] mt-2">
              榜单数据暂不可用
            </p>
          </div>
        ) : entries.length === 0 ? (
          <div className="border border-hairline bg-paper-1 p-8 text-center">
            <p className="font-serif text-sm text-bone-mute tracking-[0.06em]">
              尚无英杰登榜
            </p>
            <p className="font-mono text-[10px] text-bone-mute tracking-[0.08em] mt-2">
              静待第一门登榜
            </p>
          </div>
        ) : (
          <div className="border border-hairline bg-paper-1 overflow-x-auto">
            {/* Table header */}
            <div className="grid min-w-[680px] grid-cols-[60px_1fr_60px_100px_80px_80px] gap-2 px-4 py-2.5 border-b border-hairline bg-paper-2">
              <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase">
                排名
              </span>
              <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase">
                家族
              </span>
              <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase text-center">
                等第
              </span>
              <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase">
                功名
              </span>
              <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase text-center">
                世代
              </span>
              <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase text-right">
                总分
              </span>
            </div>

            {/* Table rows */}
            {entries.map((entry, idx) => {
              const rank = idx + 1;
              const isPlayer =
                dynastySummary != null &&
                entry.family_name === dynastySummary.familyName &&
                entry.score === dynastySummary.score;
              const isTop3 = rank <= 3;

              return (
                <div
                  key={`${entry.family_name}-${idx}`}
                  className={`relative grid min-w-[680px] grid-cols-[60px_1fr_60px_100px_80px_80px] gap-2 px-4 py-3 border-b border-hairline-soft last:border-b-0 transition-colors ${
                    isPlayer
                      ? "bg-[rgba(196,57,44,0.06)]"
                      : "hover:bg-paper-2"
                  }`}
                >
                  {/* Player row vermillion left border */}
                  {isPlayer && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-vermillion" />
                  )}

                  {/* Rank */}
                  <div className="flex items-center">
                    {isTop3 ? (
                      <span className="font-latin-serif italic text-[28px] text-vermillion font-semibold leading-none">
                        {rank}
                      </span>
                    ) : (
                      <span className="font-mono text-sm text-bone-mute">
                        {rank}
                      </span>
                    )}
                  </div>

                  {/* Family name */}
                  <div className="flex items-center">
                    <span className="font-serif text-sm text-bone tracking-[0.06em]">
                      {entry.family_name}氏
                    </span>
                    {isPlayer && (
                      <span className="ml-2 px-1.5 py-0.5 bg-vermillion/20 border border-vermillion/40 font-mono text-[8px] text-vermillion tracking-[0.12em] uppercase">
                        本家
                      </span>
                    )}
                  </div>

                  {/* Tier badge */}
                  <div className="flex items-center justify-center">
                    <StatusBadge
                      tier={entry.tier as "S" | "A" | "B" | "C" | "D" | "F"}
                      variant="hint"
                      label={entry.tier}
                    />
                  </div>

                  {/* Highest title */}
                  <div className="flex items-center">
                    <span className="font-serif text-xs text-bone-dim tracking-[0.04em]">
                      {entry.highest_title}
                    </span>
                  </div>

                  {/* Generations */}
                  <div className="flex items-center justify-center">
                    <span className="font-mono text-xs text-bone-mute">
                      {entry.generations}
                    </span>
                  </div>

                  {/* Score */}
                  <div className="flex items-center justify-end">
                    <span className="font-mono text-sm text-gold-dim tracking-[0.04em]">
                      {entry.score}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline pt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
        <Link
          href="/create"
          className="px-6 py-2.5 bg-gradient-to-b from-vermillion to-vermillion-deep text-bone border border-vermillion-deep font-serif text-sm tracking-[0.16em] sm:tracking-[0.22em] text-center transition-all duration-200 hover:brightness-108"
        >
          再开一世
        </Link>
        <Link
          href="/play"
          className="px-6 py-2.5 border border-hairline bg-paper-2 font-serif text-sm text-bone tracking-[0.12em] text-center hover:border-gold-dim transition-colors"
        >
          回到日常
        </Link>
      </footer>
    </div>
  );
}
