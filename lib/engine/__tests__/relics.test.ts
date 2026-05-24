import { describe, expect, it } from "vitest";
import type { Relic } from "@/lib/game/schema";
import { createCharacter, resolveInheritance } from "../reducer";
import { createRng } from "../rng";
import {
  chooseHeirloomRelic,
  chooseRelicFromDraft,
  createMerchantRelicDraft,
  createRelicDraft,
  queueRelicDraft,
  relicCost,
} from "../relics";

describe("relics", () => {
  it("creates a unique three-option draft and marks offered relics as seen", () => {
    const state = createCharacter("陈", "farming_family", createRng(42));
    const draft = createRelicDraft(state, createRng(7), "action", ["academic"]);

    expect(draft.options).toHaveLength(3);
    expect(new Set(draft.options.map((option) => option.relic.id)).size).toBe(3);
    expect(draft.options.every((option) => option.cost === 0)).toBe(true);

    const queued = queueRelicDraft(state, draft);
    expect(queued.pending_relic_draft?.id).toBe(draft.id);
    expect(queued.character.seen_relic_ids).toEqual(
      expect.arrayContaining(draft.options.map((option) => option.relic.id))
    );
  });

  it("chooses one relic from a draft and clears the pending draft", () => {
    const state = createCharacter("陈", "farming_family", createRng(42));
    const draft = createRelicDraft(state, createRng(7), "action", ["academic"]);
    const queued = queueRelicDraft(state, draft);
    const selected = draft.options[1].relic;

    const next = chooseRelicFromDraft(queued, selected.id);

    expect(next.pending_relic_draft).toBeNull();
    expect(next.character.relics.map((relic) => relic.id)).toEqual([selected.id]);
  });

  it("creates shop drafts with rarity-based costs and deducts wealth on purchase", () => {
    const state = createCharacter("陈", "merchant_son", createRng(42));
    state.character.stats.wealth = 80;
    const draft = createMerchantRelicDraft(state, createRng(4));

    expect(draft.source).toBe("shop");
    for (const option of draft.options) {
      expect(option.cost).toBe(relicCost(option.relic));
      expect(option.cost).toBeGreaterThan(0);
    }

    const queued = queueRelicDraft(state, draft);
    const selected = draft.options[0];
    const next = chooseRelicFromDraft(queued, selected.relic.id);

    expect(next.character.stats.wealth).toBe(80 - selected.cost);
    expect(next.character.relics[0].id).toBe(selected.relic.id);
  });

  it("rejects shop drafts when wealth is below the merchant threshold", () => {
    const state = createCharacter("陈", "humble_scholar", createRng(42));
    state.character.stats.wealth = 14;

    expect(() => createMerchantRelicDraft(state, createRng(4))).toThrow(
      "merchant_shop_requires_wealth_15"
    );
  });

  it("carries one heirloom-eligible relic into the next generation", () => {
    const state = createCharacter("陈", "farming_family", createRng(42));
    const heirloom: Relic = {
      id: "ancestral_abacus",
      name: "祖传算盘",
      rarity: "common",
      slot: "heirloom_eligible",
      effects: [{ kind: "action_gain", action: "earn", stat: "wealth", value: 3 }],
      flavor: "",
    };
    state.character.relics = [heirloom];

    const result = resolveInheritance(state, 0, [], createRng(10), undefined, heirloom.id);

    expect(result.state.character.relics).toEqual([heirloom]);
    expect(result.state.character.seen_relic_ids).toEqual([heirloom.id]);
    expect(result.state.dynasty.pending_heirloom).toBeNull();
  });

  it("rejects non-heirloom relics during heirloom selection", () => {
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.character.relics = [
      {
        id: "ordinary_token",
        name: "普通筹牌",
        rarity: "common",
        slot: "common",
        effects: [{ kind: "dice_modifier", category: "*", value: 1 }],
        flavor: "",
      },
    ];

    expect(() => chooseHeirloomRelic(state, "ordinary_token")).toThrow(
      "Relic is not heirloom eligible"
    );
  });
});
