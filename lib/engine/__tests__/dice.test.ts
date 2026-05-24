import { describe, expect, it } from "vitest";
import { rollCheck } from "../dice";
import type { Rng } from "../rng";
import type { Modifier } from "@/lib/game/schema";

function fixedRng(...values: number[]): Rng {
  let index = 0;
  return {
    next: () => 0,
    nextFloat: (min: number) => min,
    nextInt: () => {
      const value = values[index];
      index += 1;
      if (value === undefined) throw new Error("fixedRng exhausted");
      return value;
    },
    state: () => [0, 0, 0, 1],
  };
}

describe("dice", () => {
  it("rolls d20 checks with modifier and success tier", () => {
    const result = rollCheck({
      rng: fixedRng(12),
      dc: 15,
      modifier: 3,
    });

    expect(result).toEqual({
      rolls: [12],
      natural: 12,
      modifier: 3,
      total: 15,
      dc: 15,
      tier: "success",
    });
  });

  it("treats natural max as critical success", () => {
    const result = rollCheck({
      rng: fixedRng(20),
      dc: 40,
    });

    expect(result.tier).toBe("crit_success");
  });

  it("treats natural min as critical failure", () => {
    const result = rollCheck({
      rng: fixedRng(1),
      dc: 1,
      modifier: 50,
    });

    expect(result.tier).toBe("crit_fail");
  });

  it("adds dice-category modifiers from active effects", () => {
    const modifiers: Modifier[] = [
      {
        id: "exam_focus",
        source: { type: "skill", id: "focus" },
        label: "凝神",
        effect: { kind: "dice_modifier", category: "exam", value: 2 },
        turns_remaining: null,
      },
      {
        id: "expired_exam_luck",
        source: { type: "event", id: "dream" },
        label: "旧梦",
        effect: { kind: "dice_modifier", category: "exam", value: 5 },
        turns_remaining: 0,
      },
    ];

    const result = rollCheck({
      rng: fixedRng(10),
      dc: 12,
      category: "exam",
      modifiers,
    });

    expect(result.modifier).toBe(2);
    expect(result.total).toBe(12);
    expect(result.tier).toBe("success");
  });

  it("supports multi-die specs and flat dice bonuses", () => {
    const result = rollCheck({
      rng: fixedRng(3, 4),
      dc: 10,
      dice: { count: 2, sides: 6, bonus: 1 },
      modifier: 2,
    });

    expect(result.rolls).toEqual([3, 4]);
    expect(result.natural).toBe(7);
    expect(result.total).toBe(10);
  });

  it("rejects invalid dice specs loudly", () => {
    expect(() =>
      rollCheck({
        rng: fixedRng(1),
        dc: 10,
        dice: { count: 0, sides: 6 },
      })
    ).toThrow("Invalid dice count");
  });
});
