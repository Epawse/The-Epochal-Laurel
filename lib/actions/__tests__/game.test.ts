import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  advanceTurn,
  generateEventForTurn,
  generateNpcDialogueForTurn,
  chooseRelicDraft,
  generateHeirsAction,
  newGame,
  openMerchantShop,
  prefetchEvents,
  previewNewGame,
  submitEventChoice,
} from "../game";
import { createCharacter } from "@/lib/engine/reducer";
import { createRng } from "@/lib/engine/rng";
import { generateEvent } from "@/lib/ai/contracts/event";
import { generateNpcDialogue } from "@/lib/ai/contracts/npcDialogue";
import { upsertSave } from "@/lib/db/queries";
import type { EventType } from "@/lib/game/constants";
import type { CurrentEvent, GameState } from "@/lib/game/schema";

// A minimal, schema-valid CurrentEvent for seeding the prefetch cache in tests.
function makeCachedEvent(type: EventType, title: string): CurrentEvent {
  return {
    id: `cached_${type}`,
    type,
    title,
    description: "缓存事件描述",
    choices: [
      { id: "a", label: "其一", stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: 0 }, check: null, risk: null, narrative_hint: "" },
      { id: "b", label: "其二", stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: 0 }, check: null, risk: null, narrative_hint: "" },
    ],
    allows_free_input: false,
    context_for_judge: { relevant_npcs: [], relevant_items: [] },
    reward: null,
  };
}

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
    choices: [
      {
        id: "a",
        label: "应对",
        stat_changes: { erudition: 1, fortune: 0, drive: 0, wealth: 0 },
        narrative_preview: "稳妥。",
      },
      {
        id: "b",
        label: "回避",
        stat_changes: { erudition: 0, fortune: 1, drive: 0, wealth: 0 },
        narrative_preview: "退守。",
      },
    ],
    allows_free_input: false,
    free_input_context: "",
  })),
}));

vi.mock("@/lib/ai/contracts/eventEval", () => ({
  evaluateEventFreeInput: vi.fn(),
}));

