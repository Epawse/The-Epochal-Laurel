"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BLESSINGS } from "@/lib/game/constants";
import type { Era } from "@/lib/game/constants";
import type { GameState } from "@/lib/game/schema";
import type { I1Heirs } from "@/lib/ai/schema";
import type { LegacyTokens } from "@/lib/engine/inheritance";
import { chooseHeir, type InheritanceTrigger } from "@/lib/actions/game";
import { EraTransition } from "@/components/game/EraTransition";
import { useSessionJSON } from "@/hooks/useSessionJSON";
import { getSaveId } from "@/lib/client/saveId";

// ── Types ────────────────────────────────────────────────────────────────────

interface InheritanceData {
  state: GameState;
  heirs: I1Heirs["heirs"];
  legacyTokens: LegacyTokens;
  blessingPoints: number;
  isAdoption: boolean;
  deathReason: InheritanceTrigger;
}

// ── Helper Functions ─────────────────────────────────────────────────────────

function getPortraitSrc(age: number): string {
  if (age >= 55) return "/assets/scholar-old.png";
  if (age >= 35) return "/assets/scholar-middle.png";
  return "/assets/scholar-young.png";
}

const ERA_LABELS: Record<Era, string> = {
  prosperity: "盛世",
  decline: "衰世",
  invasion: "乱世",
  restoration: "中兴",
};

const BLESSING_EFFECT_LABELS: Record<string, string> = {
  "starting_erudition_+20": "起始学识 +20",
  "study_gain_+2": "读书收益 +2",
  "scheme_success_+15%": "钻营成功率 +15%",
  "socialize_fortune_+3": "交游运势 +3",
  "skip_mourning": "免除丁忧",
  "max_age_+10": "寿元 +10",
  "starting_wealth_+20": "起始财富 +20",
  "earn_wealth_+5": "营生收益 +5",
};

const INHERITANCE_REASON_LABELS: Record<InheritanceTrigger, string> = {
  drive_zero: "心力耗尽",
  max_age: "寿终正寝",
  victory: "功成身退",
};

// ── Page Component ───────────────────────────────────────────────────────────

