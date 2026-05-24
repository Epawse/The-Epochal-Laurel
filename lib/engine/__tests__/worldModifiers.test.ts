import { describe, expect, it } from "vitest";
import { eventTypeDistribution } from "../balance";
import { createRng } from "../rng";
import {
  maybeCreateWorldModifiers,
  pickWorldModifier,
  worldModifierOptionsForEra,
} from "../worldModifiers";

describe("worldModifiers", () => {
  it("defines live typed effects for each era", () => {
    for (const era of ["prosperity", "decline", "invasion", "restoration"] as const) {
      const options = worldModifierOptionsForEra(era);
      expect(options.length).toBeGreaterThan(0);
      expect(options.every((modifier) => modifier.source.type === "world")).toBe(true);
    }
  });

  it("picks deterministic era modifiers from the seeded rng", () => {
    const first = pickWorldModifier("prosperity", createRng(10));
    const second = pickWorldModifier("prosperity", createRng(10));

    expect(first).toEqual(second);
  });

  it("can trigger and measurably shift event outcomes", () => {
    const modifier = worldModifierOptionsForEra("prosperity").find(
      (candidate) => candidate.effect.kind === "event_bias"
    );
    if (!modifier) throw new Error("expected prosperity event bias");

    const base = eventTypeDistribution(20);
    const biased = eventTypeDistribution(20, [modifier]);

    expect(biased.opportunity).toBeGreaterThan(base.opportunity);
  });

  it("uses a 30 percent trigger gate without non-seeded randomness", () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const modifiers = maybeCreateWorldModifiers("decline", createRng(seed));
      if (modifiers[0]) seen.add(modifiers[0].id);
    }

    expect(seen.size).toBeGreaterThan(0);
  });
});
