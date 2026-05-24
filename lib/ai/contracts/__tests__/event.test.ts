import { describe, expect, it, vi } from "vitest";
import { generateEvent } from "../event";
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
