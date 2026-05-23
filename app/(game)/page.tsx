import Link from "next/link";
import { SceneBackground } from "@/components/ui/SceneBackground";
import { LandingTitle } from "@/components/game/LandingTitle";

export default function LandingPage() {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center p-10">
      <SceneBackground src="/assets/study-room.png" opacity={0.78} />

      <div className="relative z-[1] w-full max-w-[900px] text-center flex flex-col items-center gap-4">
        {/* Brand mark */}
        <div className="inline-flex items-center gap-3 font-mono text-[10.5px] tracking-[0.32em] text-bone-mute uppercase mb-1.5">
          <span className="w-7 h-7 grid place-items-center bg-vermillion text-bone font-serif text-[15px] -rotate-3 shadow-[0_0_0_2px_rgba(196,57,44,0.18)]">
            芳
          </span>
          <span>THE EPOCHAL LAUREL</span>
        </div>

        {/* Title with ink-bloom animation */}
        <LandingTitle />

        {/* Subtitle */}
        <p className="font-latin-serif italic text-[22px] text-bone-dim tracking-[0.08em] mt-1">
          The Epochal Laurel
        </p>

        {/* Ink divider */}
        <div
          className="w-[220px] h-7 bg-[url('/assets/ink-divider-plum.png')] bg-no-repeat bg-center bg-contain invert brightness-110 mix-blend-screen opacity-90 my-1"
          aria-hidden="true"
        />

        {/* Tagline */}
        <p className="font-serif text-base text-bone-dim tracking-[0.18em] leading-loose max-w-[480px]">
          十年寒窗，<span className="text-gold">百世流芳</span>
        </p>

        {/* Buttons */}
        <div className="mt-4 flex flex-col gap-3 items-stretch w-full max-w-[320px]">
          {/* Primary CTA */}
          <Link
            href="/create"
            className="block px-7 py-3.5 bg-gradient-to-b from-vermillion to-vermillion-deep text-bone border border-vermillion-deep font-serif text-lg tracking-[0.32em] text-center transition-all duration-200 hover:brightness-108 hover:-translate-y-px shadow-[0_4px_16px_rgba(196,57,44,0.22),inset_0_0_0_1px_rgba(232,200,121,0.22)]"
          >
            开创新局
            <span className="block font-latin-serif italic text-[11px] tracking-[0.18em] text-bone/70 mt-1">
              Begin a New Dynasty
            </span>
          </Link>

          {/* Secondary */}
          <button
            type="button"
            disabled
            className="px-6 py-3 bg-[rgba(34,26,19,0.6)] text-bone border border-hairline font-serif text-base tracking-[0.28em] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:border-gold-dim hover:text-gold hover:bg-[rgba(44,34,24,0.7)]"
          >
            继续旧梦
          </button>

          {/* Link */}
          <Link
            href="/leaderboard"
            className="px-3 py-2 bg-transparent border-none text-bone-mute font-serif text-sm tracking-[0.22em] transition-colors duration-200 hover:text-gold text-center"
          >
            百世流芳榜
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-between px-10 font-mono text-[10px] tracking-[0.18em] text-bone-mute z-[2]">
        <span>v0.1.0</span>
        <span>AI-NATIVE ROGUELIKE</span>
      </div>
    </div>
  );
}
