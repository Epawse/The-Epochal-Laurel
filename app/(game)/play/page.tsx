"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/game/TopBar";
import { StatPanel } from "@/components/game/StatPanel";
import { ActionCard } from "@/components/game/ActionCard";
import { NarrativeStrip } from "@/components/game/NarrativeStrip";
import { CourtHint } from "@/components/game/CourtHint";
import { EventModal } from "@/components/game/EventModal";
import { SchemeExposureOverlay } from "@/components/game/SchemeExposureOverlay";
import { ErrorToast } from "@/components/ui/ErrorToast";
import { ACTIONS, highestTitleOf, EXAM_REQUIREMENTS, type ExamLevel } from "@/lib/game/constants";
import { ERA_LABELS } from "@/lib/game/display";
import type { GameState, StatChanges } from "@/lib/game/schema";
import { advanceTurn, submitEventChoice, submitEventFreeInput, generateHeirsAction } from "@/lib/actions/game";
import { recordScore } from "@/lib/actions/leaderboard";
import { calculateScore } from "@/lib/game/scoring";
import { removeSessionJSON, setSessionJSON, useSessionJSON } from "@/hooks/useSessionJSON";
import { getSaveId } from "@/lib/client/saveId";

const ACTION_ICONS: Record<string, string> = {
  study: "/assets/action-study.png",
  socialize: "/assets/action-socialize.png",
  earn: "/assets/action-earn.png",
  rest: "/assets/action-rest.png",
  scheme: "/assets/action-scheme.png",
};

const SEASON_LABELS: Record<string, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

function getPortraitSrc(age: number): string {
  if (age >= 55) return "/assets/scholar-old.png";
  if (age >= 35) return "/assets/scholar-middle.png";
  return "/assets/scholar-young.png";
}

interface ExamStatus {
  label: string;
  seasons: number;
  locked: boolean;
  lockReason: string | null;
}

function getExamStatus(
  examSchedule: { next_county: number; next_provincial: number; next_metropolitan: number },
  titles: string[],
  erudition: number,
  statusEffects: Array<{ type: string; turns_remaining: number }>
): ExamStatus {
  const levels: Array<{ level: ExamLevel; label: string; seasons: number }> = [
    { level: "county", label: "童试", seasons: examSchedule.next_county },
    { level: "provincial", label: "乡试", seasons: examSchedule.next_provincial },
    { level: "metropolitan", label: "会试", seasons: examSchedule.next_metropolitan },
    { level: "palace", label: "殿试", seasons: 0 },
  ];

  // Find the highest exam level the player qualifies for by title progression
  let target = levels[0];
  if (titles.includes("贡士")) target = levels[3];
  else if (titles.includes("举人")) target = levels[2];
  else if (titles.includes("秀才")) target = levels[1];

  // Check for exam ban
  const banned = statusEffects.some((e) => e.type === "exam_ban");
  if (banned) {
    return { label: target.label, seasons: target.seasons, locked: true, lockReason: "禁考中" };
  }

  // Check erudition requirement
  const req = EXAM_REQUIREMENTS[target.level];
  if (erudition < req.min_erudition) {
    return { label: target.label, seasons: target.seasons, locked: true, lockReason: `学识不足 (需${req.min_erudition})` };
  }

  return { label: target.label, seasons: target.seasons, locked: false, lockReason: null };
}