export default function InheritPage() {
  const router = useRouter();
  const data = useSessionJSON<InheritanceData>("inheritance_data");
  const [selectedHeir, setSelectedHeir] = useState<number | null>(null);
  const [purchasedBlessings, setPurchasedBlessings] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [eraTransition, setEraTransition] = useState<{
    from: Era;
    to: Era;
  } | null>(null);
  const [newState, setNewState] = useState<GameState | null>(null);

  // No inheritance context → back to the daily loop.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.sessionStorage.getItem("inheritance_data");
    if (stored === null) {
      router.push("/play");
      return;
    }
    try {
      JSON.parse(stored);
    } catch {
      router.push("/play");
    }
  }, [router]);

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-serif text-lg text-bone-mute tracking-[0.18em]">
          载入中...
        </p>
      </div>
    );
  }

  const { state, heirs, legacyTokens, blessingPoints, isAdoption, deathReason } = data;
  const { character, dynasty, world } = state;

  // Calculate remaining blessing points
  const spentPoints = Array.from(purchasedBlessings).reduce((sum, id) => {
    const blessing = BLESSINGS.find((b) => b.id === id);
    return sum + (blessing?.cost ?? 0);
  }, 0);
  const remainingPoints = blessingPoints - spentPoints;

  function toggleBlessing(blessingId: string) {
    const blessing = BLESSINGS.find((b) => b.id === blessingId);
    if (!blessing) return;

    setPurchasedBlessings((prev) => {
      const next = new Set(prev);
      if (next.has(blessingId)) {
        next.delete(blessingId);
      } else {
        // Check if we can afford it
        const currentSpent = Array.from(prev).reduce((sum, id) => {
          const b = BLESSINGS.find((bl) => bl.id === id);
          return sum + (b?.cost ?? 0);
        }, 0);
        if (blessingPoints - currentSpent >= blessing.cost) {
          next.add(blessingId);
        }
      }
      return next;
    });
  }

  function handleConfirm() {
    if (selectedHeir === null || !data) return;

    startTransition(async () => {
      const currentSaveId = getSaveId();
      if (!currentSaveId) return;
      const result = await chooseHeir(
        currentSaveId,
        selectedHeir,
        Array.from(purchasedBlessings)
      );

      if (result.eraTransitioned && result.newEra) {
        setNewState(result.state);
        setEraTransition({
          from: result.oldEra as Era,
          to: result.newEra as Era,
        });
      } else {
        // No era transition, go directly to play
        sessionStorage.setItem("game_state", JSON.stringify(result.state));
        sessionStorage.removeItem("inheritance_data");
        router.push("/play");
      }
    });
  }

  function handleEraTransitionContinue() {
    if (newState) {
      sessionStorage.setItem("game_state", JSON.stringify(newState));
      sessionStorage.removeItem("inheritance_data");
      router.push("/play");
    }
  }

  // Show era transition overlay
  if (eraTransition) {
    return (
      <EraTransition
        fromEra={eraTransition.from}
        toEra={eraTransition.to}
        onContinue={handleEraTransitionContinue}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-8 max-w-[1320px] mx-auto w-full py-8 px-6 overflow-y-auto">
      {/* Header */}
      <header className="text-center">
        <span className="font-mono text-[10px] tracking-[0.3em] text-vermillion uppercase block mb-2">
          INHERITANCE
        </span>
        <h1 className="font-calli text-[44px] text-gold-glow tracking-[0.18em]">
          薪火相传
        </h1>
        <p className="font-serif text-sm text-bone-mute tracking-[0.08em] mt-2">
          {dynasty.family_name}氏 · 第{character.generation}世 · {ERA_LABELS[world.era]}
        </p>
      </header>

      {/* Ancestor Card */}
      <section className="border border-hairline bg-paper-1 p-6">
        <span className="font-mono text-[9px] tracking-[0.18em] text-bone-mute uppercase block mb-4">
          ANCESTOR
        </span>
        <div className="grid grid-cols-[180px_1fr] gap-6">
          {/* Portrait */}
          <div className="relative aspect-[3/4] bg-paper-2 border border-hairline overflow-hidden">
            <img
              src={getPortraitSrc(character.age)}
              alt={character.name}
              className="w-full h-full object-cover opacity-70 grayscale-[0.4]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-paper-0/80 to-transparent" />
            <span className="absolute bottom-2 left-3 font-calli text-lg text-bone-dim">
              {character.name}
            </span>
          </div>

          {/* Meta */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase block">
                  LIFESPAN
                </span>
                <span className="font-serif text-base text-bone tracking-[0.06em]">
                  享年{character.age}岁
                </span>
              </div>
              <div>
                <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase block">
                  HIGHEST TITLE
                </span>
                <span className="font-serif text-base text-bone tracking-[0.06em]">
                  {character.titles[character.titles.length - 1] ?? "白身"}
                </span>
              </div>
              <div>
                <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase block">
                  CAUSE
                </span>
                <span className="font-serif text-base text-bone tracking-[0.06em]">
                  {INHERITANCE_REASON_LABELS[deathReason]}
                </span>
              </div>
              <div>
                <span className="font-mono text-[9px] text-bone-mute tracking-[0.12em] uppercase block">
                  GENERATION
                </span>
                <span className="font-serif text-base text-bone tracking-[0.06em]">
                  第{character.generation}世
                </span>
              </div>
            </div>

            {/* Stats at death */}
            <div className="mt-2 pt-3 border-t border-dashed border-hairline">
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center">
                  <span className="font-mono text-[9px] text-bone-mute block">ERU</span>
                  <span className="font-serif text-sm text-bone">{character.stats.erudition}</span>
                </div>
                <div className="text-center">
                  <span className="font-mono text-[9px] text-bone-mute block">FOR</span>
                  <span className="font-serif text-sm text-bone">{character.stats.fortune}</span>
                </div>
                <div className="text-center">
                  <span className="font-mono text-[9px] text-bone-mute block">DRV</span>
                  <span className="font-serif text-sm text-bone">{character.stats.drive}</span>
                </div>
                <div className="text-center">
                  <span className="font-mono text-[9px] text-bone-mute block">WLT</span>
                  <span className="font-serif text-sm text-bone">{character.stats.wealth}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Legacy Tokens */}
      <section>
        <span className="font-mono text-[9px] tracking-[0.18em] text-bone-mute uppercase block mb-3">
          LEGACY TOKENS
        </span>
        <div className="grid grid-cols-4 gap-3">
          <TokenCard label="藏书" value={legacyTokens.books} note="学识传承" />
          <TokenCard label="田产" value={legacyTokens.land} note="家业根基" />
          <TokenCard label="声望" value={legacyTokens.reputation} note="门第名望" />
          <TokenCard label="祝福点" value={remainingPoints} note={`可用 / 总${blessingPoints}`} highlight />
        </div>
      </section>

      {/* Heir Candidates */}
      <section>
        <span className="font-mono text-[9px] tracking-[0.18em] text-bone-mute uppercase block mb-3">
          {isAdoption ? "ADOPTED HEIR" : "HEIR CANDIDATES"}
        </span>
        <div className={`grid gap-4 ${heirs.length === 1 ? "grid-cols-1 max-w-[400px]" : heirs.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {heirs.map((heir, index) => (
            <HeirCard
              key={index}
              heir={heir}
              index={index}
              selected={selectedHeir === index}
              onClick={() => setSelectedHeir(index)}
              isAdoption={isAdoption}
            />
          ))}
        </div>
      </section>

      {/* Blessings */}
      <section>
        <span className="font-mono text-[9px] tracking-[0.18em] text-bone-mute uppercase block mb-3">
          ANCESTRAL BLESSINGS
        </span>
        <div className="grid grid-cols-4 gap-3">
          {BLESSINGS.map((blessing) => (
            <BlessingCard
              key={blessing.id}
              blessing={blessing}
              purchased={purchasedBlessings.has(blessing.id)}
              affordable={remainingPoints >= blessing.cost || purchasedBlessings.has(blessing.id)}
              onClick={() => toggleBlessing(blessing.id)}
            />
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline pt-6 flex items-center justify-between">
        <div className="font-serif text-sm text-bone-mute tracking-[0.06em]">
          {selectedHeir !== null ? (
            <span>
              已选继承人：<span className="text-gold">{heirs[selectedHeir].name}</span>
              {purchasedBlessings.size > 0 && (
                <span className="ml-3">
                  · 祝福 ×{purchasedBlessings.size}
                </span>
              )}
            </span>
          ) : (
            <span className="text-bone-mute">请选择继承人</span>
          )}
        </div>
        <button
          type="button"
          disabled={selectedHeir === null || isPending}
          onClick={handleConfirm}
          className="px-8 py-3 bg-gradient-to-b from-gold-dim to-[#6b5530] text-bone border border-gold-dim font-serif text-base tracking-[0.22em] transition-all duration-200 disabled:bg-paper-2 disabled:border-hairline disabled:text-bone-mute disabled:cursor-not-allowed disabled:bg-none"
        >
          {isPending ? "传承中..." : "开启新篇"}
        </button>
      </footer>
    </div>
  );
}

// ── Sub-Components ───────────────────────────────────────────────────────────

function TokenCard({
  label,
  value,
  note,
  highlight,
}: {
  label: string;
  value: number;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div className={`border p-4 ${highlight ? "border-gold-dim bg-[rgba(201,165,90,0.06)]" : "border-hairline bg-paper-1"}`}>
      <span className="font-serif text-sm text-bone-mute tracking-[0.06em] block">
        {label}
      </span>
      <span className={`font-calli text-[28px] tracking-[0.1em] block mt-1 ${highlight ? "text-gold-glow" : "text-bone"}`}>
        {value}
      </span>
      <span className="font-mono text-[9px] text-bone-mute tracking-[0.08em] block mt-1">
        {note}
      </span>
    </div>
  );
}

function HeirCard({
  heir,
  index,
  selected,
  onClick,
  isAdoption,
}: {
  heir: I1Heirs["heirs"][number];
  index: number;
  selected: boolean;
  onClick: () => void;
  isAdoption: boolean;
}) {
  const orderLabels = ["长子", "次子", "三子"];
  const orderLabel = isAdoption ? "嗣子" : (orderLabels[index] ?? `第${index + 1}子`);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative border p-5 text-left transition-all duration-200 cursor-pointer flex flex-col gap-3 ${
        selected
          ? "border-gold bg-[rgba(201,165,90,0.08)] shadow-[0_0_12px_rgba(201,165,90,0.15)]"
          : "border-hairline bg-paper-1 hover:border-gold-dim hover:-translate-y-0.5"
      }`}
      aria-label={`Select heir: ${heir.name}`}
      aria-pressed={selected}
    >
      {/* Selected stamp */}
      {selected && (
        <span className="absolute top-3 right-3 font-calli text-[24px] text-vermillion opacity-80 rotate-[-8deg]">
          嗣
        </span>
      )}

      {/* Order label */}
      <span className="font-mono text-[10px] tracking-[0.18em] text-vermillion">
        {orderLabel}
      </span>

      {/* Name */}
      <span className="font-serif text-lg text-bone tracking-[0.1em]">
        {heir.name}
      </span>

      {/* Traits */}
      <div className="flex gap-2 flex-wrap">
        {heir.traits.map((trait) => (
          <span
            key={trait}
            className="px-2 py-0.5 border border-hairline font-serif text-xs text-bone-dim tracking-[0.04em]"
          >
            {trait}
          </span>
        ))}
      </div>

      {/* Personality hint */}
      <p className="font-serif text-xs text-bone-mute tracking-[0.04em] leading-relaxed">
        {heir.personality_hint}
      </p>

      {/* Starting bonus */}
      <div className="mt-auto pt-2 border-t border-dashed border-hairline">
        <span className="font-mono text-[10px] text-jade tracking-[0.06em]">
          {heir.starting_bonus.stat === "erudition" && "学识"}
          {heir.starting_bonus.stat === "fortune" && "运势"}
          {heir.starting_bonus.stat === "drive" && "心力"}
          {" +"}
          {heir.starting_bonus.value}
        </span>
      </div>
    </button>
  );
}

