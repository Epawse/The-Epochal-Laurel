"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScrollFramePanel } from "@/components/ui/ScrollFramePanel";
import { ExamChoice } from "@/components/game/ExamChoice";
import { ResultOverlay } from "@/components/game/ResultOverlay";
import { ErrorToast } from "@/components/ui/ErrorToast";
import { getExamQuestion, submitExamAnswer, submitPalaceExam, applyToolAction } from "@/lib/actions/game";
import type { GameState } from "@/lib/game/schema";
import type { ExamLevel } from "@/lib/game/constants";
import type { E1ExamQuestion } from "@/lib/ai/schema";
import type { ExamResult, ToolResult } from "@/lib/actions/game";
import { EXAM_LEVEL_LABELS } from "@/lib/game/display";
import { setSessionJSON, useSessionJSON } from "@/hooks/useSessionJSON";
import { getSaveId } from "@/lib/client/saveId";

export default function ExamPage() {
  const router = useRouter();
  const persisted = useSessionJSON<GameState>("game_state");
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [saveId] = useState<string | null>(() => getSaveId());
  const [examLevel, setExamLevel] = useState<ExamLevel>("county");
  const [synced, setSynced] = useState(false);
  const [question, setQuestion] = useState<E1ExamQuestion | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, startSubmit] = useTransition();
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [cheatSheetActive, setCheatSheetActive] = useState(false);
  const [insiderTipChoice, setInsiderTipChoice] = useState<string | null>(null);
  const [toolMessage, setToolMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Guards getExamQuestion against React StrictMode's dev double-invoke (see effect below).
  const requestedExamKeyRef = useRef<string | null>(null);

  // Hydrate from the persisted save once + derive the exam level (render-time sync).
  if (!synced && persisted !== null) {
    setSynced(true);
    setGameState(persisted);
    let level: ExamLevel = "county";
    if (persisted.character.titles.includes("贡士")) level = "palace";
    else if (persisted.character.titles.includes("举人")) level = "metropolitan";
    else if (persisted.character.titles.includes("秀才")) level = "provincial";
    setExamLevel(level);
  }

  // No save → back to the daily loop.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem("game_state");
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

  // Fetch the exam question once per (saveId, examLevel). A ref-keyed guard fires
  // the getExamQuestion server action exactly once even under React StrictMode's
  // dev mount→cleanup→remount. The previous `cancelled` flag only blocked setState,
  // NOT the already-dispatched call — so the pro model was double-billed and the two
  // responses (one DeepSeek, one Gemini) could desync the displayed vs graded
  // question. On failure the key resets so a later render can retry.
  useEffect(() => {
    if (!gameState || question !== null || saveId === null) return;
    const key = `${saveId}:${examLevel}`;
    if (requestedExamKeyRef.current === key) return;
    requestedExamKeyRef.current = key;
    getExamQuestion(saveId, examLevel)
      .then((q) => {
        setQuestion(q);
        setIsLoading(false);
      })
      .catch((e) => {
        console.warn("Failed to fetch exam question:", e);
        requestedExamKeyRef.current = null;
      });
  }, [gameState, examLevel, question, saveId]);

  function handleSubmit() {
    if (!gameState || !question) return;
    if (!selectedChoice && !freeText.trim()) return;

    startSubmit(async () => {
      setError(null);
      try {
        if (examLevel === "palace") {
          const palaceResult = await submitPalaceExam(
            saveId!,
            question,
            freeText.trim() ? null : selectedChoice,
            freeText.trim() || null,
            cheatSheetActive
          );
          setSessionJSON("palace_result", palaceResult);
          setSessionJSON("game_state", palaceResult.state);
          router.push("/palace");
        } else {
          const result = await submitExamAnswer(
            saveId!,
            examLevel,
            question,
            freeText.trim() ? null : selectedChoice,
            freeText.trim() || null,
            cheatSheetActive
          );
          setExamResult(result);
          setGameState(result.state);
          setSessionJSON("game_state", result.state);
        }
      } catch (e) {
        console.warn("Failed to submit exam:", e);
        setError("暂时无法保存考试结果，请稍后重试。");
      }
    });
  }

  function handleDismissResult() {
    // Navigate back to play page
    router.push("/play");
  }

  async function handleUseTool(toolId: string) {
    if (!gameState || !question) return;

    setError(null);
    let result: ToolResult;
    try {
      result = await applyToolAction(saveId!, toolId, {
        examLevel,
        question,
      });
    } catch (e) {
      console.warn("Failed to use exam tool:", e);
      setError("暂时无法使用该道具，请稍后重试。");
      return;
    }

    setToolMessage(result.message);
    setGameState(result.state);
    setSessionJSON("game_state", result.state);

    if (toolId === "cheat_sheet" && result.success) {
      setCheatSheetActive(true);
    }
    if (toolId === "insider_tip" && result.success && result.bestChoice) {
      setInsiderTipChoice(result.bestChoice);
    }
    if (toolId === "cheat_sheet" && result.exposed) {
      // Exposed - go back to play page
      setTimeout(() => router.push("/play"), 2000);
    }

    // Clear message after 3s
    setTimeout(() => setToolMessage(null), 3000);
  }

  if (isLoading || !question || !gameState) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gold-dim border-t-transparent rounded-full animate-spin" />
          <p className="font-serif text-sm text-bone-mute tracking-[0.12em]">
            考官正在出题...
          </p>
        </div>
      </div>
    );
  }

  const canSubmit = (selectedChoice || freeText.trim().length > 0) && !isSubmitting;

  return (
    <>
      {error && (
        <ErrorToast
          message={error}
          duration={0}
          onDismiss={() => setError(null)}
        />
      )}

      {/* Background */}
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/assets/examination-hall.png')",
          opacity: 0.12,
        }}
        aria-hidden="true"
      />

      {/* Exam Result Overlay */}
      {examResult && (
        <ResultOverlay
          passed={examResult.passed}
          title={examResult.title ?? undefined}
          narration={examResult.narration}
          statChanges={examResult.statChanges}
          score={examResult.score}
          threshold={examResult.threshold ?? undefined}
          judgeNarrative={examResult.judgeNarrative ?? undefined}
          onDismiss={handleDismissResult}
        />
      )}

      {/* Main exam content */}
      <div className="flex-1 flex flex-col items-center justify-center py-4 md:py-8 px-3 md:px-0">
        <ScrollFramePanel>
          {/* Header */}
          <div className="mb-6">
            <span className="font-mono text-[9px] tracking-[0.18em] text-vermillion uppercase block mb-1">
              科举考场
            </span>
            <h1 className="font-calli text-[32px] md:text-[38px] text-gold-glow tracking-[0.12em] md:tracking-[0.18em] leading-tight">
              {EXAM_LEVEL_LABELS[examLevel]}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 font-mono text-[10px] text-bone-mute tracking-[0.08em]">
              <span>第{gameState.world.year}年</span>
              <span>·</span>
              <span>学识 {gameState.character.stats.erudition}/100</span>
              {cheatSheetActive && (
                <span className="text-gold-dim">[小抄生效中]</span>
              )}
            </div>
          </div>

          {/* Question */}
          <div className="border-l-2 border-vermillion pl-3 md:pl-4 mb-6">
            <p className="font-serif text-[17px] text-bone leading-[1.85] tracking-[0.04em]">
              {question.question_text}
            </p>
          </div>

          {/* Choices */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {question.choices.map((choice) => (
              <div key={choice.id} className="relative">
                <ExamChoice
                  letter={choice.id.toUpperCase()}
                  text={choice.label}
                  selected={selectedChoice === choice.id}
                  onClick={() => {
                    setSelectedChoice(choice.id);
                    setFreeText(""); // Clear free text when selecting a choice
                  }}
                />
                {/* Risk indicator */}
                {choice.risk && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-vermillion opacity-60" title={choice.risk.description} />
                )}
                {/* Insider tip highlight */}
                {insiderTipChoice === choice.id && (
                  <span className="absolute -top-1 -left-1 px-1.5 py-0.5 bg-gold-dim text-paper-0 font-mono text-[8px] tracking-wider">
                    推荐
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Free text input */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
              <span className="font-serif text-xs text-bone-mute tracking-[0.06em]">
                或自拟答案（{question.free_input_hint}）
              </span>
              <span className="font-mono text-[10px] text-bone-mute">
                {freeText.length}/300
              </span>
            </div>
            <textarea
              className="w-full h-28 bg-[rgba(15,12,8,0.4)] border border-hairline p-3 font-serif text-sm text-bone leading-relaxed tracking-[0.04em] resize-none focus:border-gold-dim focus:outline-none transition-colors placeholder:text-bone-mute/50"
              placeholder="在此撰写你的策论..."
              maxLength={300}
              value={freeText}
              onChange={(e) => {
                setFreeText(e.target.value);
                if (e.target.value.trim()) setSelectedChoice(null); // Clear choice when typing
              }}
            />
          </div>

          {/* Tools section — NOT available in palace exam (殿试) */}
          {examLevel !== "palace" && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4">
            <button
              type="button"
              onClick={() => handleUseTool("cheat_sheet")}
              disabled={cheatSheetActive || gameState.world.auxiliary_tools.cheat_sheet_used_this_cycle}
              className="px-3 py-1.5 border border-hairline font-serif text-xs text-bone-mute tracking-[0.04em] hover:border-gold-dim hover:text-bone transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              小抄 (运-10)
            </button>
            <button
              type="button"
              onClick={() => handleUseTool("insider_tip")}
              disabled={!!insiderTipChoice || gameState.world.auxiliary_tools.insider_tip_used_this_cycle}
              className="px-3 py-1.5 border border-hairline font-serif text-xs text-bone-mute tracking-[0.04em] hover:border-gold-dim hover:text-bone transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              榜眼引路 (银-15)
            </button>
          </div>
          )}

          {/* Tool message */}
          {toolMessage && (
            <p className="font-serif text-xs text-gold-dim tracking-[0.04em] mb-4">
              {toolMessage}
            </p>
          )}

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-hairline">
            <button
              type="button"
              onClick={() => router.push("/play")}
              className="px-4 py-2 font-serif text-sm text-bone-mute tracking-[0.08em] hover:text-bone transition-colors"
            >
              放弃
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="px-6 py-2.5 bg-gradient-to-b from-vermillion to-vermillion-deep text-bone border border-vermillion-deep font-serif text-sm tracking-[0.18em] sm:tracking-[0.22em] transition-all duration-200 disabled:bg-paper-2 disabled:border-hairline disabled:text-bone-mute disabled:cursor-not-allowed disabled:bg-none"
            >
              {isSubmitting ? "阅卷中..." : "交卷"}
            </button>
          </div>
        </ScrollFramePanel>
      </div>
    </>
  );
}