export default function PlayPage() {
  const router = useRouter();
  const persisted = useSessionJSON<GameState>("game_state");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [saveId] = useState<string | null>(() => getSaveId());
  const [deltas, setDeltas] = useState<Partial<StatChanges>>({});
  const [narration, setNarration] = useState(
    "新的一天开始了。准备好踏上科举之路吧。"
  );
  const [isPending, startTransition] = useTransition();
  const [schemeExposed, setSchemeExposed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentGameState = gameState ?? persisted;

  useEffect(() => {
    if (gameState) {
      setSessionJSON("game_state", gameState);
    }
  }, [gameState]);

  // If no game state, show loading/redirect message
  if (!currentGameState) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="font-serif text-lg text-bone-mute tracking-[0.18em]">
          尚未开始游戏
        </p>
        <a
          href="/create"
          className="px-6 py-2.5 bg-paper-2 border border-hairline font-serif text-bone tracking-[0.12em] hover:border-gold-dim transition-colors"
        >
          前往创建角色
        </a>
      </div>
    );
  }

  const { character, world, dynasty } = currentGameState;
  const highestTitle = highestTitleOf(character.titles);
  const portraitSrc = getPortraitSrc(character.age);
  const isDanger = character.stats.drive <= 25;
  const nextExam = getExamStatus(world.exam_schedule, character.titles, character.stats.erudition, character.status_effects);
  const isInvasion = world.era === "invasion";
  const hasEvent = currentGameState.current_event !== null;

  function handleAction(actionId: string) {
    if (!currentGameState || !saveId || isPending) return;

    startTransition(async () => {
      setError(null);
      try {
        const result = await advanceTurn(saveId, actionId);
        setGameState(result.state);
        setDeltas(result.statChanges);

        // Show NPC dialogue if available, otherwise show action narration
        if (result.npcDialogue) {
          setNarration(result.npcDialogue);
        } else {
          setNarration(result.narration);
        }

        // Detect scheme exposure
        if (result.narration.includes("东窗事发") || result.narration.includes("败露")) {
          setSchemeExposed(true);
          setTimeout(() => setSchemeExposed(false), 2500);
        }

        // Clear deltas after animation
        setTimeout(() => setDeltas({}), 1500);

        // Death detection — trigger inheritance
        if (result.characterDied && result.deathReason) {
          // Brief delay to show the death narration before transitioning
          setTimeout(async () => {
            const heirsResult = await generateHeirsAction(saveId, result.deathReason!);

            if (heirsResult.gameOver) {
              // Family line dies out — game over (F tier)
              const { dynasty: dyn, character: char } = result.state;
              const highTitle = highestTitleOf(char.titles);
              const tier = "F";
              const score = calculateScore(highTitle, tier, dyn.total_generations);

              // Record to leaderboard
              await recordScore(dyn.family_name, tier, highTitle, dyn.total_generations, score);

              // Set dynasty summary for leaderboard display
              setSessionJSON("dynasty_summary", {
                familyName: dyn.family_name,
                tier,
                highestTitle: highTitle,
                generations: dyn.total_generations,
                score,
              });

              // Clear the game save
              removeSessionJSON("game_state");

              router.push("/leaderboard");
              return;
            }

            // Store inheritance data and navigate to inherit page
            setSessionJSON("inheritance_data", {
              state: result.state,
              heirs: heirsResult.heirs,
              legacyTokens: heirsResult.legacyTokens,
              blessingPoints: heirsResult.blessingPoints,
              isAdoption: heirsResult.isAdoption,
              deathReason: heirsResult.deathReason,
            });
            router.push("/inherit");
          }, 1500);
        }
      } catch (e) {
        console.warn("Failed to advance turn:", e);
        setError("暂时无法保存本回合，请稍后重试。");
      }
    });
  }

  function handleEventChoice(choiceId: string) {
    if (!currentGameState || !saveId || isPending) return;

    startTransition(async () => {
      setError(null);
      try {
        const result = await submitEventChoice(saveId, choiceId);
        setGameState(result.state);
        setNarration(result.narration);
      } catch (e) {
        console.warn("Failed to submit event choice:", e);
        setError("暂时无法处理事件选择，请稍后重试。");
      }
    });
  }

  function handleEventFreeInput(text: string) {
    if (!currentGameState || !saveId || isPending) return;

    startTransition(async () => {
      setError(null);
      try {
        const result = await submitEventFreeInput(saveId, text);
        setGameState(result.state);
        setNarration(result.narration);
      } catch (e) {
        console.warn("Failed to submit event free input:", e);
        setError("暂时无法处理事件输入，请稍后重试。");
      }
    });
  }

  function handleEventClose() {
    // Events cannot be dismissed without making a choice — no-op
  }

  return (
    <>
      {error && (
        <ErrorToast
          message={error}
          duration={0}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Era-conditional background */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat opacity-[0.08]"
        style={{
          backgroundImage: `url(${isInvasion ? "/assets/study-room--invasion.png" : "/assets/study-room.png"})`,
        }}
        aria-hidden="true"
      />

      <TopBar
        season={world.season}
        year={world.year}
        era={world.era}
        characterName={character.name}
        title={highestTitle}
        age={character.age}
        generation={character.generation}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[300px_1fr_300px] 2xl:grid-cols-[320px_1fr_320px] gap-4 md:gap-6 flex-1 min-h-0">
        {/* Left Panel — Stats */}
        <aside className="flex flex-col gap-4">
          <div className={isDanger ? "grayscale-[0.6]" : ""}>
            <StatPanel
              portraitSrc={portraitSrc}
              name={character.name}
              age={character.age}
              stats={character.stats}
              deltas={deltas}
            />
          </div>

          {/* Drive danger warning */}
          {isDanger && (
            <div className="px-3 py-2.5 border border-vermillion bg-[rgba(196,57,44,0.08)] animate-[danger-pulse_2s_ease-in-out_infinite]">
              <p className="font-serif text-xs text-vermillion tracking-[0.06em] leading-relaxed">
                心力将竭，若不休养，恐将油尽灯枯...
              </p>
            </div>
          )}

          {/* Counter-Fate Tools (display only) */}
          <div className="border border-dashed border-hairline p-3 opacity-50 hidden md:block">
            <span className="font-mono text-[9px] tracking-[0.18em] text-bone-mute uppercase block mb-2">
              辅助
            </span>
            <div className="flex flex-col gap-1.5 font-serif text-xs text-bone-mute tracking-[0.04em]">
              <span>小抄/夹带</span>
              <span>榜眼引路</span>
              <span>恩师引荐</span>
            </div>
          </div>
        </aside>

        {/* Center — Actions + Narrative */}
        <main className="flex flex-col gap-4 min-w-0">
          {/* Action cards grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 md:gap-3">
            {ACTIONS.map((action) => (
              <ActionCard
                key={action.id}
                action={action}
                iconSrc={ACTION_ICONS[action.id] ?? "/assets/action-study.png"}
                disabled={isPending || hasEvent}
                onClick={() => handleAction(action.id)}
              />
            ))}
          </div>

          {/* Narrative strip */}
          <NarrativeStrip
            text={narration}
            timestamp={`${SEASON_LABELS[world.season]} · 第${world.year}年`}
          />
        </main>

        {/* Right Panel — Status */}
        <aside className="flex flex-col gap-4 md:gap-5 lg:col-span-2 xl:col-span-1 xl:col-start-auto md:grid md:grid-cols-3 xl:flex xl:flex-col">
          {/* Title display */}
          <div className="border border-hairline p-4 bg-paper-1">
            <span className="font-mono text-[9px] tracking-[0.18em] text-bone-mute uppercase block mb-2">
              功名
            </span>
            <span className="font-calli text-[28px] text-gold-glow tracking-[0.22em]">
              {highestTitle}
            </span>
            <span className="block font-mono text-[10px] text-bone-mute tracking-[0.08em] mt-1">
              {dynasty.family_name}氏 · 第{character.generation}世
            </span>
          </div>

          {/* Exam countdown */}
          <div className="border border-hairline p-4 bg-paper-1">
            <span className="font-mono text-[9px] tracking-[0.18em] text-bone-mute uppercase block mb-2">
              下场科试
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-base text-bone tracking-[0.08em]">
                {nextExam.label}
              </span>
              <span className="font-mono text-xs text-gold-dim tracking-[0.06em]">
                {nextExam.locked ? nextExam.lockReason : nextExam.seasons > 0 ? `${nextExam.seasons}季后` : "已开放"}
              </span>
            </div>
            <button
              type="button"
              disabled={nextExam.seasons > 0 || nextExam.locked || hasEvent}
              onClick={() => router.push("/play/exam")}
              className="mt-3 w-full px-4 py-2.5 bg-gradient-to-b from-vermillion to-vermillion-deep text-bone border border-vermillion-deep font-serif text-sm tracking-[0.22em] transition-all duration-200 disabled:bg-paper-2 disabled:border-hairline disabled:text-bone-mute disabled:cursor-not-allowed disabled:bg-none"
              aria-label="参加考试"
            >
              参加考试
            </button>
          </div>

          {/* Era display */}
          <div className="border border-hairline p-4 bg-paper-1">
            <span className="font-mono text-[9px] tracking-[0.18em] text-bone-mute uppercase block mb-2">
              世道
            </span>
            <span className="font-serif text-base text-bone tracking-[0.12em]">
              {ERA_LABELS[world.era]}
            </span>
            <span className="block font-mono text-[10px] text-bone-mute tracking-[0.08em] mt-1">
              {world.era_year}年目
            </span>
          </div>

          {/* Court hints */}
          <div className="border border-hairline p-4 bg-paper-1 flex flex-col gap-3">
            <span className="font-mono text-[9px] tracking-[0.18em] text-bone-mute uppercase block">
              圣意风向
            </span>
            <CourtHint
              label="文风"
              state={world.court_whims_revealed.style_known ? "full" : "hidden"}
              value={world.court_whims.style}
            />
            <CourtHint
              label="性情"
              state={world.court_whims_revealed.temperament_known}
              value={world.court_whims.emperor_temperament}
              eliminated={world.court_whims_revealed.temperament_eliminated}
            />
          </div>
        </aside>
      </div>

      {/* Scheme Exposure Overlay */}
      {schemeExposed && <SchemeExposureOverlay />}

      {/* Event Modal Overlay */}
      {hasEvent && currentGameState.current_event && (
        <EventModal
          event={currentGameState.current_event}
          onChoice={handleEventChoice}
          onFreeInput={handleEventFreeInput}
          onClose={handleEventClose}
          disabled={isPending}
        />
      )}
    </>
  );
}