function BlessingCard({
  blessing,
  purchased,
  affordable,
  onClick,
}: {
  blessing: (typeof BLESSINGS)[number];
  purchased: boolean;
  affordable: boolean;
  onClick: () => void;
}) {
  const disabled = !purchased && !affordable;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`border p-3.5 text-left transition-all duration-200 flex flex-col gap-2 ${
        purchased
          ? "border-gold bg-[rgba(201,165,90,0.08)]"
          : disabled
          ? "border-hairline bg-paper-1 opacity-40 cursor-not-allowed"
          : "border-hairline bg-paper-1 cursor-pointer hover:border-gold-dim"
      }`}
      aria-label={`${blessing.name}: ${BLESSING_EFFECT_LABELS[blessing.effect] ?? blessing.effect}`}
      aria-pressed={purchased}
    >
      {/* Title + check */}
      <div className="flex items-center justify-between">
        <span className="font-serif text-sm text-bone tracking-[0.06em]">
          {blessing.name}
        </span>
        {purchased && (
          <span className="text-jade text-sm">&#10003;</span>
        )}
      </div>

      {/* Effect */}
      <span className="font-mono text-[10px] text-bone-mute tracking-[0.04em]">
        {BLESSING_EFFECT_LABELS[blessing.effect] ?? blessing.effect}
      </span>

      {/* Cost */}
      <span className={`font-mono text-[10px] tracking-[0.06em] mt-auto ${purchased ? "text-jade" : "text-gold-dim"}`}>
        {purchased ? `-${blessing.cost}` : `${blessing.cost} 点`}
      </span>
    </button>
  );
}
