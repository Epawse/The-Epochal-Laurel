interface StatusBadgeProps {
  tier?: "S" | "A" | "B" | "C" | "D" | "F";
  label?: string;
  variant?: "tier" | "title" | "hint";
}

const tierColors: Record<string, string> = {
  S: "bg-gradient-to-br from-gold-glow to-vermillion text-bone",
  A: "bg-gradient-to-br from-gold-glow to-gold-dim text-ink",
  B: "bg-gradient-to-br from-gold to-gold-dim text-ink",
  C: "bg-gradient-to-br from-bone-dim to-bone-mute text-ink",
  D: "bg-gradient-to-br from-smoke to-paper-3 text-bone",
  F: "bg-gradient-to-br from-vermillion-deep to-paper-3 text-bone",
};

export function StatusBadge({ tier, label, variant = "tier" }: StatusBadgeProps) {
  if (variant === "tier" && tier) {
    return (
      <span
        className={`inline-grid place-items-center w-[54px] h-[54px] font-latin-serif text-[32px] italic font-semibold leading-none shadow-[0_6px_18px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(232,200,121,0.6)] ${tierColors[tier]}`}
      >
        {tier}
      </span>
    );
  }

  if (variant === "title") {
    return (
      <span className="inline-block px-2.5 py-0.5 border border-gold-dim text-gold font-serif text-xs tracking-[0.12em] bg-[rgba(201,165,90,0.06)]">
        {label ?? tier}
      </span>
    );
  }

  // hint variant
  return (
    <span className="inline-block px-1.5 py-0.5 border border-hairline text-bone-mute font-mono text-[9.5px] tracking-[0.18em] uppercase">
      {label ?? tier}
    </span>
  );
}
