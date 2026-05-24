import { SealStamp } from "@/components/ui/SealStamp";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { Era, Season } from "@/lib/game/constants";
import { ERA_LABELS } from "@/lib/game/display";

interface TopBarProps {
  season: Season;
  year: number;
  era: Era;
  characterName: string;
  title: string;
  age: number;
  generation: number;
}

const seasonLabels: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

export function TopBar({
  season,
  year,
  era,
  characterName,
  title,
  age,
  generation,
}: TopBarProps) {
  return (
    <header
      className="sticky top-0 z-40 grid grid-cols-[1fr_auto] md:grid-cols-[auto_1fr_auto] items-center gap-3 md:gap-8 py-3 md:py-4 pb-3 md:pb-3.5 border-b border-hairline bg-[linear-gradient(180deg,rgba(26,20,16,0.92),rgba(26,20,16,0.78))] backdrop-blur-[10px] mb-4 md:mb-6"
      role="banner"
      aria-label="游戏状态栏"
    >
      {/* Brand — hidden on mobile to save space */}
      <div className="hidden md:flex items-baseline gap-2.5 text-gold font-serif text-base tracking-[0.16em]">
        <SealStamp text="芳" size="sm" rotation={-3} />
        <span>百世流芳</span>
        <small className="ml-2.5 text-bone-mute font-serif tracking-[0.08em] text-[13px]">
          科举世家录
        </small>
      </div>

      {/* Season / Year / Era */}
      <div className="flex items-center gap-2 md:gap-3.5 md:justify-self-center font-serif text-bone text-[15px] md:text-[17px] tracking-[0.12em] md:tracking-[0.18em]">
        <span className="inline-block w-2 h-2 bg-vermillion rotate-45" aria-hidden="true" />
        <span>
          {seasonLabels[season]} · 第{year}年
        </span>
        <span className="hidden md:inline font-serif text-bone-mute text-[13px] tracking-[0.08em] ml-1.5">
          {ERA_LABELS[era]}
        </span>
      </div>

      {/* Profile */}
      <div className="flex items-center gap-2 md:gap-3 font-mono text-[11px] text-bone-mute tracking-[0.08em]">
        <div className="flex flex-col gap-0.5 leading-snug">
          <span className="font-serif text-sm md:text-base text-bone tracking-[0.08em]">
            {characterName}
          </span>
          <span className="hidden md:inline">
            第{generation}世 · {age}岁
          </span>
        </div>
        <StatusBadge label={title} variant="title" />
      </div>
    </header>
  );
}
