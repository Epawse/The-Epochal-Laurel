"use client";

import { useReducedMotion } from "@/hooks/useReducedMotion";

/**
 * P1 Animation: Scheme Exposure overlay.
 * Shows a red flash + "东窗事发" stamp when a scheme is exposed.
 * Auto-dismisses via parent (2.5s timeout in play page).
 */
export function SchemeExposureOverlay() {
  const reduce = useReducedMotion();

  return (
    <div aria-live="assertive" aria-atomic="true">
      {/* Red flash */}
      {!reduce && <div className="scheme-flash" aria-hidden="true" />}

      {/* Stamp overlay */}
      <div className="fixed inset-0 z-[160] flex items-center justify-center pointer-events-none">
        <div
          className={`flex flex-col items-center gap-2 ${reduce ? "" : "scheme-stamp"}`}
        >
          <span className="font-calli text-[clamp(48px,10vw,96px)] text-vermillion tracking-[0.28em] drop-shadow-[0_2px_12px_rgba(196,57,44,0.5)]">
            东窗事发
          </span>
          <span className="font-serif text-sm text-bone-dim tracking-[0.08em]">
            行迹败露，名声大损
          </span>
        </div>
      </div>
    </div>
  );
}
