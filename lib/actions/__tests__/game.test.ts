import { describe, expect, it, vi } from "vitest";
import {
  advanceTurn,
  chooseRelicDraft,
  generateHeirsAction,
  loadGame,
  newGame,
  openMerchantShop,
  previewNewGame,
  submitEventChoice,
} from "../game";
import { createCharacter } from "@/lib/engine/reducer";
import { createRng } from "@/lib/engine/rng";
import type { GameState } from "@/lib/game/schema";

let mockState: GameState | null = null;

vi.mock("@/lib/db/queries", () => ({
  loadSave: vi.fn(async () => mockState),
  createSave: vi.fn(async () => "test-save-id"),
  upsertSave: vi.fn(async () => undefined),
}));

vi.mock("@/lib/ai/contracts/event", () => ({
  generateEvent: vi.fn(async () => ({
    title: "测试事件",
    description: "测试描述",
    choices: [],
    allows_free_input: false,
  })),
}));

vi.mock("@/lib/ai/contracts/eventEval", () => ({
  evaluateEventFreeInput: vi.fn(),
}));

vi.mock("@/lib/ai/contracts/npcDialogue", () => ({
  generateNpcDialogue: vi.fn(async () => ({
    dialogue: "久仰。",
    relationship_delta: 5,
  })),
}));

vi.mock("@/lib/ai/contracts/heirs", () => ({
  generateHeirs: vi.fn(async () => ({
    heirs: [
      {
        name: "陈承志",
        birth_order: "长子",
        traits: ["聪敏"],
        personality_hint: "沉静好学",
        starting_bonus: { erudition: 5, fortune: 0, drive: 0, wealth: 0 },
      },
    ],
  })),
}));

describe("game actions", () => {
  it("creates and persists a new game", async () => {
    const result = await newGame("陈", "farming_family", 1234);

    expect(result.id).toBe("test-save-id");
    expect(result.seed).toBe(1234);
    expect(result.state.dynasty.family_name).toBe("陈");
    expect(result.state.character.origin).toBe("farming_family");
    expect(result.startingPackage.bonusRelic!.id).toBe(result.state.character.relics[0]?.id);
  });

  it("loads an existing save for a returning browser", async () => {
    const state = createCharacter("陈", "farming_family", createRng(42));
    mockState = state;

    await expect(loadGame("test-save-id")).resolves.toEqual(state);
  });

  it("previews the same starting package for the same seed without creating a save", async () => {
    const first = await previewNewGame("陈", "merchant_son", 2026);
    const second = await previewNewGame("陈", "merchant_son", 2026);

    expect(first.startingPackage).toEqual(second.startingPackage);
    expect(first.state.character.stats).toEqual(second.state.character.stats);
  });

  it("creates the same starting package shown by preview for a fixed seed", async () => {
    const preview = await previewNewGame("陈", "official_decline", 777);
    const created = await newGame("陈", "official_decline", 777);

    expect(created.startingPackage).toEqual(preview.startingPackage);
    expect(created.state.character.stats).toEqual(preview.state.character.stats);
    expect(created.state.rng_seed).toBe(preview.state.rng_seed);
  });

  it("does not attach a mentor relationship when socialize creates a friend NPC", async () => {
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.turn_number = 2;
    state.rng_seed = 1;
    state.character.stats.fortune = 0;
    state.npcs = [];
    state.character.relationships = [];
    mockState = state;

    const result = await advanceTurn("test-save-id", "socialize");

    const newFriends = result.state.npcs.filter((npc) => npc.role === "friend");
    expect(newFriends.length).toBe(1);
    expect(result.state.character.relationships).toEqual([]);
  });

  it("reveals court style intel when scheming", async () => {
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.rng_seed = 5;
    state.world.court_whims_revealed.style_known = false;
    mockState = state;

    const result = await advanceTurn("test-save-id", "scheme");

    expect(result.state.world.court_whims_revealed.style_known).toBe(true);
    expect(result.npcDialogue).toContain("文风");
  });

  it("allows palace victory to generate inheritance handoff data", async () => {
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.character.titles = ["贡士", "进士"];
    state.character.family.children = [
      { name: "陈承志", born_year: state.world.year - 16, is_son: true, alive: true },
    ];
    mockState = state;

    const result = await generateHeirsAction("test-save-id", "victory");

    expect(result.gameOver).toBe(false);
    expect(result.deathReason).toBe("victory");
    expect(result.heirs[0]?.name).toBe("陈承志");
  });

  it("opens merchant shop drafts and purchases a relic", async () => {
    const state = createCharacter("陈", "merchant_son", createRng(42));
    state.character.stats.wealth = 80;
    state.rng_seed = 7;
    mockState = state;

    const shop = await openMerchantShop("test-save-id");

    expect(shop.success).toBe(true);
    expect(shop.draft?.source).toBe("shop");
    expect(shop.state.pending_relic_draft?.options).toHaveLength(3);
    if (!shop.draft) throw new Error("Expected shop draft");

    mockState = shop.state;
    const selected = shop.draft.options[0];
    const purchase = await chooseRelicDraft("test-save-id", selected.relic.id);

    expect(purchase.success).toBe(true);
    expect(purchase.relic?.id).toBe(selected.relic.id);
    expect(purchase.state.pending_relic_draft).toBeNull();
    expect(purchase.state.character.relics.map((relic) => relic.id)).toContain(selected.relic.id);
    expect(purchase.state.character.stats.wealth).toBe(80 - selected.cost);
  });

  it("submits dice event choices and returns the roll result", async () => {
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.rng_seed = 11;
    state.current_event = {
      id: "dice_event",
      type: "social",
      title: "试探",
      description: "测试描述",
      choices: [
        {
          id: "a",
          label: "应对",
          stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: 0 },
          check: {
            stat: "fortune",
            dc: 10,
            outcomes: {
              crit_success: { erudition: 0, fortune: 8, drive: 0, wealth: 0 },
              success: { erudition: 0, fortune: 4, drive: 0, wealth: 0 },
              fail: { erudition: 0, fortune: -2, drive: 0, wealth: 0 },
              crit_fail: { erudition: 0, fortune: -6, drive: -2, wealth: 0 },
            },
          },
          risk: null,
          narrative_hint: "掷骰已决。",
        },
        {
          id: "b",
          label: "避开",
          stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: 0 },
          risk: null,
          narrative_hint: "",
        },
      ],
      allows_free_input: false,
      context_for_judge: { relevant_npcs: [], relevant_items: [] },
    };
    mockState = state;

    const result = await submitEventChoice("test-save-id", "a");

    expect(result.roll).not.toBeNull();
    expect(result.narration).toBe("掷骰已决。");
    expect(result.state.current_event).toBeNull();
  });
});
