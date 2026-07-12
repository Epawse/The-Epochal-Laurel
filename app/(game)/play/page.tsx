"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TopBar } from "@/components/game/TopBar";
import { StatPanel } from "@/components/game/StatPanel";
import { ActionCard } from "@/components/game/ActionCard";
import { NarrativeTimeline } from "@/components/game/NarrativeTimeline";
import { HoldingsPanel } from "@/components/game/HoldingsPanel";
import { CourtHint } from "@/components/game/CourtHint";
import { EventModal } from "@/components/game/EventModal";
import { RelicDraftModal } from "@/components/game/RelicDraftModal";
import { SchemeExposureOverlay } from "@/components/game/SchemeExposureOverlay";
import { ErrorToast } from "@/components/ui/ErrorToast";
import { ACTIONS, highestTitleOf, EXAM_REQUIREMENTS, type ExamLevel } from "@/lib/game/constants";
import { ERA_LABELS } from "@/lib/game/display";
import type { GameState, StatChanges } from "@/lib/game/schema";
import {
  advanceTurn,
  generateEventForTurn,
  generateNpcDialogueForTurn,
  prefetchEvents,
  chooseRelicDraft as chooseRelicDraftAction,
  openMerchantShop,
  submitEventChoice,
  submitEventFreeInput,
  generateHeirsAction,
} from "@/lib/actions/game";
import { recordScore } from "@/lib/actions/leaderboard";
import { calculateScore } from "@/lib/game/scoring";
import { removeSessionJSON, setSessionJSON, useSessionJSON } from "@/hooks/useSessionJSON";
import {
  appendEntry,
  makeEntryId,
  replacePendingEntry,
  type NarrativeEntry,
} from "@/lib/game/narrativeLog";
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

function seasonLabel(world: { season: string; year: number }): string {
  return `${SEASON_LABELS[world.season] ?? world.season} · 第${world.year}年`;
}

function formatRoll(roll: { natural: number; modifier: number; total: number; tier: string } | null | undefined): {
  text: string;
  dice?: string;
} {
  if (!roll) return { text: "" };
  const mod = roll.modifier >= 0 ? `+${roll.modifier}` : `${roll.modifier}`;
  return {
    text: ` 掷骰 ${roll.natural}${mod}=${roll.total}。`,
    dice: DICE_TIER_LABELS[roll.tier] ?? roll.tier,
  };
}

