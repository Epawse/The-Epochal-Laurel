import { describe, it, expect } from "vitest";
import {
  calculateLegacyTokens,
  calculateBlessingPoints,
  heirStartingStats,
  applyGenerationDecay,
  shouldTransitionEra,
  rollNextEra,
  calculateOriginOptions,
} from "../inheritance";
import { createRng } from "../rng";
import type { Character } from "@/lib/game/schema";

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: "test_char",
    name: "Test",
    generation: 1,
    age: 50,
    max_age: 65,
    gender: "male",
    origin: "farming_family",
    origin_effects_applied: true,
    stats: { erudition: 60, fortune: 40, drive: 30, wealth: 80 },
    titles: ["秀才", "举人"],
    exam_history: [],
    relationships: [],
    inventory: [],
    traits: [],
    status_effects: [],
    family: { spouse: null, children: [] },
    ...overrides,
  };
}

describe("inheritance", () => {
  describe("calculateLegacyTokens", () => {
    it("calculates books from erudition * 0.8", () => {
      const char = makeCharacter({ stats: { erudition: 60, fortune: 40, drive: 30, wealth: 80 } });
      const tokens = calculateLegacyTokens(char);
      expect(tokens.books).toBe(48); // 60 * 0.8
    });

    it("calculates land from wealth * 0.6", () => {
      const char = makeCharacter({ stats: { erudition: 60, fortune: 40, drive: 30, wealth: 80 } });
      const tokens = calculateLegacyTokens(char);
      expect(tokens.land).toBe(48); // 80 * 0.6
    });

    it("calculates reputation as max(fortune*0.3, highest_title_value)", () => {
      // fortune*0.3 = 40*0.3 = 12, highest title (举人) = 30
      const char = makeCharacter({
        stats: { erudition: 60, fortune: 40, drive: 30, wealth: 80 },
        titles: ["秀才", "举人"],
      });
      const tokens = calculateLegacyTokens(char);
      expect(tokens.reputation).toBe(30); // max(12, 30) = 30
    });

    it("uses fortune*0.3 when higher than title value", () => {
      const char = makeCharacter({
        stats: { erudition: 60, fortune: 100, drive: 30, wealth: 80 },
        titles: ["秀才"], // value 10
      });
      const tokens = calculateLegacyTokens(char);
      expect(tokens.reputation).toBe(30); // max(100*0.3=30, 10) = 30
    });
  });

  describe("calculateBlessingPoints", () => {
    it("sums legacy tokens plus achievement bonuses", () => {
      const tokens = { books: 48, land: 48, reputation: 30 };
      const achievements = {
        firstExamPass: true,
        survivedCatastrophe: false,
        reachedAge70: true,
        raised3Sons: false,
      };
      const points = calculateBlessingPoints(tokens, achievements);
      // 48 + 48 + 30 + 20 + 15 = 161
      expect(points).toBe(161);
    });

    it("returns just token sum with no achievements", () => {
      const tokens = { books: 20, land: 30, reputation: 10 };
      const achievements = {
        firstExamPass: false,
        survivedCatastrophe: false,
        reachedAge70: false,
        raised3Sons: false,
      };
      const points = calculateBlessingPoints(tokens, achievements);
      expect(points).toBe(60);
    });

    it("adds all achievement bonuses when all true", () => {
      const tokens = { books: 0, land: 0, reputation: 0 };
      const achievements = {
        firstExamPass: true,
        survivedCatastrophe: true,
        reachedAge70: true,
        raised3Sons: true,
      };
      const points = calculateBlessingPoints(tokens, achievements);
      // 0 + 20 + 10 + 15 + 10 = 55
      expect(points).toBe(55);
    });
  });

  describe("heirStartingStats", () => {
    it("calculates starting stats from legacy tokens", () => {
      const tokens = { books: 48, land: 48, reputation: 30 };
      const bonuses = { erudition: 0, fortune: 0, drive: 0, wealth: 0 };
      const stats = heirStartingStats(tokens, bonuses);

      // erudition = 10 + 48/10 = 10 + 4.8 = 15 (rounded)
      expect(stats.erudition).toBe(15);
      // fortune = 5 + 30/20 = 5 + 1.5 = 7 (rounded)
      expect(stats.fortune).toBe(7);
      // drive = 100 always
      expect(stats.drive).toBe(100);
      // wealth = 48 * 0.5 = 24
      expect(stats.wealth).toBe(24);
    });

    it("applies blessing bonuses", () => {
      const tokens = { books: 40, land: 40, reputation: 20 };
      const bonuses = { erudition: 20, fortune: 0, drive: 0, wealth: 20 };
      const stats = heirStartingStats(tokens, bonuses);

      // erudition = 10 + 40/10 + 20 = 34
      expect(stats.erudition).toBe(34);
      // wealth = 40*0.5 + 20 = 40
      expect(stats.wealth).toBe(40);
    });
  });

  describe("applyGenerationDecay", () => {
    it("applies correct decay multipliers", () => {
      const tokens = { books: 100, land: 100, reputation: 100 };
      const decayed = applyGenerationDecay(tokens);

      expect(decayed.books).toBe(70);       // 100 * 0.7
      expect(decayed.land).toBe(90);        // 100 * 0.9
      expect(decayed.reputation).toBe(40);  // 100 * 0.4
    });

    it("rounds to integers", () => {
      const tokens = { books: 33, land: 33, reputation: 33 };
      const decayed = applyGenerationDecay(tokens);

      expect(decayed.books).toBe(23);       // 33 * 0.7 = 23.1 -> 23
      expect(decayed.land).toBe(30);        // 33 * 0.9 = 29.7 -> 30
      expect(decayed.reputation).toBe(13);  // 33 * 0.4 = 13.2 -> 13
    });
  });

  describe("shouldTransitionEra", () => {
    it("returns false when generations_since_change < 2", () => {
      const rng = createRng(42);
      expect(shouldTransitionEra(0, rng)).toBe(false);
      expect(shouldTransitionEra(1, rng)).toBe(false);
    });

    it("returns true when generations_since_change >= 3 (forced)", () => {
      const rng = createRng(42);
      expect(shouldTransitionEra(3, rng)).toBe(true);
      expect(shouldTransitionEra(5, rng)).toBe(true);
    });

    it("returns 50% chance when generations_since_change == 2", () => {
      // Run many trials to verify ~50% rate
      let transitions = 0;
      const trials = 1000;
      for (let i = 0; i < trials; i++) {
        const rng = createRng(i);
        if (shouldTransitionEra(2, rng)) transitions++;
      }
      // Should be roughly 50% (allow 40-60% range)
      expect(transitions / trials).toBeGreaterThan(0.4);
      expect(transitions / trials).toBeLessThan(0.6);
    });
  });

  describe("rollNextEra", () => {
    it("prosperity transitions to decline or invasion", () => {
      const results = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const rng = createRng(i);
        results.add(rollNextEra("prosperity", rng));
      }
      expect(results.has("decline")).toBe(true);
      expect(results.has("invasion")).toBe(true);
      expect(results.has("prosperity")).toBe(false);
      expect(results.has("restoration")).toBe(false);
    });

    it("invasion always transitions to restoration", () => {
      for (let i = 0; i < 50; i++) {
        const rng = createRng(i);
        expect(rollNextEra("invasion", rng)).toBe("restoration");
      }
    });

    it("restoration always transitions to prosperity", () => {
      for (let i = 0; i < 50; i++) {
        const rng = createRng(i);
        expect(rollNextEra("restoration", rng)).toBe("prosperity");
      }
    });

    it("decline transitions to invasion or restoration", () => {
      const results = new Set<string>();
      for (let i = 0; i < 100; i++) {
        const rng = createRng(i);
        results.add(rollNextEra("decline", rng));
      }
      expect(results.has("invasion")).toBe(true);
      expect(results.has("restoration")).toBe(true);
      expect(results.has("prosperity")).toBe(false);
      expect(results.has("decline")).toBe(false);
    });
  });

  describe("calculateOriginOptions", () => {
    it("offers farming_family and official_decline for titled characters", () => {
      const options = calculateOriginOptions(["秀才", "举人"], 30);
      expect(options).toContain("farming_family");
      expect(options).toContain("official_decline");
    });

    it("offers merchant_son and farming_family for high wealth", () => {
      const options = calculateOriginOptions([], 60);
      expect(options).toContain("merchant_son");
      expect(options).toContain("farming_family");
    });

    it("offers humble_scholar for low wealth and no title", () => {
      const options = calculateOriginOptions([], 5);
      expect(options).toContain("humble_scholar");
    });

    it("always returns at least 2 options", () => {
      const options = calculateOriginOptions([], 20);
      expect(options.length).toBeGreaterThanOrEqual(2);
    });

    it("returns at most 3 options", () => {
      const options = calculateOriginOptions(["举人"], 60);
      expect(options.length).toBeLessThanOrEqual(3);
    });
  });
});
