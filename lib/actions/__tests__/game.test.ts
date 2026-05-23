import { describe, expect, it, vi } from "vitest";
import { advanceTurn } from "../game";
import { createCharacter } from "@/lib/engine/reducer";
import { createRng } from "@/lib/engine/rng";

vi.mock("@/lib/db/client", () => ({
  getSessionId: vi.fn(async () => "test-session"),
}));

vi.mock("@/lib/db/queries", () => ({
  loadSave: vi.fn(async () => null),
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

describe("game actions", () => {
  it("does not attach a mentor relationship when socialize creates a friend NPC", async () => {
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.turn_number = 2;
    state.rng_seed = 1;
    state.character.stats.fortune = 0;
    state.npcs = [];
    state.character.relationships = [];

    const result = await advanceTurn(state, "socialize");

    const newFriends = result.state.npcs.filter((npc) => npc.role === "friend");
    expect(newFriends.length).toBe(1);
    expect(result.state.character.relationships).toEqual([]);
  });
});
