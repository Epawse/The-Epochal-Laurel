import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateEvent } from "../event";
import { callLLM } from "../../client";
import type { V1Input } from "../../schema";

vi.mock("../../client", () => ({
  callLLM: vi.fn(async () => {
    throw new Error("llm unavailable");
  }),
}));

vi.mock("../../../log", () => ({
  log: {
    warn: vi.fn(),
  },
}));

const mockCallLLM = vi.mocked(callLLM);

// Default for the fallback suite: every call fails so generateEvent (after its one
// retry) degrades to the static pool. Retry-specific tests override per-call.
beforeEach(() => {
  mockCallLLM.mockReset();
  mockCallLLM.mockRejectedValue(new Error("llm unavailable"));
});

afterEach(() => {
  vi.clearAllMocks();
});

function llmResult(content: string) {
  return {
    content,
    provider: "deepseek" as const,
    model: "deepseek-v4-flash",
    latencyMs: 10,
    fallbackUsed: false,
  };
}

function inputFor(eventType: V1Input["event_type"]): V1Input {
  return {
    character: {
      name: "陈伯川",
      age: 32,
      erudition: 45,
      fortune: 30,
      drive: 70,
      titles: ["秀才"],
      traits: ["谨慎"],
    },
    world: {
      era: "prosperity",
      season: "spring",
      year: 3,
    },
    event_type: eventType,
    recent_events: [],
    available_npcs: [],
    available_relic_pool: ["wenquxing_charm", "inkstone_of_focus", "lucky_coin"],
    character_skills: [],
    character_relics: [],
    world_modifier: null,
  };
}

describe("V1 event fallback", () => {
  it("degrades to a rich static opportunity event with a typed reward", async () => {
    const event = await generateEvent(inputFor("opportunity"));

    expect(event.choices).toHaveLength(2);
    expect(event.reward?.type).toBe("relic_draft");
    expect(event.reward?.relic_ids).toEqual([
      "wenquxing_charm",
      "inkstone_of_focus",
      "lucky_coin",
    ]);
  });

  it("includes dice-check choices in fallback pools", async () => {
    const event = await generateEvent(inputFor("social"));

    expect(event.choices.some((choice) => choice.check)).toBe(true);
    const checked = event.choices.find((choice) => choice.check);
    expect(checked?.check?.dc).toBeGreaterThanOrEqual(6);
    expect(checked?.check?.dc).toBeLessThanOrEqual(16);
  });

  it("does not grant AI rewards for fallback misfortune events", async () => {
    const event = await generateEvent(inputFor("misfortune"));

    expect(event.reward ?? null).toBeNull();
  });
});

describe("V1 event retry-on-parse-failure", () => {
  const validEventJson = JSON.stringify({
    title: "夜读偶得",
    description: "春夜，陈伯川挑灯夜读，忽于旧卷中得一妙解。",
    choices: [
      {
        id: "a",
        label: "趁势钻研",
        stat_changes: { erudition: 5, fortune: 0, drive: -3, wealth: 0 },
        narrative_preview: "费些精神，学识或有所长。",
        check: null,
      },
      {
        id: "b",
        label: "记下作罢",
        stat_changes: { erudition: 2, fortune: 1, drive: 0, wealth: 0 },
        narrative_preview: "稳妥行事。",
      },
    ],
    allows_free_input: true,
    free_input_context: "",
    reward: null,
  });

  it("re-calls the model once on parse failure, then returns the valid AI event", async () => {
    mockCallLLM
      .mockResolvedValueOnce(llmResult("not json at all {broken")) // first attempt: parse throws
      .mockResolvedValueOnce(llmResult(validEventJson)); // retry: valid

    const event = await generateEvent(inputFor("opportunity"));

    // Served from the AI, NOT the static pool.
    expect(event.title).toBe("夜读偶得");
    expect(mockCallLLM).toHaveBeenCalledTimes(2);
  });

  it("falls back to the static pool only after both attempts fail", async () => {
    mockCallLLM
      .mockResolvedValueOnce(llmResult("garbage"))
      .mockResolvedValueOnce(llmResult("still garbage"));

    const event = await generateEvent(inputFor("misfortune"));

    // misfortune static fallback grants no reward — proves the static path ran.
    expect(event.reward ?? null).toBeNull();
    expect(mockCallLLM).toHaveBeenCalledTimes(2);
  });
});
