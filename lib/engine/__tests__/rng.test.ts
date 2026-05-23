import { describe, it, expect } from "vitest";
import { createRng, createRngFromState } from "../rng";

describe("rng", () => {
  describe("createRng", () => {
    it("produces deterministic sequences from the same seed", () => {
      const rng1 = createRng(42);
      const rng2 = createRng(42);

      const seq1 = Array.from({ length: 10 }, () => rng1.next());
      const seq2 = Array.from({ length: 10 }, () => rng2.next());

      expect(seq1).toEqual(seq2);
    });

    it("produces different sequences from different seeds", () => {
      const rng1 = createRng(42);
      const rng2 = createRng(123);

      const seq1 = Array.from({ length: 10 }, () => rng1.next());
      const seq2 = Array.from({ length: 10 }, () => rng2.next());

      expect(seq1).not.toEqual(seq2);
    });

    it("next() returns values in [0, 1)", () => {
      const rng = createRng(99);
      for (let i = 0; i < 1000; i++) {
        const val = rng.next();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe("nextInt", () => {
    it("returns values in [min, max] inclusive", () => {
      const rng = createRng(7);
      const results = new Set<number>();
      for (let i = 0; i < 1000; i++) {
        const val = rng.nextInt(1, 5);
        expect(val).toBeGreaterThanOrEqual(1);
        expect(val).toBeLessThanOrEqual(5);
        results.add(val);
      }
      // Should hit all values in range with 1000 tries
      expect(results.size).toBe(5);
    });

    it("returns min when min === max", () => {
      const rng = createRng(1);
      expect(rng.nextInt(3, 3)).toBe(3);
    });

    it("throws when min > max", () => {
      const rng = createRng(1);
      expect(() => rng.nextInt(5, 3)).toThrow();
    });
  });

  describe("nextFloat", () => {
    it("returns values in [min, max)", () => {
      const rng = createRng(55);
      for (let i = 0; i < 1000; i++) {
        const val = rng.nextFloat(2.0, 5.0);
        expect(val).toBeGreaterThanOrEqual(2.0);
        expect(val).toBeLessThan(5.0);
      }
    });

    it("throws when min > max", () => {
      const rng = createRng(1);
      expect(() => rng.nextFloat(5.0, 3.0)).toThrow();
    });
  });

  describe("state serialization", () => {
    it("can save and restore state", () => {
      const rng1 = createRng(42);
      // Advance a few steps
      rng1.next();
      rng1.next();
      rng1.next();

      // Save state
      const savedState = rng1.state();

      // Generate some values from the original
      const expected = Array.from({ length: 5 }, () => rng1.next());

      // Restore from saved state
      const rng2 = createRngFromState(savedState);
      const actual = Array.from({ length: 5 }, () => rng2.next());

      expect(actual).toEqual(expected);
    });
  });
});
