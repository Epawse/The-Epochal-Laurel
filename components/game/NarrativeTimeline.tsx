"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { STAT_LABELS, type StatKey } from "@/lib/game/display";
import type { NarrativeEntry, NarrativeKind } from "@/lib/game/narrativeLog";

// Scrollable, session-accumulated story log for the daily loop. Replaces the
// single-line NarrativeStrip: the container is a FIXED height (no layout jitter
// as entries accrue), the NEWEST entry sits at the top and enters from the top,
// and older history scrolls down. No auto-scroll — the latest beat is naturally
// pinned at the top — so reading history is never yanked back. Pending entries
// render a shimmer placeholder replaced in place once the server/AI returns
// (the caller swaps the entry by id).
//
// Animation follows motion-patterns.md: entries enter with transform+opacity
// (fade-in from top) only — never animate height/layout. prefers-reduced-motion
// is honored via useReducedMotion (instant, no translate).
//
// The scroll container uses the `.narrative-scroll` utility (globals.css): the
// bright OS-default scrollbar is hidden (webkit + Firefox) and the top/bottom
// edges fade via a mask gradient to hint scrollability in the ink/paper theme.

const ACTION_ICONS: Record<string, string> = {
  study: "/assets/action-study.png",
  socialize: "/assets/action-socialize.png",
  earn: "/assets/action-earn.png",
  rest: "/assets/action-rest.png",
  scheme: "/assets/action-scheme.png",
};

// Type marker glyph + left-border color per rich kind (design-token colors).
const KIND_META: Record<
  Exclude<NarrativeKind, "action" | "pending" | "era">,
  { glyph: string; border: string; accent: string; label: string }
> = {
  event: { glyph: "事", border: "border-l-vermillion", accent: "text-vermillion", label: "事件" },
  exam: { glyph: "试", border: "border-l-gold", accent: "text-gold", label: "科试" },
  npc: { glyph: "语", border: "border-l-jade", accent: "text-jade", label: "言谈" },
  inherit: { glyph: "嗣", border: "border-l-gold", accent: "text-gold", label: "传承" },
};

