import { formatCourtValue } from "@/lib/game/display";

interface CourtHintProps {
  label: string;
  state: "hidden" | "partial" | "full";
  value?: string;
  eliminated?: string[];
}

export function CourtHint({ label, state, value, eliminated }: CourtHintProps) {
  let displayText: string;

  switch (state) {
    case "hidden":
      displayText = "???";
      break;
    case "partial":
      displayText = eliminated?.length
        ? `非${eliminated.map(formatCourtValue).join("、非")}`
        : "???";
      break;
    case "full":
      displayText = value ? formatCourtValue(value) : "—";
      break;
  }

  return (
    <div className="flex items-baseline gap-2 text-xs text-bone-dim leading-snug">
      <span className="shrink-0 font-mono text-[9px] text-gold-dim tracking-[0.18em] px-1.5 py-0.5 border border-hairline uppercase">
        {label}
      </span>
      <span
        className={`font-serif tracking-[0.04em] ${
          state === "full" ? "text-bone" : "text-bone-mute"
        }`}
      >
        {displayText}
      </span>
    </div>
  );
}
