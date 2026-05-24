import { describe, it, expect } from "vitest";
import {
  examThreshold,
  scoreFixedChoice,
  scoreFreeText,
  cheatSheetBonus,
  mentorPleaThreshold,
  courtWhimsAlignment,
  evaluateRiskCondition,
  palaceRanking,
  rollExamPerformance,
} from "../exam";
import type { Rng } from "../rng";

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

describe("exam", () => {
  describe("examThreshold", () => {
    it("calculates county threshold in prosperity era, gen 1", () => {
      // base 40 + era 0 + gen 0 - fortune/10
      const result = examThreshold("county", "prosperity", 1, 30);
      expect(result).toBe(40 + 0 + 0 - 3); // 37
    });

    it("calculates provincial threshold in decline era, gen 2", () => {
      // base 60 + era 5 + gen 2 - fortune/10
      const result = examThreshold("provincial", "decline", 2, 40);
      expect(result).toBe(60 + 5 + 2 - 4); // 63
    });

    it("calculates metropolitan threshold in invasion era, gen 3", () => {
      // base 75 + era 15 + gen 4 - fortune/10
      const result = examThreshold("metropolitan", "invasion", 3, 50);
      expect(result).toBe(75 + 15 + 4 - 5); // 89
    });

    it("returns null for palace exam (ranking only)", () => {
      const result = examThreshold("palace", "prosperity", 1, 30);
      expect(result).toBeNull();
    });

    it("applies restoration era modifier (+10)", () => {
      const result = examThreshold("county", "restoration", 1, 0);
      expect(result).toBe(40 + 10 + 0 - 0); // 50
    });
  });

  describe("scoreFixedChoice", () => {
    it("calculates score with all components", () => {
      // raw = 50*0.4 + 60*0.4 + full county alignment 16 = 60
      const result = scoreFixedChoice(50, 60, "full", "county");
      expect(result).toBe(60);
    });

    it("clamps score to 100", () => {
      const result = scoreFixedChoice(70, 100, "full", "county", [], { variance: 50 });
      expect(result).toBe(100);
    });

    it("clamps score to 0 minimum", () => {
      const result = scoreFixedChoice(0, 0, "none", "county", [], { variance: -50 });
      expect(result).toBe(0);
    });

    it("handles no alignment bonus", () => {
      // raw = 40*0.4 + 50*0.4 = 36
      const result = scoreFixedChoice(40, 50, "none", "county");
      expect(result).toBe(36);
    });

    it("caps misaligned metropolitan answers below the pass threshold", () => {
      const result = scoreFixedChoice(70, 100, "none", "metropolitan", [], { variance: 20 });
      expect(result).toBe(55);
    });

    it("lets exam_alignment_relax bypass the high-level alignment gate", () => {
      const result = scoreFixedChoice(
        70,
        100,
        "none",
        "metropolitan",
        [
          {
            id: "relax",
            source: { type: "relic", id: "whispered_genealogy" },
            label: "秘抄谱牒",
            effect: { kind: "exam_alignment_relax", levels: ["metropolitan"] },
            turns_remaining: null,
          },
        ],
        { variance: 20 }
      );
      expect(result).toBe(88);
    });
  });

  describe("scoreFreeText", () => {
    it("calculates score from judge score and erudition", () => {
      // raw = 80*0.55 + 60*0.4 = 68
      const result = scoreFreeText(80, 60, "county");
      expect(result).toBe(68);
    });

    it("clamps to 100", () => {
      const result = scoreFreeText(100, 100, "county", [], { variance: 20 });
      expect(result).toBe(100);
    });

    it("weights judge score below the old answer-component ceiling", () => {
      const result = scoreFreeText(100, 0, "county");
      expect(result).toBe(55);
    });

    it("caps high-level free-text answers with poor judge alignment", () => {
      const result = scoreFreeText(100, 100, "metropolitan", [], {
        judgeAlignmentScore: 5,
        variance: 20,
      });
      expect(result).toBe(55);
    });
  });

  describe("cheatSheetBonus", () => {
    it("returns erudition * 0.8 under the new scoring weights", () => {
      expect(cheatSheetBonus(50)).toBe(40);
      expect(cheatSheetBonus(100)).toBe(80);
      expect(cheatSheetBonus(0)).toBe(0);
    });
  });

  describe("rollExamPerformance", () => {
    it("returns positive variance for strong performance", () => {
      const result = rollExamPerformance(
        { erudition: 80, fortune: 40, drive: 80, wealth: 20 },
        [],
        fixedRng(12)
      );

      expect(result.total).toBe(18);
      expect(result.variance).toBe(6);
      expect(result.label).toBe("发挥良好");
    });

    it("returns critical failure variance on natural 1", () => {
      const result = rollExamPerformance(
        { erudition: 100, fortune: 100, drive: 80, wealth: 20 },
        [],
        fixedRng(1)
      );

      expect(result.variance).toBe(-15);
      expect(result.label).toBe("严重失常");
    });
  });

  describe("mentorPleaThreshold", () => {
    it("reduces threshold by 15", () => {
      expect(mentorPleaThreshold(60)).toBe(45);
      expect(mentorPleaThreshold(40)).toBe(25);
    });
  });

  describe("courtWhimsAlignment", () => {
    it("returns full alignment with +20 bonus when both match", () => {
      const result = courtWhimsAlignment(
        { style: "pragmatic", temperament: "ambitious" },
        { style: "pragmatic", emperor_temperament: "ambitious" }
      );
      expect(result).toEqual({ level: "full", bonus: 20 });
    });

    it("returns partial alignment with +10 bonus for style match only", () => {
      const result = courtWhimsAlignment(
        { style: "pragmatic", temperament: "lazy" },
        { style: "pragmatic", emperor_temperament: "ambitious" }
      );
      expect(result).toEqual({ level: "partial", bonus: 10 });
    });

    it("returns partial alignment with +10 bonus for temperament match only", () => {
      const result = courtWhimsAlignment(
        { style: "ornate", temperament: "ambitious" },
        { style: "pragmatic", emperor_temperament: "ambitious" }
      );
      expect(result).toEqual({ level: "partial", bonus: 10 });
    });

    it("returns none with 0 bonus when nothing matches", () => {
      const result = courtWhimsAlignment(
        { style: "ornate", temperament: "lazy" },
        { style: "pragmatic", emperor_temperament: "ambitious" }
      );
      expect(result).toEqual({ level: "none", bonus: 0 });
    });

    it("handles missing alignment fields", () => {
      const result = courtWhimsAlignment(
        {},
        { style: "pragmatic", emperor_temperament: "ambitious" }
      );
      expect(result).toEqual({ level: "none", bonus: 0 });
    });
  });

  describe("evaluateRiskCondition", () => {
    const courtWhims = { style: "pragmatic", emperor_temperament: "ambitious" };

    it("temperament_mismatch triggers when temperament does not match", () => {
      expect(
        evaluateRiskCondition("temperament_mismatch", courtWhims, {
          style: "pragmatic",
          temperament: "lazy",
        })
      ).toBe(true);
    });

    it("temperament_mismatch does not trigger when temperament matches", () => {
      expect(
        evaluateRiskCondition("temperament_mismatch", courtWhims, {
          style: "ornate",
          temperament: "ambitious",
        })
      ).toBe(false);
    });

    it("style_mismatch triggers when style does not match", () => {
      expect(
        evaluateRiskCondition("style_mismatch", courtWhims, {
          style: "ornate",
          temperament: "ambitious",
        })
      ).toBe(true);
    });

    it("style_mismatch does not trigger when style matches", () => {
      expect(
        evaluateRiskCondition("style_mismatch", courtWhims, {
          style: "pragmatic",
          temperament: "lazy",
        })
      ).toBe(false);
    });

    it("full_mismatch triggers when neither matches", () => {
      expect(
        evaluateRiskCondition("full_mismatch", courtWhims, {
          style: "ornate",
          temperament: "lazy",
        })
      ).toBe(true);
    });

    it("full_mismatch does not trigger when at least one matches", () => {
      expect(
        evaluateRiskCondition("full_mismatch", courtWhims, {
          style: "pragmatic",
          temperament: "lazy",
        })
      ).toBe(false);
    });
  });

  describe("palaceRanking", () => {
    it("ranks candidates by score descending", () => {
      const ranking = palaceRanking("Player", 85, [
        { name: "Rival A", score: 90 },
        { name: "Rival B", score: 80 },
        { name: "Rival C", score: 75 },
      ]);

      expect(ranking[0]).toEqual({ name: "Rival A", score: 90, rank: 1, title: "状元" });
      expect(ranking[1]).toEqual({ name: "Player", score: 85, rank: 2, title: "榜眼" });
      expect(ranking[2]).toEqual({ name: "Rival B", score: 80, rank: 3, title: "探花" });
      expect(ranking[3]).toEqual({ name: "Rival C", score: 75, rank: 4, title: "进士" });
    });

    it("assigns 状元 to highest scorer", () => {
      const ranking = palaceRanking("Player", 95, [
        { name: "Rival A", score: 90 },
        { name: "Rival B", score: 80 },
        { name: "Rival C", score: 75 },
      ]);

      expect(ranking[0].name).toBe("Player");
      expect(ranking[0].title).toBe("状元");
    });

    it("all finalists receive at least 进士", () => {
      const ranking = palaceRanking("Player", 60, [
        { name: "A", score: 90 },
        { name: "B", score: 85 },
        { name: "C", score: 80 },
      ]);

      for (const entry of ranking) {
        expect(["状元", "榜眼", "探花", "进士"]).toContain(entry.title);
      }
    });
  });
});
