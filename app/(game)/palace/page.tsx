"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { SceneBackground } from "@/components/ui/SceneBackground";
import { SealStamp } from "@/components/ui/SealStamp";
import { recordScore } from "@/lib/actions/leaderboard";
import { calculateScore } from "@/lib/game/scoring";
import { generateHeirsAction, type PalaceExamResult } from "@/lib/actions/game";
import type { RankingEntry } from "@/lib/engine/exam";
import { highestTitleOf } from "@/lib/game/constants";
import { useSessionJSON } from "@/hooks/useSessionJSON";
import { getSaveId } from "@/lib/client/saveId";

const TITLE_COLORS: Record<string, string> = {
  "状元": "text-gold-glow",
  "榜眼": "text-gold-dim",
  "探花": "text-gold-dim",
  "进士": "text-bone",
};

const RANK_LABELS = ["壹", "贰", "叁", "肆"];

const TIER_LABELS: Record<string, string> = {
  S: "S · 一代状元",
  A: "A · 状元及第",
  B: "B · 三代进士",
  C: "C · 进士及第",
  D: "D · 举人止步",
  F: "F · 断绝",
};

export default function PalacePage() {
  const router = useRouter();
  const result = useSessionJSON<PalaceExamResult>("palace_result");
  const [isNavigating, startNavigation] = useTransition();

  // No palace result → back to the daily loop.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem("palace_result");
    if (stored === null) {
      router.push("/play");
      return;
    }
    try {
      JSON.parse(stored);
    } catch {
      router.push("/play");
    }
  }, [router]);

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gold-dim border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { ranking, narration, victoryTier } = result;

  return (
    <>
      <SceneBackground src="/assets/imperial-court.png" opacity={0.82} />

      <div className="flex-1 flex flex-col items-center justify-center py-8 px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="font-mono text-[9px] tracking-[0.2em] text-vermillion uppercase block mb-2">
            PALACE EXAMINATION
          </span>
          <h1 className="font-calli text-[52px] text-gold-glow tracking-[0.22em] leading-tight">
            {"金鸾殿 · 三鼎甲"}
          </h1>
          <p className="font-mono text-[10px] text-bone-mute tracking-[0.1em] mt-2">
            {result.state.world.year}{"年"} {"·"} {result.state.world.era === "prosperity" ? "盛世" : result.state.world.era === "decline" ? "衰世" : result.state.world.era === "invasion" ? "乱世" : "中兴"}
          </p>
        </motion.div>

        {/* Main content: ranking + emperor panel */}
        <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
          {/* Ranking list */}
          <div className="flex flex-col gap-3">
            {ranking.map((entry: RankingEntry, idx: number) => {
              const isPlayer = entry.name === result.state.character.name;
              const delays = [0.05, 0.25, 0.45, 0.65];

              return (
                <motion.div
                  key={entry.name}
                  className={`relative flex items-center gap-4 p-4 border ${
                    isPlayer
                      ? "border-gold-dim bg-[rgba(212,175,55,0.08)] shadow-[0_0_20px_rgba(212,175,55,0.15)]"
                      : "border-hairline bg-paper-1"
                  }`}
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: delays[idx] ?? 0.65, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  {/* Vermillion left marker for player */}
                  {isPlayer && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-vermillion" />
                  )}

                  {/* Rank number */}
                  <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center">
                    <span className="font-calli text-[28px] text-gold-dim">
                      {RANK_LABELS[idx] ?? String(entry.rank)}
                    </span>
                  </div>

                  {/* Title */}
                  <div className="flex-shrink-0 w-16 text-center">
                    <span className={`font-calli text-[22px] ${TITLE_COLORS[entry.title] ?? "text-bone"}`}>
                      {entry.title}
                    </span>
                  </div>

                  {/* Name + answer summary */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-serif text-base text-bone tracking-[0.04em]">
                        {entry.name}
                      </span>
                      {isPlayer && (
                        <span className="px-1.5 py-0.5 bg-vermillion/20 border border-vermillion/40 font-mono text-[8px] text-vermillion tracking-[0.12em] uppercase">
                          {"本家 · You"}
                        </span>
                      )}
                    </div>
                    {/* Show rival answer summary if available */}
                    {!isPlayer && result.ranking && (
                      <p className="font-serif text-xs text-bone-mute tracking-[0.02em] mt-0.5 truncate">
                        {getRivalSummary(entry.name, result)}
                      </p>
                    )}
                  </div>

                  {/* Score */}
                  <div className="flex-shrink-0 text-right">
                    <span className="font-mono text-sm text-bone-mute tracking-[0.06em]">
                      {entry.score}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Emperor commentary panel */}
          <motion.div
            className="relative p-6 border border-hairline bg-paper-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.5 }}
          >
            {/* Watermark */}
            <span
              className="absolute top-4 right-4 font-calli text-[52px] text-vermillion pointer-events-none select-none"
              style={{ opacity: 0.18 }}
              aria-hidden="true"
            >
              {"御"}
            </span>

            {/* Label */}
            <span className="font-mono text-[9px] tracking-[0.18em] text-bone-mute uppercase block mb-2">
              IMPERIAL COMMENTARY
            </span>

            {/* Title */}
            <h2 className="font-calli text-[36px] text-gold-dim tracking-[0.12em] mb-4">
              {"御评"}
            </h2>

            {/* Quote */}
            <div className="border-l-2 border-vermillion pl-3 mb-6">
              <p className="font-serif text-sm text-bone leading-[1.85] tracking-[0.04em]">
                {narration}
              </p>
            </div>

            {/* Judge narrative if available */}
            {result.judgeNarrative && (
              <p className="font-serif text-xs text-bone-mute italic tracking-[0.04em] mb-4">
                {"考官评语："}{result.judgeNarrative}
              </p>
            )}

            {/* Victory tier badge */}
            {victoryTier && (
              <div className="mt-4 p-3 border border-gold-dim bg-[rgba(212,175,55,0.05)]">
                <span className="font-mono text-[9px] tracking-[0.12em] text-gold-dim uppercase block mb-1">
                  VICTORY
                </span>
                <span className="font-calli text-lg text-gold-glow tracking-[0.08em]">
                  {TIER_LABELS[victoryTier] ?? victoryTier}
                </span>
              </div>
            )}

            {/* Seal */}
            <div className="mt-6 flex justify-end">
              <SealStamp text={"欲"} size="sm" />
            </div>
          </motion.div>
        </div>

        {/* Footer actions */}
        <motion.div
          className="flex items-center gap-4 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.4 }}
        >
          <button
            type="button"
            disabled={isNavigating}
            onClick={() => startNavigation(async () => {
              // Record victory to leaderboard if there's a victory tier
              if (result.victoryTier) {
                const { dynasty, character } = result.state;
                const highTitle = character.titles.includes("状元") ? "状元" : "进士";
                const score = calculateScore(highTitle, result.victoryTier, dynasty.total_generations);

                await recordScore(dynasty.family_name, result.victoryTier, highTitle, dynasty.total_generations, score);

                sessionStorage.setItem("dynasty_summary", JSON.stringify({
                  familyName: dynasty.family_name,
                  tier: result.victoryTier,
                  highestTitle: highTitle,
                  generations: dynasty.total_generations,
                  score,
                }));

                // Clear game save on victory
                sessionStorage.removeItem("game_state");
              }

              sessionStorage.removeItem("palace_result");
              router.push("/leaderboard");
            })}
            className="px-6 py-2.5 border border-hairline bg-paper-2 font-serif text-sm text-bone tracking-[0.12em] hover:border-gold-dim transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {"衣锦还乡"}
          </button>
          <button
            type="button"
            disabled={isNavigating}
            onClick={() => startNavigation(async () => {
              const currentSaveId = getSaveId();
              if (!currentSaveId) return;
              const heirsResult = await generateHeirsAction(currentSaveId, "victory");

              if (heirsResult.gameOver) {
                const { dynasty, character } = result.state;
                const highTitle = highestTitleOf(character.titles);
                const tier = result.victoryTier ?? "F";
                const score = calculateScore(highTitle, tier, dynasty.total_generations);

                await recordScore(dynasty.family_name, tier, highTitle, dynasty.total_generations, score);

                sessionStorage.setItem("dynasty_summary", JSON.stringify({
                  familyName: dynasty.family_name,
                  tier,
                  highestTitle: highTitle,
                  generations: dynasty.total_generations,
                  score,
                }));
                sessionStorage.removeItem("game_state");
                sessionStorage.removeItem("palace_result");
                router.push("/leaderboard");
                return;
              }

              sessionStorage.setItem("inheritance_data", JSON.stringify({
                state: result.state,
                heirs: heirsResult.heirs,
                legacyTokens: heirsResult.legacyTokens,
                blessingPoints: heirsResult.blessingPoints,
                isAdoption: heirsResult.isAdoption,
                deathReason: heirsResult.deathReason,
              }));
              sessionStorage.removeItem("palace_result");
              router.push("/inherit");
            })}
            className="px-6 py-2.5 bg-gradient-to-b from-vermillion to-vermillion-deep text-bone border border-vermillion-deep font-serif text-sm tracking-[0.22em] transition-all duration-200 disabled:opacity-50 disabled:cursor-wait"
          >
            {"传之后世"}
          </button>
        </motion.div>
      </div>
    </>
  );
}

/** Extract rival answer summary from the palace result data stored in sessionStorage */
function getRivalSummary(rivalName: string, result: PalaceExamResult): string {
  // The rivals data is stored in the exam_history entry
  const palaceExam = result.state.character.exam_history.find(
    (e) => e.level === "palace" && e.rivals
  );
  if (!palaceExam?.rivals) return "";
  const rival = palaceExam.rivals.find((r) => r.name === rivalName);
  return rival ? "" : "";
}
