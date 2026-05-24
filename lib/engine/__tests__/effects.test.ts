import { describe, expect, it } from "vitest";
import { ACTIONS } from "@/lib/game/constants";
import { createCharacter } from "../reducer";
import { createRng } from "../rng";
import {
  collectModifiers,
  applyActionDeltaModifiers,
  diceModifierFor,
  isActionBlocked,
  metaModifierValue,
  tickModifiers,
} from "../effects";
import { applyActionEffects } from "../balance";
import { examThreshold } from "../exam";
import type { Modifier } from "@/lib/game/schema";

describe("effects", () => {
  it("collects origin traits, relic passives, passive skills, world modifiers, and legacy statuses", () => {
    const state = createCharacter("陈", "humble_scholar", createRng(42));
    state.character.relics.push({
      id: "inkstone",
      name: "醒神砚",
      rarity: "common",
      slot: "common",
      flavor: "",
      effects: [{ kind: "dice_modifier", category: "exam", value: 2 }],
    });
    state.character.skills.push({
      id: "calm_heart",
      name: "静气",
      kind: "passive",
      effects: [{ kind: "exam_score", value: 3 }],
      cooldown_remaining: 0,
    });
    state.character.status_effects.push({ type: "mourning", turns_remaining: 2 });
    state.world.world_modifiers.push({
      id: "era_opportunity",
      source: { type: "world", id: "auspicious_era" },
      label: "天降祥瑞",
      effect: { kind: "event_bias", event_type: "opportunity", weight_mult: 1.2 },
      turns_remaining: null,
    });

    const modifiers = collectModifiers(state.character, state.world);

    expect(modifiers.map((modifier) => modifier.id)).toEqual(
      expect.arrayContaining([
        "skill_origin_humble_scholar_passive_0",
        "relic_inkstone_0",
        "skill_calm_heart_0",
        "legacy_status_mourning",
        "era_opportunity",
      ])
    );
  });

  it("routes the humble scholar trait through action_cost effects", () => {
    const state = createCharacter("陈", "humble_scholar", createRng(42));
    const modifiers = collectModifiers(state.character, state.world);
    const study = ACTIONS.find((action) => action.id === "study");
    if (!study) throw new Error("missing study action");

    const changes = applyActionEffects(study, state.character.stats, createRng(1), modifiers);

    expect(changes.drive).toBe(0);
  });

  it("keeps origin skill kits mechanically distinct from turn one", () => {
    const study = ACTIONS.find((action) => action.id === "study");
    if (!study) throw new Error("missing study action");

    const humble = createCharacter("寒", "humble_scholar", createRng(11));
    const merchant = createCharacter("商", "merchant_son", createRng(11));
    const farming = createCharacter("耕", "farming_family", createRng(11));
    const official = createCharacter("旧", "official_decline", createRng(11));

    const humbleModifiers = collectModifiers(humble.character, humble.world);
    const merchantModifiers = collectModifiers(merchant.character, merchant.world);
    const farmingModifiers = collectModifiers(farming.character, farming.world);
    const officialModifiers = collectModifiers(official.character, official.world);
    const baseProvincialThreshold = examThreshold("provincial", "prosperity", 1, 30);
    if (baseProvincialThreshold === null) throw new Error("provincial threshold should exist");

    expect(applyActionEffects(study, humble.character.stats, createRng(99), humbleModifiers).drive).toBe(0);
    expect(applyActionEffects(study, merchant.character.stats, createRng(99), merchantModifiers).drive).toBe(-2);
    expect(diceModifierFor("social", merchantModifiers)).toBe(-2);
    expect(examThreshold("provincial", "prosperity", 1, 30, farmingModifiers)).toBe(
      baseProvincialThreshold - 5
    );
    expect(metaModifierValue("starting_connection", officialModifiers)).toBe(1);
  });

  it("applies action gain values and multipliers to matching actions only", () => {
    const modifiers: Modifier[] = [
      {
        id: "merchant_lineage",
        source: { type: "blessing", id: "merchant_lineage" },
        label: "商道传家",
        effect: { kind: "action_gain", action: "earn", stat: "wealth", value: 5, mult: 2 },
        turns_remaining: null,
      },
    ];

    expect(applyActionDeltaModifiers("earn", "wealth", 6, modifiers)).toBe(22);
    expect(applyActionDeltaModifiers("study", "wealth", 0, modifiers)).toBe(0);
  });

  it("lets farming family lower the provincial threshold through exam_threshold effects", () => {
    const state = createCharacter("陈", "farming_family", createRng(42));
    const modifiers = collectModifiers(state.character, state.world);

    expect(examThreshold("provincial", "prosperity", 1, 40, modifiers)).toBe(51);
  });

  it("sums dice modifiers by category", () => {
    const modifiers: Modifier[] = [
      {
        id: "general_luck",
        source: { type: "relic", id: "coin" },
        label: "压胜钱",
        effect: { kind: "dice_modifier", category: "*", value: 1 },
        turns_remaining: null,
      },
      {
        id: "social_bonus",
        source: { type: "skill", id: "small_talk" },
        label: "善谈",
        effect: { kind: "dice_modifier", category: "social", value: 2 },
        turns_remaining: null,
      },
    ];

    expect(diceModifierFor("social", modifiers)).toBe(3);
    expect(diceModifierFor("exam", modifiers)).toBe(1);
  });

  it("bridges legacy mourning statuses to action blocks", () => {
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.character.status_effects = [{ type: "mourning", turns_remaining: 12 }];
    const modifiers = collectModifiers(state.character, state.world);

    expect(isActionBlocked("socialize", modifiers)).toBe(true);
    expect(isActionBlocked("study", modifiers)).toBe(false);
  });

  it("ticks timed modifiers and removes expired entries", () => {
    const modifiers: Modifier[] = [
      {
        id: "timed",
        source: { type: "event", id: "tea" },
        label: "清醒",
        effect: { kind: "exam_score", value: 2 },
        turns_remaining: 2,
      },
      {
        id: "expired",
        source: { type: "event", id: "rain" },
        label: "风寒",
        effect: { kind: "exam_score", value: -2 },
        turns_remaining: 1,
      },
    ];

    expect(tickModifiers(modifiers)).toEqual([
      {
        ...modifiers[0],
        turns_remaining: 1,
      },
    ]);
  });
});
