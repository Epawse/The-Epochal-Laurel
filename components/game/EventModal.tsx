"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CurrentEvent } from "@/lib/game/schema";
import { EventChoice } from "./EventChoice";

const EVENT_TYPE_LABELS: Record<string, string> = {
  opportunity: "机遇",
  misfortune: "灾厄",
  social: "社交",
  political: "政治",
};

interface EventModalProps {
  event: CurrentEvent;
  onChoice: (id: string) => void;
  onFreeInput: (text: string) => void;
  onClose: () => void;
  disabled?: boolean;
}

export function EventModal({
  event,
  onChoice,
  onFreeInput,
  onClose,
  disabled = false,
}: EventModalProps) {
  const [freeText, setFreeText] = useState("");
  const [showFreeInput, setShowFreeInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const isDisabled = disabled || submitting;

  useEffect(() => {
    if (disabled) return;
    const timer = window.setTimeout(() => setSubmitting(false), 0);
    return () => window.clearTimeout(timer);
  }, [disabled]);

  function handleFreeSubmit() {
    if (!freeText.trim() || isDisabled) return;
    setSubmitting(true);
    onFreeInput(freeText.trim());
  }

  function handleChoice(choiceId: string) {
    if (isDisabled) return;
    setSubmitting(true);
    onChoice(choiceId);
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Scrim */}
        <motion.div
          className="absolute inset-0 bg-[rgba(8,6,4,0.78)] backdrop-blur-[6px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Card */}
        <motion.div
          className="relative z-10 w-full max-w-[880px] mx-4 bg-paper-1 border border-gold-dim p-8 md:p-10 overflow-y-auto max-h-[90vh]"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-title"
        >
          {/* Type label */}
          <span className="font-mono text-[10px] tracking-[0.2em] text-vermillion uppercase">
            {EVENT_TYPE_LABELS[event.type] ?? event.type}
          </span>

          {/* Title */}
          <h2
            id="event-title"
            className="font-calli text-[44px] text-gold-glow tracking-[0.18em] mt-2 mb-4 leading-tight"
          >
            {event.title}
          </h2>

          {/* Ink divider */}
          <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gold-dim to-transparent mb-5" />

          {/* Body text */}
          <p className="font-serif text-base text-bone-dim leading-[1.85] tracking-[0.04em] mb-8">
            {event.description}
          </p>

          {event.reward && (
            <div className="mb-6 border border-dashed border-hairline px-3 py-2 font-serif text-sm text-gold tracking-[0.08em]">
              {event.reward.type === "relic_draft" && "此事或可得一件奇物"}
              {event.reward.type === "skill_grant" && "此事或可悟得一门技艺"}
              {event.reward.type === "buff" && "此事或将留下余韵"}
            </div>
          )}

          {/* Choices grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
            {event.choices.map((choice, index) => (
              <EventChoice
                key={choice.id}
                choice={choice}
                index={index}
                onClick={handleChoice}
                disabled={isDisabled}
              />
            ))}
          </div>

          {/* Free-form input section */}
          {event.allows_free_input && (
            <div className="border-t border-dashed border-hairline pt-5">
              {!showFreeInput ? (
                <button
                  type="button"
                  className="font-serif text-sm text-gold-dim tracking-[0.08em] hover:text-gold-glow transition-colors"
                  onClick={() => setShowFreeInput(true)}
                  disabled={isDisabled}
                >
                  另辟蹊径...
                </button>
              ) : (
                <div className="flex flex-col gap-3">
                  <label
                    htmlFor="free-input"
                    className="font-serif text-xs tracking-[0.12em] text-bone-mute"
                  >
                    自拟解法
                  </label>
                  <textarea
                    id="free-input"
                    className="w-full h-24 bg-paper-2 border border-hairline p-3 font-serif text-sm text-bone tracking-[0.04em] leading-relaxed resize-none focus:border-gold-dim focus:outline-none transition-colors placeholder:text-bone-mute"
                    placeholder="描述你的创意解法..."
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    disabled={isDisabled}
                    maxLength={500}
                  />
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-bone-mute">
                      {freeText.length}/500
                    </span>
                    <button
                      type="button"
                      className="px-5 py-2 bg-gradient-to-b from-gold-dim to-gold-glow text-paper-0 font-serif text-sm tracking-[0.12em] transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={handleFreeSubmit}
                      disabled={isDisabled || !freeText.trim()}
                    >
                      {isDisabled ? "处理中..." : "提交"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