vi.mock("@/lib/ai/contracts/npcDialogue", () => ({
  generateNpcDialogue: vi.fn(async () => ({
    dialogue: "久仰。",
    mood: "friendly",
    hint: null,
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
  beforeEach(() => {
    vi.mocked(generateEvent).mockReset();
    vi.mocked(generateEvent).mockImplementation(async (input) => ({
      title: `测试事件-${input.event_type}`,
      description: "测试描述",
      choices: [
        {
          id: "a",
          label: "应对",
          stat_changes: { erudition: 1, fortune: 0, drive: 0, wealth: 0 },
          narrative_preview: "稳妥。",
        },
        {
          id: "b",
          label: "回避",
          stat_changes: { erudition: 0, fortune: 1, drive: 0, wealth: 0 },
          narrative_preview: "退守。",
        },
      ],
      allows_free_input: false,
      free_input_context: "",
    }));
  });

  it("creates and persists a new game", async () => {
    const result = await newGame("陈", "farming_family", 1234);

    expect(result.id).toBe("test-save-id");
    expect(result.seed).toBe(1234);
    expect(result.state.dynasty.family_name).toBe("陈");
    expect(result.state.character.origin).toBe("farming_family");
    expect(result.startingPackage.bonusRelic!.id).toBe(result.state.character.relics[0]?.id);
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

  it("advanceTurn defers socialize NPC dialogue off the critical path", async () => {
    vi.mocked(generateNpcDialogue).mockClear();
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.rng_seed = 5;
    state.npcs = [
      {
        id: "npc_mentor",
        name: "王文远",
        role: "mentor",
        personality: "warm",
        era_introduced: state.world.era,
        generation_introduced: state.character.generation,
        alive: true,
        memory: [],
      },
    ];
    state.character.relationships = [
      { npc_id: "npc_mentor", type: "mentor", affinity: 40 },
    ];
    mockState = state;

    const result = await advanceTurn("test-save-id", "socialize");

    expect(generateNpcDialogue).not.toHaveBeenCalled();
    expect(result.pendingNpcDialogue).toBe(true);
    expect(result.npcDialogue).toContain("似有话说");
    expect(result.state.pending_npc_dialogue?.npc_id).toBe("npc_mentor");
    expect(result.state.character.relationships[0].affinity).toBe(40);
  });

  it("generateNpcDialogueForTurn fills deferred dialogue and applies relationship delta", async () => {
    vi.mocked(generateNpcDialogue).mockClear();
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.turn_number = 8;
    state.npcs = [
      {
        id: "npc_mentor",
        name: "王文远",
        role: "mentor",
        personality: "warm",
        era_introduced: state.world.era,
        generation_introduced: state.character.generation,
        alive: true,
        memory: [],
      },
    ];
    state.character.relationships = [
      { npc_id: "npc_mentor", type: "mentor", affinity: 40 },
    ];
    state.pending_npc_dialogue = {
      npc_id: "npc_mentor",
      turn_number: state.turn_number,
      interaction_type: "greeting",
    };
    mockState = state;

    const result = await generateNpcDialogueForTurn("test-save-id");

    expect(generateNpcDialogue).toHaveBeenCalledTimes(1);
    expect(result.dialogue).toBe("王文远：「久仰。」");
    expect(result.state.pending_npc_dialogue).toBeNull();
    expect(result.state.character.relationships[0].affinity).toBe(45);
    expect(result.state.npcs[0].memory).toHaveLength(1);
  });

  it("generateNpcDialogueForTurn discards stale dialogue if the save advanced while AI was running", async () => {
    vi.mocked(generateNpcDialogue).mockImplementationOnce(async () => {
      mockState = {
        ...structuredClone(mockState!),
        turn_number: mockState!.turn_number + 1,
        pending_npc_dialogue: null,
      };
      return {
        dialogue: "来迟一步。",
        mood: "friendly",
        hint: null,
        relationship_delta: 5,
      };
    });
    vi.mocked(upsertSave).mockClear();
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.turn_number = 8;
    state.npcs = [
      {
        id: "npc_mentor",
        name: "王文远",
        role: "mentor",
        personality: "warm",
        era_introduced: state.world.era,
        generation_introduced: state.character.generation,
        alive: true,
        memory: [],
      },
    ];
    state.character.relationships = [
      { npc_id: "npc_mentor", type: "mentor", affinity: 40 },
    ];
    state.pending_npc_dialogue = {
      npc_id: "npc_mentor",
      turn_number: state.turn_number,
      interaction_type: "greeting",
    };
    mockState = state;

    const result = await generateNpcDialogueForTurn("test-save-id");

    expect(result.dialogue).toBeNull();
    expect(result.state.turn_number).toBe(9);
    expect(result.state.character.relationships[0].affinity).toBe(40);
    expect(upsertSave).not.toHaveBeenCalled();
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

  it("advanceTurn never calls the event LLM and only stamps a pending marker", async () => {
    vi.mocked(generateEvent).mockClear();
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.rng_seed = 5;
    mockState = state;

    const result = await advanceTurn("test-save-id", "study");

    // The LLM is OFF the critical path: advanceTurn must not call generateEvent.
    expect(generateEvent).not.toHaveBeenCalled();

    if (result.eventTrigger) {
      // Triggered event is deferred: marker set, content not yet generated.
      expect(result.state.pending_event_type).toBe(result.eventTrigger);
      expect(result.state.pending_event_action_id).toBe("study");
      expect(result.state.current_event).toBeNull();
    } else {
      expect(result.state.pending_event_type).toBeNull();
      expect(result.state.pending_event_action_id).toBeNull();
    }
  });

  it("generateEventForTurn produces current_event from the pending marker", async () => {
    vi.mocked(generateEvent).mockClear();
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.turn_number = 4;
    state.pending_event_type = "opportunity" as EventType;
    state.pending_event_action_id = "study";
    state.current_event = null;
    state.world.events_this_era = [];
    mockState = state;

    const result = await generateEventForTurn("test-save-id");

    expect(generateEvent).toHaveBeenCalledTimes(1);
    expect(result.event).not.toBeNull();
    expect(result.event?.type).toBe("opportunity");
    expect(result.event?.title).toBe("测试事件-opportunity");
    expect(result.event?.choices).toHaveLength(2);
    expect(result.state.current_event).not.toBeNull();
    // Marker cleared and title recorded for repetition-avoidance.
    expect(result.state.pending_event_type).toBeNull();
    expect(result.state.pending_event_action_id).toBeNull();
    expect(result.state.world.events_this_era).toContain("测试事件-opportunity");
  });

  it("generateEventForTurn is a no-op when there is no pending event", async () => {
    vi.mocked(generateEvent).mockClear();
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.pending_event_type = null;
    state.pending_event_action_id = null;
    state.current_event = null;
    mockState = state;

    const result = await generateEventForTurn("test-save-id");

    expect(generateEvent).not.toHaveBeenCalled();
    expect(result.event).toBeNull();
    expect(result.state.current_event).toBeNull();
  });

  it("generateEventForTurn serves the cached event without calling the LLM on a stamp match", async () => {
    vi.mocked(generateEvent).mockClear();
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.pending_event_type = "opportunity" as EventType;
    state.pending_event_action_id = "study";
    state.current_event = null;
    state.world.events_this_era = [];
    const cached = makeCachedEvent("opportunity", "缓存机遇");
    state.event_cache = {
      study: {
        event: cached,
        action_id: "study",
        event_type: "opportunity",
        turn_number: state.turn_number,
        season: state.world.season,
        era: state.world.era,
      },
    };
    mockState = state;

    const result = await generateEventForTurn("test-save-id");

    // Cache hit: the LLM contract must NOT be called.
    expect(generateEvent).not.toHaveBeenCalled();
    expect(result.servedFromCache).toBe(true);
    expect(result.event).toEqual(cached);
    expect(result.state.current_event).toEqual(cached);
    // Consumed slot + cleared marker + recorded title.
    expect(result.state.event_cache.study).toBeUndefined();
    expect(result.state.pending_event_type).toBeNull();
    expect(result.state.pending_event_action_id).toBeNull();
    expect(result.state.world.events_this_era).toContain("缓存机遇");
  });

  it("generateEventForTurn waits for a matching in-flight prefetch instead of duplicating V1", async () => {
    try {
      vi.useFakeTimers();
      vi.mocked(generateEvent).mockClear();
      const state = createCharacter("陈", "farming_family", createRng(42));
      state.rng_seed = 9999;
      state.current_event = null;
      state.pending_event_type = null;
      state.pending_event_action_id = null;
      state.pending_relic_draft = null;
      state.event_cache = {};
      mockState = state;

      vi.mocked(generateEvent).mockImplementation(
        (input) =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                title: `预取事件-${input.event_type}`,
                description: "预取描述",
                choices: [
                  {
                    id: "a",
                    label: "应对",
                    stat_changes: { erudition: 1, fortune: 0, drive: 0, wealth: 0 },
                    narrative_preview: "稳妥。",
                  },
                  {
                    id: "b",
                    label: "回避",
                    stat_changes: { erudition: 0, fortune: 1, drive: 0, wealth: 0 },
                    narrative_preview: "退守。",
                  },
                ],
                allows_free_input: false,
                free_input_context: "",
              });
            }, input.event_type === "opportunity" ? 100 : 10_000);
          })
      );

      const prefetchPromise = prefetchEvents("test-save-id");
      await vi.advanceTimersByTimeAsync(0);
      const callsBeforeServe = vi.mocked(generateEvent).mock.calls.length;

      mockState = {
        ...structuredClone(state),
        turn_number: 1,
        world: { ...structuredClone(state.world), season: "summer" },
        pending_event_type: "opportunity",
        pending_event_action_id: "study",
        current_event: null,
      };

      const eventPromise = generateEventForTurn("test-save-id");

      await vi.advanceTimersByTimeAsync(100);
      const result = await eventPromise;

      expect(result.waitedForPrefetch).toBe(true);
      expect(result.servedFromCache).toBe(true);
      expect(result.event?.title).toBe("预取事件-opportunity");
      expect(vi.mocked(generateEvent).mock.calls.length).toBe(callsBeforeServe);
      expect(result.state.pending_event_type).toBeNull();
      expect(result.state.event_cache.study).toBeUndefined();
      await vi.runAllTimersAsync();
      await prefetchPromise;
    } finally {
      vi.useRealTimers();
    }
  });

  it("generateEventForTurn live-generates when the cache slot is empty", async () => {
    vi.mocked(generateEvent).mockClear();
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.pending_event_type = "opportunity" as EventType;
    state.pending_event_action_id = "study";
    state.current_event = null;
    state.event_cache = {};
    mockState = state;

    const result = await generateEventForTurn("test-save-id");

    expect(generateEvent).toHaveBeenCalledTimes(1);
    expect(result.servedFromCache).toBe(false);
    expect(result.event?.title).toBe("测试事件-opportunity");
  });

  it("generateEventForTurn falls back to live generation when the cached season is stale", async () => {
    vi.mocked(generateEvent).mockClear();
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.pending_event_type = "opportunity" as EventType;
    state.pending_event_action_id = "study";
    state.current_event = null;
    state.world.season = "spring";
    // Stamp targets a DIFFERENT season than the now-current one → stale.
    const stale = makeCachedEvent("opportunity", "陈旧机遇");
    state.event_cache = {
      study: {
        event: stale,
        action_id: "study",
        event_type: "opportunity",
        turn_number: state.turn_number,
        season: "summer",
        era: state.world.era,
      },
    };
    mockState = state;

    const result = await generateEventForTurn("test-save-id");

    expect(generateEvent).toHaveBeenCalledTimes(1);
    expect(result.servedFromCache).toBe(false);
    expect(result.event?.title).toBe("测试事件-opportunity");
  });

  it("prefetchEvents caches only action lookaheads that would trigger events", async () => {
    vi.mocked(generateEvent).mockClear();
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.rng_seed = 9999;
    state.current_event = null;
    state.pending_event_type = null;
    state.pending_relic_draft = null;
    state.event_cache = {};
    mockState = state;

    const result = await prefetchEvents("test-save-id");

    expect(result.skipped).toBe(false);
    expect(result.cached.sort()).toEqual(["earn", "rest", "socialize", "study"]);
    // One generateEvent call per action whose deterministic lookahead triggers.
    expect(generateEvent).toHaveBeenCalledTimes(4);
    for (const actionId of ["study", "socialize", "earn", "rest"] as const) {
      const entry = state.event_cache[actionId];
      expect(entry).toBeDefined();
      expect(entry?.action_id).toBe(actionId);
      expect(entry?.turn_number).toBe(1);
      expect(entry?.season).toBe("summer");
      expect(entry?.era).toBe(state.world.era);
      expect(entry?.event.type).toBe(entry?.event_type);
    }
    expect(state.event_cache.scheme).toBeUndefined();
  });

  it("prefetchEvents skips when an event is pending", async () => {
    vi.mocked(generateEvent).mockClear();
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.pending_event_type = "opportunity" as EventType;
    state.pending_event_action_id = "study";
    state.current_event = null;
    state.event_cache = {};
    mockState = state;

    const result = await prefetchEvents("test-save-id");

    expect(result.skipped).toBe(true);
    expect(generateEvent).not.toHaveBeenCalled();
    expect(state.event_cache).toEqual({});
  });

  it("prefetchEvents does not overwrite a save that advanced while generation was in flight", async () => {
    vi.mocked(generateEvent).mockClear();
    const state = createCharacter("陈", "farming_family", createRng(42));
    state.rng_seed = 9999;
    state.current_event = null;
    state.pending_event_type = null;
    state.pending_relic_draft = null;
    state.event_cache = {};
    mockState = state;

    vi.mocked(generateEvent).mockImplementation(async (input) => {
      // Simulate the player taking another turn before the slow prefetch completes.
      mockState = { ...structuredClone(mockState!), turn_number: mockState!.turn_number + 1 };
      return {
        title: `慢缓存${input.event_type}`,
        description: "慢缓存描述",
        choices: [
          {
            id: "a",
            label: "应对",
            stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: 0 },
            narrative_preview: "",
          },
          {
            id: "b",
            label: "作罢",
            stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: 0 },
            narrative_preview: "",
          },
        ],
        allows_free_input: false,
        free_input_context: "",
      };
    });

    const result = await prefetchEvents("test-save-id");

    expect(result.skipped).toBe(true);
    expect(mockState.event_cache).toEqual({});
  });
});
