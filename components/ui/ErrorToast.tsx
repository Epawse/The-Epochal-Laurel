"use client";

import { useState, useEffect } from "react";

interface ErrorToastProps {
  message: string;
  /** Auto-dismiss after this many ms. Pass 0 to disable. */
  duration?: number;
  onDismiss?: () => void;
  onRetry?: () => void;
}

/**
 * Dismissible error notification toast.
 * Appears fixed at top-center of viewport.
 */
export function ErrorToast({
  message,
  duration = 5000,
  onDismiss,
  onRetry,
}: ErrorToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onDismiss]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] max-w-[90vw] w-auto"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center gap-3 px-5 py-3 bg-paper-2 border border-vermillion shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
        {/* Icon */}
        <span className="text-vermillion font-mono text-sm" aria-hidden="true">
          !
        </span>

        {/* Message */}
        <span className="font-serif text-sm text-bone tracking-[0.04em]">
          {message}
        </span>

        {/* Retry button */}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-2 px-3 py-1 border border-hairline font-mono text-[10px] text-bone-dim tracking-[0.08em] hover:border-gold-dim hover:text-bone transition-colors"
            aria-label="Retry"
          >
            RETRY
          </button>
        )}

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            onDismiss?.();
          }}
          className="ml-1 text-bone-mute hover:text-bone transition-colors"
          aria-label="Dismiss notification"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
