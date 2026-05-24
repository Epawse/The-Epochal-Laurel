import { describe, expect, it, vi } from "vitest";
import { advanceTurn, generateHeirsAction } from "../game";
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
});