function DeltaChips({ delta }: { delta: Partial<Record<StatKey, number>> }) {
  const entries = (Object.entries(delta) as Array<[StatKey, number]>).filter(
    ([, v]) => typeof v === "number" && v !== 0,
  );
  if (entries.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {entries.map(([key, value]) => (
        <span
          key={key}
          className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.04em] border ${
            value > 0
              ? "text-jade border-jade/40 bg-jade/10"
              : "text-vermillion border-vermillion/40 bg-vermillion/10"
          }`}
        >
          {STAT_LABELS[key] ?? key}
          {value > 0 ? `+${value}` : value}
        </span>
      ))}
    </span>
  );
}

function PendingEntry({ entry }: { entry: NarrativeEntry }) {
  return (
    <div className="px-3 py-3 border border-hairline border-l-2 border-l-gold-dim bg-paper-1/60 flex items-start gap-3">
      <span
        className="shrink-0 mt-0.5 w-1.5 h-1.5 rounded-full bg-gold-dim animate-[danger-pulse_1.4s_ease-in-out_infinite]"
        aria-hidden="true"
      />
      <div className="flex-1 min-w-0">
        <span className="font-mono text-[9px] tracking-[0.18em] text-gold-dim uppercase block mb-2">
          {entry.text || "推演中…"}
        </span>
        <div className="loading-shimmer h-3 w-3/4 rounded-sm" />
        <div className="loading-shimmer h-3 w-1/2 rounded-sm mt-1.5" />
      </div>
    </div>
  );
}

function EraEntry({ entry }: { entry: NarrativeEntry }) {
  return (
    <div className="flex items-center gap-3 py-1.5" role="separator" aria-label={entry.text}>
      <span className="flex-1 h-px bg-hairline" aria-hidden="true" />
      <span className="shrink-0 font-mono text-[10px] tracking-[0.22em] text-gold-dim uppercase text-center">
        {entry.title ? `${entry.title} · ${entry.text}` : entry.text}
      </span>
      <span className="flex-1 h-px bg-hairline" aria-hidden="true" />
    </div>
  );
}

function CompactEntry({ entry }: { entry: NarrativeEntry }) {
  const icon = entry.actionId ? ACTION_ICONS[entry.actionId] : undefined;
  return (
    <div className="px-2.5 py-2 flex items-center gap-2.5 font-serif text-[13px] text-bone-dim leading-relaxed tracking-[0.04em]">
      {icon ? (
        // eslint-disable-next-line @next/next/no-img-element -- small static decorative action glyph
        <img
          src={icon}
          alt=""
          aria-hidden="true"
          className="shrink-0 w-5 h-5 rounded-full object-cover opacity-70"
        />
      ) : (
        <span className="shrink-0 w-1 h-1 rounded-full bg-bone-mute" aria-hidden="true" />
      )}
      <span className="flex-1 min-w-0">{entry.text}</span>
      <span className="shrink-0 font-mono text-[9px] tracking-[0.12em] text-bone-mute">
        {entry.season}
      </span>
    </div>
  );
}

function RichEntry({ entry }: { entry: NarrativeEntry }) {
  const meta = KIND_META[entry.kind as keyof typeof KIND_META];
  return (
    <div
      className={`px-3 py-3 border border-hairline border-l-2 ${meta.border} bg-paper-1/70 flex flex-col gap-1.5`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 min-w-0">
          <span
            className={`shrink-0 w-[18px] h-[18px] grid place-items-center bg-paper-2 ${meta.accent} font-serif text-[11px] -rotate-3`}
            aria-hidden="true"
          >
            {meta.glyph}
          </span>
          {entry.title && (
            <span className={`truncate font-serif text-sm tracking-[0.06em] ${meta.accent}`}>
              {entry.title}
            </span>
          )}
        </span>
        <span className="shrink-0 font-mono text-[9px] tracking-[0.12em] text-bone-mute">
          {entry.season}
        </span>
      </div>
      <p className="font-serif text-[13px] text-bone-dim leading-relaxed tracking-[0.04em]">
        {entry.text}
      </p>
      {(entry.dice || entry.delta) && (
        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          {entry.dice && (
            <span className="px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-gold-dim border border-gold-dim/40">
              {entry.dice}
            </span>
          )}
          {entry.delta && <DeltaChips delta={entry.delta} />}
        </div>
      )}
    </div>
  );
}

function EntryBody({ entry }: { entry: NarrativeEntry }) {
  if (entry.status === "pending" || entry.kind === "pending") return <PendingEntry entry={entry} />;
  if (entry.kind === "era") return <EraEntry entry={entry} />;
  if (entry.kind === "action") return <CompactEntry entry={entry} />;
  return <RichEntry entry={entry} />;
}

interface NarrativeTimelineProps {
  entries: NarrativeEntry[];
}

export function NarrativeTimeline({ entries }: NarrativeTimelineProps) {
  const reduce = useReducedMotion();
  // Render newest-first without mutating the source array (helpers/data flow keep
  // append order: old → new). Reversing a copy puts the latest beat at the top.
  const ordered = entries.slice().reverse();

  return (
    <section
      className="mt-1 border border-hairline bg-[linear-gradient(180deg,rgba(44,34,24,0.45),rgba(34,26,19,0.45))]"
      aria-label="叙事记录"
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-hairline-soft">
        <span
          className="shrink-0 w-[20px] h-[20px] grid place-items-center bg-vermillion text-bone font-serif text-[11px] -rotate-3 shadow-[0_0_0_2px_rgba(196,57,44,0.16)]"
          aria-hidden="true"
        >
          叙
        </span>
        <span className="font-mono text-[9px] tracking-[0.22em] text-bone-mute uppercase">
          叙事记录
        </span>
      </div>

      <div className="narrative-scroll h-[clamp(180px,32vh,300px)] overflow-y-auto px-2 py-2 flex flex-col gap-1.5">
        {ordered.length === 0 ? (
          <p className="px-2.5 py-3 font-serif text-[13px] text-bone-mute tracking-[0.04em]">
            尚无事迹，且看今朝。
          </p>
        ) : (
          <AnimatePresence initial={false}>
            {ordered.map((entry) => (
              <motion.div
                key={entry.id}
                layout={false}
                initial={reduce ? false : { opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                transition={{ duration: reduce ? 0.01 : 0.35, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <EntryBody entry={entry} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
