"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/game/TopBar";
import { ErrorToast } from "@/components/ui/ErrorToast";
import { ORIGINS, type Origin, type OriginDef } from "@/lib/game/constants";
import { formatStatLabel, ORIGIN_FLAVORS } from "@/lib/game/display";
import { newGame } from "@/lib/actions/game";
import { setSaveId } from "@/lib/client/saveId";
import { setSessionJSON } from "@/hooks/useSessionJSON";

const originList = Object.values(ORIGINS);

function OriginCard({
  origin,
  index,
  selected,
  onSelect,
}: {
  origin: OriginDef;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative bg-paper-1 border p-3.5 md:p-4 md:pt-4 pb-3.5 text-left cursor-pointer transition-all duration-250 flex flex-col gap-2.5 min-h-[190px] md:min-h-[240px] ${
        selected
          ? "border-gold-glow bg-paper-2 shadow-[inset_0_0_0_1px_rgba(232,200,121,0.4),0_12px_30px_rgba(0,0,0,0.36)]"
          : "border-hairline hover:-translate-y-0.5 hover:border-gold-dim hover:bg-paper-2"
      }`}
      aria-pressed={selected}
      aria-label={`选择出身：${origin.label}`}
    >
      {/* Selected corner triangle */}
      {selected && (
        <span
          className="absolute -top-px -right-px w-0 h-0 border-l-[14px] border-l-transparent border-t-[14px] border-t-gold-glow"
          aria-hidden="true"
        />
      )}

      {/* Corner label */}
      <span className="font-mono text-[10px] tracking-[0.18em] text-bone-mute">
        {String.fromCharCode(65 + index)}
      </span>

      {/* Title */}
      <h3
        className={`font-serif text-[20px] md:text-[22px] tracking-[0.12em] md:tracking-[0.18em] m-0 ${
          selected ? "text-gold-glow" : "text-gold"
        }`}
      >
        {origin.label}
      </h3>

      {/* Flavor */}
      <p className="font-serif text-[13px] text-bone-dim leading-relaxed tracking-[0.04em] flex-1">
        {ORIGIN_FLAVORS[origin.id] ?? origin.flavor}
      </p>

      {/* Stat pills */}
      <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-dashed border-hairline">
        {Object.entries(origin.modifiers).map(([stat, val]) => {
          if (val === 0) return null;
          const isNeg = val < 0;
          return (
            <span
              key={stat}
              className={`font-mono text-[10.5px] tracking-[0.08em] px-1.5 py-0.5 border ${
                isNeg
                  ? "text-vermillion border-[rgba(196,57,44,0.36)]"
                  : "text-jade border-hairline"
              }`}
            >
              {formatStatLabel(stat)} {val > 0 ? "+" : ""}
              {val}
            </span>
          );
        })}
      </div>

      {/* Trait */}
      <div className="flex items-baseline gap-1.5 font-serif text-[13px] text-bone tracking-[0.04em]">
        <span className="font-mono text-[9.5px] text-vermillion tracking-[0.18em] uppercase">
          特质
        </span>
        {origin.trait}
      </div>
    </button>
  );
}

export default function CreatePage() {
  const router = useRouter();
  const [familyName, setFamilyName] = useState("");
  const [selectedOrigin, setSelectedOrigin] = useState<Origin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedDef = selectedOrigin ? ORIGINS[selectedOrigin] : null;
  const canConfirm = selectedOrigin !== null && !isPending;

  function handleConfirm() {
    if (!selectedOrigin || isPending) return;

    startTransition(async () => {
      setError(null);
      try {
        const { id, state } = await newGame(familyName || "张", selectedOrigin);
        setSaveId(id);
        setSessionJSON("game_state", state);
        router.push("/play");
      } catch (e) {
        console.warn("Failed to create a new game:", e);
        setError("暂时无法创建存档，请稍后重试。");
      }
    });
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-8 pb-4 md:pb-8 min-h-screen flex flex-col">
      {error && (
        <ErrorToast
          message={error}
          duration={0}
          onDismiss={() => setError(null)}
          onRetry={handleConfirm}
        />
      )}

      <TopBar
        season="spring"
        year={1}
        era="prosperity"
        characterName={familyName || "—"}
        title="白身"
        age={15}
        generation={1}
      />

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] xl:grid-cols-[360px_1fr] gap-4 md:gap-6 lg:gap-7 flex-1 min-h-0">
        {/* Left column — Portrait */}
        <div className="relative bg-paper-1 border border-hairline p-3.5 md:p-4 flex flex-col gap-3.5">
          {/* Corner brackets */}
          <i className="absolute top-1.5 left-1.5 w-3.5 h-3.5 border-t border-l border-gold-dim opacity-70 pointer-events-none" />
          <i className="absolute top-1.5 right-1.5 w-3.5 h-3.5 border-t border-r border-gold-dim opacity-70 pointer-events-none" />
          <i className="absolute bottom-1.5 left-1.5 w-3.5 h-3.5 border-b border-l border-gold-dim opacity-70 pointer-events-none" />
          <i className="absolute bottom-1.5 right-1.5 w-3.5 h-3.5 border-b border-r border-gold-dim opacity-70 pointer-events-none" />

          {/* Portrait frame */}
          <div className="aspect-[3/4] max-h-[360px] lg:max-h-none bg-ink border border-hairline overflow-hidden relative">
            <div
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(232,200,121,0.10),transparent_70%)]"
              aria-hidden="true"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/assets/scholar-young.png"
              alt="Young scholar portrait"
              className="w-full h-full object-cover object-[50%_20%]"
            />
            <div
              className="absolute inset-0 bg-[linear-gradient(180deg,transparent_60%,rgba(15,12,8,0.7))] pointer-events-none"
              aria-hidden="true"
            />
          </div>

          {/* Family name input */}
          <div className="flex items-center gap-3.5">
            <span className="font-mono text-[10px] tracking-[0.22em] text-bone-mute uppercase">
              姓氏
            </span>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="姓"
              maxLength={4}
              className="flex-1 bg-[rgba(15,12,8,0.5)] border border-hairline px-3.5 py-2.5 font-calli text-[30px] text-gold-glow tracking-[0.16em] text-center outline-none transition-colors duration-200 focus:border-gold placeholder:text-bone-mute placeholder:text-xl"
              aria-label="家族姓氏"
            />
            <span className="font-serif text-base text-bone-dim tracking-[0.16em]">
              氏
            </span>
          </div>

          {/* Seal summary */}
          <div className="border border-dashed border-hairline p-3 flex flex-col gap-1">
            <dt className="font-mono text-[10px] tracking-[0.22em] text-bone-mute uppercase">
              出身
            </dt>
            <dd className="m-0 font-serif text-[15px] text-bone tracking-[0.08em]">
              {selectedDef ? (
                <>
                  <span className="text-gold">{selectedDef.label}</span> ·{" "}
                  {selectedDef.trait}
                </>
              ) : (
                <span className="text-bone-mute">未选择</span>
              )}
            </dd>
          </div>
        </div>

        {/* Right column — Main */}
        <div className="relative flex flex-col gap-4 min-w-0">
          {/* Title */}
          <h1 className="font-calli text-[34px] md:text-[44px] text-gold-glow tracking-[0.16em] md:tracking-[0.28em] m-0">
            择身出世
            <span className="block font-serif text-base text-bone-mute tracking-[0.08em] mt-1">
              家族第一笔命数
            </span>
          </h1>

          {/* Intro */}
          <p className="font-serif text-[15px] text-bone-dim tracking-[0.05em] leading-loose max-w-[720px]">
            每个家族都有自己的起点。选择你的出身，它将决定你的初始属性与家族特质。寒门出贵子，还是官宦传家学？命运的第一笔，由你落下。
          </p>

          {/* Origin grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 md:gap-3.5">
            {originList.map((origin, i) => (
              <OriginCard
                key={origin.id}
                origin={origin}
                index={i}
                selected={selectedOrigin === origin.id}
                onSelect={() => setSelectedOrigin(origin.id)}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="mt-auto flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3.5 border-t border-hairline">
            <span className="font-serif text-[13px] text-bone-mute tracking-[0.04em]">
              选择出身后，点击{" "}
              <b className="text-gold font-medium">入世求名</b> 开始你的科举之路
            </span>
            <button
              type="button"
              disabled={!canConfirm}
              onClick={handleConfirm}
              className="px-6 md:px-8 py-3 bg-gradient-to-b from-vermillion to-vermillion-deep text-bone border border-vermillion-deep font-serif text-base md:text-lg tracking-[0.2em] md:tracking-[0.32em] transition-all duration-200 shadow-[0_4px_16px_rgba(196,57,44,0.2),inset_0_0_0_1px_rgba(232,200,121,0.2)] hover:brightness-108 hover:-translate-y-px disabled:bg-paper-2 disabled:border-hairline disabled:text-bone-mute disabled:shadow-none disabled:cursor-not-allowed disabled:translate-y-0 disabled:brightness-100"
              aria-label="确认出身并开始"
            >
              {isPending ? "命运开启中..." : "入世求名"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
