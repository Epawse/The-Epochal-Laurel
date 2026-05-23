"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ScrollFramePanel } from "@/components/ui/ScrollFramePanel";
import { ExamChoice } from "@/components/game/ExamChoice";
import { ResultOverlay } from "@/components/game/ResultOverlay";
import { getExamQuestion, submitExamAnswer, submitPalaceExam, useToolAction } from "@/lib/actions/game";
import type { GameState } from "@/lib/game/schema";
import type { ExamLevel } from "@/lib/game/constants";
import type { E1ExamQuestion } from "@/lib/ai/schema";
import type { ExamResult, ToolResult } from "@/lib/actions/game";

const EXAM_LEVEL_LABELS: Record<string, string> = {
  county: "童试",
  provincial: "乡试",
  metropolitan: "会试",
  palace: "殿试",
};

export default function ExamPage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [examLevel, setExamLevel] = useState<ExamLevel>("county");
  const [question, setQuestion] = useState<E1ExamQuestion | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, startSubmit] = useTransition();
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [cheatSheetActive, setCheatSheetActive] = useState(false);
  const [insiderTipChoice, setInsiderTipChoice] = useState<string | null>(null);
  const [toolMessage, setToolMessage] = useState<string | null>(null);

  // Load game state and determine exam level
  useEffect(() => {
    const stored = sessionStorage.getItem("game_state");
    if (!stored) {
      router.push("/play");
      return;
    }

    try {
      const parsed = JSON.parse(stored) as GameState;
      setGameState(parsed);

      // Determine which exam level to take based on titles
      let level: ExamLevel = "county";
      if (parsed.character.titles.includes("贡士")) level = "palace";
      else if (parsed.character.titles.includes("举人")) level = "metropolitan";
      else if (parsed.character.titles.includes("秀才")) level = "provincial";
      setExamLevel(level);

      // Fetch exam question
      getExamQuestion(parsed, level).then((q) => {
        setQuestion(q);
        setIsLoading(false);
      });
    } catch {
      router.push("/play");
    }
  }, [router]);

  function handleSubmit() {
    if (!gameState || !question) return;
    if (!selectedChoice && !freeText.trim()) return;

    startSubmit(async () => {
      if (examLevel === "palace") {
        // Palace exam: call submitPalaceExam and navigate to /palace
        const palaceResult = await submitPalaceExam(
          gameState,
          question,
          freeText.trim() ? null : selectedChoice,
          freeText.trim() || null,
          cheatSheetActive
        );
        // Store palace result for the palace ranking page
        sessionStorage.setItem("palace_result", JSON.stringify(palaceResult));
        sessionStorage.setItem("game_state", JSON.stringify(palaceResult.state));
        router.push("/palace");
      } else {
        // Regular exam: show ResultOverlay
        const result = await submitExamAnswer(
          gameState,
          examLevel,
          question,
          freeText.trim() ? null : selectedChoice,
          freeText.trim() || null,
          cheatSheetActive
        );
        setExamResult(result);
        setGameState(result.state);
        // Persist updated state
        sessionStorage.setItem("game_state", JSON.stringify(result.state));
      }
    });
  }

  function handleDismissResult() {
    // Navigate back to play page
    router.push("/play");
  }

  async function handleUseTool(toolId: string) {
    if (!gameState || !question) return;

    const result: ToolResult = await useToolAction(gameState, toolId, {
      examLevel,
      question,
    });

    setToolMessage(result.message);
    setGameState(result.state);
    sessionStorage.setItem("game_state", JSON.stringify(result.state));

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
      <div className="flex-1 flex flex-col items-center justify-center py-8">
        <ScrollFramePanel>
          {/* Header */}
          <div className="mb-6">
            <span className="font-mono text-[9px] tracking-[0.18em] text-vermillion uppercase block mb-1">
              IMPERIAL EXAMINATION
            </span>
            <h1 className="font-calli text-[38px] text-gold-glow tracking-[0.18em] leading-tight">
              {EXAM_LEVEL_LABELS[examLevel]}
            </h1>
            <div className="flex items-center gap-3 mt-2 font-mono text-[10px] text-bone-mute tracking-[0.08em]">
              <span>第{gameState.world.year}年</span>
              <span>·</span>
              <span>学识 {gameState.character.stats.erudition}/100</span>
              {cheatSheetActive && (
                <span className="text-gold-dim">[小抄生效中]</span>
              )}
            </div>
          </div>

          {/* Question */}
          <div className="border-l-2 border-vermillion pl-4 mb-6">
            <p className="font-serif text-[17px] text-bone leading-[1.85] tracking-[0.04em]">
              {question.question_text}
            </p>
          </div>

          {/* Choices */}
          <div className="grid grid-cols-3 gap-3 mb-6">
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
            <div className="flex items-center justify-between mb-2">
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
          <div className="flex items-center gap-3 mb-4">
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
          <div className="flex items-center justify-between pt-4 border-t border-hairline">
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
              className="px-6 py-2.5 bg-gradient-to-b from-vermillion to-vermillion-deep text-bone border border-vermillion-deep font-serif text-sm tracking-[0.22em] transition-all duration-200 disabled:bg-paper-2 disabled:border-hairline disabled:text-bone-mute disabled:cursor-not-allowed disabled:bg-none"
            >
              {isSubmitting ? "阅卷中..." : "交卷"}
            </button>
          </div>
        </ScrollFramePanel>
      </div>
    </>
  );
}
