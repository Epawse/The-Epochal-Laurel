import { describe, it, expect } from "vitest";
import {
  diminishingReturns,
  driveLossPerYear,
  driveLossPerSeason,
  eventChancePerSeason,
  eventTypeDistribution,
  schemeExposureChance,
  schemeExposurePenalty,
  applyActionEffects,
  clampStats,
  applyStatChanges,
} from "../balance";
import { ACTIONS } from "@/lib/game/constants";
import { createRng } from "../rng";

describe("balance", () => {
  describe("diminishingReturns", () => {
    it("matches spec example: erudition 80, base gain 5", () => {
      // effective_gain = 5 * (1 - 80/150) = 5 * (1 - 0.5333) = 5 * 0.4667 = 2.333
      const result = diminishingReturns(5, 80, 100);
      expect(result).toBeCloseTo(2.333, 2);
    });

    it("returns full gain when current value is 0", () => {
      const result = diminishingReturns(5, 0, 100);
      expect(result).toBe(5);
    });

    it("returns 0 when current value equals max * 1.5", () => {
      const result = diminishingReturns(5, 150, 100);
      expect(result).toBe(0);
    });

    it("does not apply to negative gains", () => {
      const result = diminishingReturns(-3, 80, 100);
      expect(result).toBe(-3);
    });

    it("does not return negative for values above max*1.5", () => {
      const result = diminishingReturns(5, 200, 100);
      expect(result).toBe(0);
    });
  });

  describe("driveLossPerYear", () => {
    it("returns 1 for age 16-30", () => {
      expect(driveLossPerYear(16)).toBe(1);
      expect(driveLossPerYear(20)).toBe(1);
      expect(driveLossPerYear(30)).toBe(1);
    });

    it("returns 2 for age 40", () => {
      expect(driveLossPerYear(40)).toBe(2);
    });

    it("returns 4 for age 60", () => {
      expect(driveLossPerYear(60)).toBe(4);
    });

    it("returns max(1, (age-20)/10)", () => {
      expect(driveLossPerYear(50)).toBe(3);
    });
  });

  describe("driveLossPerSeason", () => {
    it("returns driveLossPerYear / 4", () => {
      expect(driveLossPerSeason(40)).toBe(0.5);
      expect(driveLossPerSeason(60)).toBe(1);
      expect(driveLossPerSeason(20)).toBe(0.25);
    });
  });

  describe("eventChancePerSeason", () => {
    it("returns 0.20 + fortune/500", () => {
      expect(eventChancePerSeason(0)).toBe(0.20);
      expect(eventChancePerSeason(50)).toBeCloseTo(0.30);
      expect(eventChancePerSeason(100)).toBeCloseTo(0.40);
    });

    it("handles negative fortune", () => {
      expect(eventChancePerSeason(-50)).toBeCloseTo(0.10);
    });
  });

  describe("eventTypeDistribution", () => {
    it("returns correct weights for fortune < 0", () => {
      const dist = eventTypeDistribution(-10);
      expect(dist).toEqual({ opportunity: 5, misfortune: 40, social: 40, political: 15 });
    });

    it("returns correct weights for fortune 0-30", () => {
      const dist = eventTypeDistribution(15);
      expect(dist).toEqual({ opportunity: 15, misfortune: 25, social: 45, political: 15 });
    });

    it("returns correct weights for fortune 31-60", () => {
      const dist = eventTypeDistribution(45);
      expect(dist).toEqual({ opportunity: 25, misfortune: 15, social: 40, political: 20 });
    });

    it("returns correct weights for fortune > 60", () => {
      const dist = eventTypeDistribution(80);
      expect(dist).toEqual({ opportunity: 35, misfortune: 10, social: 35, political: 20 });
    });
  });

  describe("schemeExposureChance", () => {
    it("returns 0.15 for fortune 0", () => {
      expect(schemeExposureChance(0)).toBe(0.15);
    });

    it("returns 0.05 for fortune 100 (clamped min)", () => {
      expect(schemeExposureChance(100)).toBe(0.05);
    });

    it("returns 0.10 for fortune 50", () => {
      expect(schemeExposureChance(50)).toBeCloseTo(0.10);
    });

    it("clamps to 0.15 for negative fortune", () => {
      expect(schemeExposureChance(-50)).toBe(0.15);
    });
  });

  describe("schemeExposurePenalty", () => {
    it("returns correct penalty values", () => {
      const penalty = schemeExposurePenalty();
      expect(penalty).toEqual({
        erudition: -10,
        fortune: -20,
        drive: -15,
        wealth: 0,
      });
    });
  });

  describe("applyActionEffects", () => {
    it("resolves study action with deterministic RNG", () => {
      const rng = createRng(42);
      const studyAction = ACTIONS.find((a) => a.id === "study")!;
      const stats = { erudition: 30, fortune: 30, drive: 80, wealth: 20 };

      const changes = applyActionEffects(studyAction, stats, rng);

      // Erudition should be positive (3-5 range with diminishing returns)
      expect(changes.erudition).toBeGreaterThan(0);
      expect(changes.erudition).toBeLessThanOrEqual(5);
      // Drive should be -2
      expect(changes.drive).toBe(-2);
      // Fortune and wealth should be 0
      expect(changes.fortune).toBe(0);
      expect(changes.wealth).toBe(0);
    });

    it("applies diminishing returns to high erudition", () => {
      const rng1 = createRng(42);
      const rng2 = createRng(42);
      const studyAction = ACTIONS.find((a) => a.id === "study")!;

      const lowErudition = { erudition: 10, fortune: 30, drive: 80, wealth: 20 };
      const highErudition = { erudition: 90, fortune: 30, drive: 80, wealth: 20 };

      const changesLow = applyActionEffects(studyAction, lowErudition, rng1);
      const changesHigh = applyActionEffects(studyAction, highErudition, rng2);

      expect(changesHigh.erudition).toBeLessThan(changesLow.erudition);
    });

    it("resolves negative action ranges without throwing", () => {
      const rng = createRng(42);
      const schemeAction = ACTIONS.find((a) => a.id === "scheme")!;
      const stats = { erudition: 30, fortune: 30, drive: 80, wealth: 20 };

      const changes = applyActionEffects(schemeAction, stats, rng);

      expect(changes.wealth).toBeLessThanOrEqual(-3);
      expect(changes.wealth).toBeGreaterThanOrEqual(-5);
    });

    it("normalizes reversed ranges defensively", () => {
      const rng = createRng(42);
      const reversedAction = {
        id: "test",
        label: "测试",
        labelEn: "Test",
        notes: "",
        effects: {
          erudition: [0, 0] as [number, number],
          fortune: [0, 0] as [number, number],
          drive: [0, 0] as [number, number],
          wealth: [-3, -5] as [number, number],
        },
      };
      const stats = { erudition: 30, fortune: 30, drive: 80, wealth: 20 };

      const changes = applyActionEffects(reversedAction, stats, rng);

      expect(changes.wealth).toBeLessThanOrEqual(-3);
      expect(changes.wealth).toBeGreaterThanOrEqual(-5);
    });
  });

  describe("clampStats", () => {
    it("clamps stats to boundaries", () => {
      const stats = { erudition: 150, fortune: -100, drive: -10, wealth: 300 };
      const clamped = clampStats(stats);
      expect(clamped).toEqual({
        erudition: 100,
        fortune: -50,
        drive: 0,
        wealth: 200,
      });
    });

    it("does not modify stats within bounds", () => {
      const stats = { erudition: 50, fortune: 30, drive: 80, wealth: 20 };
      const clamped = clampStats(stats);
      expect(clamped).toEqual(stats);
    });
  });

  describe("applyStatChanges", () => {
    it("applies changes and clamps", () => {
      const stats = { erudition: 95, fortune: 30, drive: 5, wealth: 20 };
      const changes = { erudition: 10, fortune: -5, drive: -10, wealth: 5 };
      const result = applyStatChanges(stats, changes);
      expect(result).toEqual({
        erudition: 100, // clamped from 105
        fortune: 25,
        drive: 0, // clamped from -5
        wealth: 25,
      });
    });
  });
});
