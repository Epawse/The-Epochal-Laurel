interface NarrativeStripProps {
  text: string;
  timestamp?: string;
}

export function NarrativeStrip({ text, timestamp }: NarrativeStripProps) {
  return (
    <div className="mt-1 px-3 md:px-4 py-3.5 border border-hairline bg-[linear-gradient(180deg,rgba(44,34,24,0.5),rgba(34,26,19,0.5))] flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 font-serif text-sm text-bone-dim leading-relaxed tracking-[0.04em] relative min-h-14">
      {/* Seal marker */}
      <span
        className="shrink-0 w-[22px] h-[22px] grid place-items-center bg-vermillion text-bone font-serif text-xs -rotate-3 shadow-[0_0_0_2px_rgba(196,57,44,0.16)]"
        aria-hidden="true"
      >
        叙
      </span>

      {/* Narrative text */}
      <span className="flex-1">{text}</span>

      {/* Timestamp */}
      {timestamp && (
        <span className="shrink-0 font-mono text-[10px] tracking-[0.12em] sm:tracking-[0.18em] text-bone-mute">
          {timestamp}
        </span>
      )}
    </div>
  );
}