const DICE_TIER_LABELS: Record<string, string> = {
  crit_success: "大吉",
  success: "得手",
  fail: "失手",
  crit_fail: "大凶",
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
  const narrativeLog = useSessionJSON<NarrativeEntry[]>("narrative_log");
  // Synchronous mirror of the log so async follow-ups append against the latest
  // value before the sessionStorage notification round-trips back through
  // useSessionJSON. The render reads the store (narrativeLog); writes go through
  // setSessionJSON (notifies subscribers) and also update this ref. Synced from
  // the store in an effect (not during render) to satisfy react-hooks/refs.
  const logRef = useRef<NarrativeEntry[]>([]);
  const [, startTransition] = useTransition();
  const [schemeExposed, setSchemeExposed] = useState(false);
  const [turnPending, setTurnPending] = useState(false);
  // followupPending gates only the legacy "AI 润色中" hint, now superseded by
  // pending timeline entries; the setter is kept as a harmless no-op marker so the
  // follow-up control flow reads the same as before.
  const [, setFollowupPending] = useState(false);
  // True between a turn flagging a pending event and generateEventForTurn filling
  // it — drives the EventModal's diegetic loading shell.
  const [eventPending, setEventPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards background prefetch overlap: only one prefetchEvents request in flight
  // at a time (each settle/resolve would otherwise stack lookahead bursts).
  const prefetchInFlight = useRef(false);
  // Id of the timeline entry for the currently-open event, so its resolution
  // (handleEventChoice / handleEventFreeInput) updates the same beat in place
  // instead of duplicating the event in the log.
  const eventEntryIdRef = useRef<string | null>(null);
  const currentGameState = gameState ?? persisted;

  // Write-through log mutators. Each computes from the synchronous mirror (falling
  // back to the rendered store value before the sync effect first runs), updates
  // the mirror, and persists via setSessionJSON (which re-renders the timeline
  // through useSessionJSON). Pure list logic lives in narrativeLog.ts.
  function currentLog(): NarrativeEntry[] {
    return logRef.current.length > 0 ? logRef.current : narrativeLog ?? [];
  }
  function pushLog(entry: NarrativeEntry) {
    const next = appendEntry(currentLog(), entry);
    logRef.current = next;
    setSessionJSON("narrative_log", next);
  }
  function settleLog(id: string, settled: NarrativeEntry) {
    const next = replacePendingEntry(currentLog(), id, settled);
    logRef.current = next;
    setSessionJSON("narrative_log", next);
  }

  useEffect(() => {
    if (gameState) {
      setSessionJSON("game_state", gameState);
    }
  }, [gameState]);

  // Keep the synchronous log mirror in step with the store (including cross-page
  // writes from the exam/inherit screens that land while this page is mounted).
  useEffect(() => {
    if (narrativeLog) {
      logRef.current = narrativeLog;
    }
  }, [narrativeLog]);

  const isBusy = turnPending || eventPending;

  // Initial-load prefetch: warm lookahead events once a save+state exist
  // and the player is idle (no event/relic modal). Fires at most once per mount;
  // later refills happen at turn-settle / event-resolve. Inlined here (not via
  // firePrefetch, which is defined after the early return) to keep hook order
  // valid; shares the same in-flight ref so it can't overlap a settle prefetch.
  const initialPrefetchDone = useRef(false);
  useEffect(() => {
    if (initialPrefetchDone.current) return;
    if (!saveId || !currentGameState) return;
    if (
      currentGameState.current_event ||
      currentGameState.pending_event_type ||
      currentGameState.pending_relic_draft
    ) {
      return;
    }
    if (prefetchInFlight.current) return;
    initialPrefetchDone.current = true;
    prefetchInFlight.current = true;
    void prefetchEvents(saveId)
      .catch((e) => {
        console.warn("Failed to prefetch events:", e);
      })
      .finally(() => {
        prefetchInFlight.current = false;
      });
  }, [saveId, currentGameState]);

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
  const hasRelicDraft = currentGameState.pending_relic_draft !== null;

  // Background lookahead trigger. Fired (non-blocking, never throwing into render)
  // at safe points where the player is between turns and no modal is open:
  // initial load, after a turn settles, and after an event resolves. Skips while
  // any event/relic modal is open or pending. The server save is the source of
  // truth for the action-aware cache — generateEventForTurn reads it; the client
  // never mirrors event_cache.
  function firePrefetch(state: GameState) {
    if (!saveId) return;
    if (prefetchInFlight.current) return;
    if (state.current_event || state.pending_event_type || state.pending_relic_draft) {
      return;
    }
    prefetchInFlight.current = true;
    void prefetchEvents(saveId)
      .catch((e) => {
        console.warn("Failed to prefetch events:", e);
      })
      .finally(() => {
        prefetchInFlight.current = false;
      });
  }

  function handleAction(actionId: string) {
    if (!currentGameState || !saveId || isBusy) return;

    startTransition(async () => {
      setTurnPending(true);
      setError(null);
      try {
        const result = await advanceTurn(saveId, actionId);
        // Engine result is authoritative and arrives with NO LLM on the critical
        // path — apply stat deltas + narration instantly.
        setGameState(result.state);
        setDeltas(result.statChanges);

        const season = seasonLabel(result.state.world);

        // Routine action beat — compact single line. Scheme exposure / other
        // engine narration rides in the action text.
        pushLog({
          id: makeEntryId("act"),
          kind: "action",
          season,
          text: result.narration,
          actionId,
          status: "settled",
        });

        // Immediate (cache-warm) NPC dialogue lands as a rich 言谈 beat. A pending
        // dialogue queues a shimmer entry below, settled by the follow-up.
        const npcEntryId = makeEntryId("npc");
        if (result.npcDialogue) {
          pushLog({
            id: npcEntryId,
            kind: "npc",
            season,
            text: result.npcDialogue,
            status: "settled",
          });
        } else if (result.pendingNpcDialogue) {
          pushLog({
            id: npcEntryId,
            kind: "pending",
            season,
            text: "故人正与你攀谈…",
            status: "pending",
          });
        }

        // Detect scheme exposure
        if (result.narration.includes("东窗事发") || result.narration.includes("败露")) {
          setSchemeExposed(true);
          setTimeout(() => setSchemeExposed(false), 2500);
        }

        // Clear deltas after animation
        setTimeout(() => setDeltas({}), 1500);

        const settledState = result.state;

        const shouldGenerateEvent =
          result.eventTrigger &&
          !result.characterDied &&
          !settledState.current_event;

        // Pending event: drop a shimmer placeholder at the foot of the log and
        // remember its id so generateEventForTurn can settle it in place.
        const eventEntryId = makeEntryId("evt");
        if (shouldGenerateEvent) {
          setEventPending(true);
          eventEntryIdRef.current = eventEntryId;
          pushLog({
            id: eventEntryId,
            kind: "pending",
            season,
            text: "一桩事正在酝酿…",
            status: "pending",
          });
        }

        setTurnPending(false);

        // AI follow-ups continue outside the main action pending state. A cache hit
        // fills the event modal quickly; a miss keeps the diegetic event shell open
        // without making ordinary turn feedback feel frozen.
        if (result.pendingNpcDialogue || shouldGenerateEvent) {
          setFollowupPending(true);
          void (async () => {
            let followupState = settledState;
            try {
              // Pending event: open the modal in its loading shell immediately,
              // then fetch the AI event. `eventTrigger` is set while
              // `current_event` is still null + pending markers are stamped.
              if (shouldGenerateEvent) {
                try {
                  const eventResult = await generateEventForTurn(saveId);
                  followupState = eventResult.state;
                  setGameState(eventResult.state);
                  // Settle the shimmer into an event summary beat. The full event
                  // (description + choices) lives in EventModal; the timeline only
                  // carries title + a one-line "事降临" so it isn't duplicated.
                  const ev = eventResult.state.current_event;
                  settleLog(eventEntryId, {
                    id: eventEntryId,
                    kind: "event",
                    season: seasonLabel(eventResult.state.world),
                    title: ev?.title,
                    text: "一桩事降临，且看如何应对。",
                    status: "settled",
                  });
                } catch (eventErr) {
                  // generateEvent self-falls-back to a static event and never
                  // throws, so reaching here means a transport/save failure.
                  console.warn("Failed to generate turn event:", eventErr);
                  setError("暂时无法呈现这桩事，请稍后重试。");
                  eventEntryIdRef.current = null;
                  settleLog(eventEntryId, {
                    id: eventEntryId,
                    kind: "event",
                    season,
                    text: "一桩事未能呈现，稍后再议。",
                    status: "settled",
                  });
                } finally {
                  setEventPending(false);
                }
              }

              if (result.pendingNpcDialogue) {
                try {
                  const dialogueResult = await generateNpcDialogueForTurn(saveId);
                  followupState = dialogueResult.state;
                  setGameState(dialogueResult.state);
                  if (dialogueResult.dialogue) {
                    settleLog(npcEntryId, {
                      id: npcEntryId,
                      kind: "npc",
                      season: seasonLabel(dialogueResult.state.world),
                      text: dialogueResult.dialogue,
                      status: "settled",
                    });
                  }
                } catch (dialogueErr) {
                  console.warn("Failed to generate NPC dialogue:", dialogueErr);
                }
              }

              if (!result.characterDied) {
                firePrefetch(followupState);
              }
            } finally {
              setFollowupPending(false);
            }
          })();
        } else if (!result.characterDied) {
          firePrefetch(settledState);
        }

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
        setEventPending(false);
        setTurnPending(false);
      }
    });
  }

  function handleEventChoice(choiceId: string) {
    if (!currentGameState || !saveId || isBusy) return;

    startTransition(async () => {
      setError(null);
      try {
        const result = await submitEventChoice(saveId, choiceId);
        setGameState(result.state);
        setDeltas(result.statChanges);
        const roll = formatRoll(result.roll);
        const draftText = result.relicDraft ? " 眼前又现三件奇物。" : "";
        // Update the event beat in place with the resolution outcome (dice tier +
        // stat delta), preserving the event title from when it was generated.
        const id = eventEntryIdRef.current ?? makeEntryId("evt");
        const prevTitle = currentLog().find((e) => e.id === id)?.title;
        settleLog(id, {
          id,
          kind: "event",
          season: seasonLabel(result.state.world),
          title: prevTitle,
          text: `${result.narration}${roll.text}${draftText}`,
          dice: roll.dice,
          delta: result.statChanges,
          status: "settled",
        });
        eventEntryIdRef.current = null;
        setTimeout(() => setDeltas({}), 1500);
        // Event resolved — refill the cache (a relic draft, if any, makes
        // firePrefetch skip until that modal is also cleared).
        firePrefetch(result.state);
      } catch (e) {
        console.warn("Failed to submit event choice:", e);
        setError("暂时无法处理事件选择，请稍后重试。");
      }
    });
  }

  function handleEventFreeInput(text: string) {
    if (!currentGameState || !saveId || isBusy) return;

    startTransition(async () => {
      setError(null);
      try {
        const result = await submitEventFreeInput(saveId, text);
        setGameState(result.state);
        const id = eventEntryIdRef.current ?? makeEntryId("evt");
        const prevTitle = currentLog().find((e) => e.id === id)?.title;
        settleLog(id, {
          id,
          kind: "event",
          season: seasonLabel(result.state.world),
          title: prevTitle,
          text: result.narration,
          status: "settled",
        });
        eventEntryIdRef.current = null;
        // Event resolved — refill the cache for the next turn's think-time.
        firePrefetch(result.state);
      } catch (e) {
        console.warn("Failed to submit event free input:", e);
        setError("暂时无法处理事件输入，请稍后重试。");
      }
    });
  }

  function handleEventClose() {
    // Events cannot be dismissed without making a choice — no-op
  }

  function handleOpenMerchantShop() {
    if (!currentGameState || !saveId || isBusy || hasEvent || hasRelicDraft) return;

    startTransition(async () => {
      setError(null);
      try {
        const result = await openMerchantShop(saveId);
        setGameState(result.state);
        pushLog({
          id: makeEntryId("shop"),
          kind: "action",
          season: seasonLabel(result.state.world),
          text: result.message,
          status: "settled",
        });
      } catch (e) {
        console.warn("Failed to open merchant shop:", e);
        setError("暂时无法打开钱庄，请稍后重试。");
      }
    });
  }

  function handleRelicChoice(relicId: string) {
    if (!currentGameState || !saveId || isBusy || !hasRelicDraft) return;

    startTransition(async () => {
      setError(null);
      try {
        const result = await chooseRelicDraftAction(saveId, relicId);
        setGameState(result.state);
        pushLog({
          id: makeEntryId("relic"),
          kind: "event",
          season: seasonLabel(result.state.world),
          title: "奇物入手",
          text: result.message,
          status: "settled",
        });
      } catch (e) {
        console.warn("Failed to choose relic:", e);
        setError("暂时无法选择奇物，请稍后重试。");
      }
    });
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

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] xl:grid-cols-[300px_1fr_300px] 2xl:grid-cols-[320px_1fr_320px] gap-4 md:gap-6 flex-1 min-h-0 items-stretch">
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

          {/* Holdings & buffs — relics / skills / modifiers / status / traits /
              world modifiers, plus the merchant-shop CTA. Pure read of GameState.
              Grows to fill the column so all three columns bottom-align. */}
          <HoldingsPanel
            character={character}
            world={world}
            onOpenShop={handleOpenMerchantShop}
            shopDisabled={isBusy || hasEvent || hasRelicDraft}
          />

          {/* The cheat-sheet / 榜眼 / 恩师 aids live on the exam screen, not here. */}
          <p className="mt-auto hidden md:block font-mono text-[9px] tracking-[0.1em] text-bone-mute leading-relaxed">
            科场另备小抄 · 榜眼 · 恩师
          </p>
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
                disabled={isBusy || hasEvent || hasRelicDraft}
                onClick={() => handleAction(action.id)}
              />
            ))}
          </div>

          {/* Narrative timeline — scrollable, session-accumulated story log.
              Newest at the bottom, history scrolls up; AI follow-ups land as
              shimmer entries that settle in place (see NarrativeTimeline). */}
          <NarrativeTimeline entries={narrativeLog ?? []} />

          {/* Liveness indicator — the synchronous engine moment before any beat
              lands. AI follow-ups (event/NPC) surface as pending entries in the
              timeline itself, so this only covers "推演中…". Fixed height +
              opacity-only animation avoids layout shift. */}
          <div className="h-[18px] flex items-center" aria-live="polite">
            <AnimatePresence>
              {turnPending && (
                <motion.span
                  key="advancing"
                  className="inline-flex items-center gap-2 font-mono text-[10px] tracking-[0.18em] text-gold-dim uppercase"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-gold-dim animate-[danger-pulse_1.4s_ease-in-out_infinite]" />
                  推演中…
                </motion.span>
              )}
            </AnimatePresence>
          </div>
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
              disabled={nextExam.seasons > 0 || nextExam.locked || hasEvent || hasRelicDraft}
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

          {/* Court hints — grows to the bottom on the 3-column desktop layout so
              the right column reaches the same baseline as the others. */}
          <div className="border border-hairline p-4 bg-paper-1 flex flex-col gap-3 xl:flex-1">
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

      {/* Event Modal Overlay — opens in a loading shell the instant a turn flags
          a pending event, then fills once generateEventForTurn returns. */}
      {(hasEvent || eventPending) && (
        <EventModal
          event={currentGameState.current_event}
          loading={eventPending && !hasEvent}
          onChoice={handleEventChoice}
          onFreeInput={handleEventFreeInput}
          onClose={handleEventClose}
          disabled={isBusy}
        />
      )}

      {hasRelicDraft && currentGameState.pending_relic_draft && (
        <RelicDraftModal
          draft={currentGameState.pending_relic_draft}
          onChoose={handleRelicChoice}
          disabled={isBusy}
        />
      )}
    </>
  );
}
