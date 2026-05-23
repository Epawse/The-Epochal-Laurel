import { describe, it, expect } from "vitest";
import { createRng } from "../rng";
import {
  advanceSeason,
  applyEventChoice,
  resolveExam,
  resolvePalaceExam,
  createCharacter,
  initExamSchedule,
  resetAuxiliaryTools,
} from "../reducer";
import type { GameState } from "@/lib/game/schema";

function makeTestState(): GameState {
  const rng = createRng(42);
  return createCharacter("陈", "farming_family", rng);
}

describe("reducer", () => {
  describe("createCharacter", () => {
    it("creates a valid initial game state", () => {
      const rng = createRng(42);
      const state = createCharacter("陈", "farming_family", rng);

      expect(state.version).toBe("0.1.0");
      expect(state.character.generation).toBe(1);
      expect(state.character.age).toBe(16);
      expect(state.character.origin).toBe("farming_family");
      expect(state.dynasty.family_name).toBe("陈");
      expect(state.dynasty.total_generations).toBe(1);
      expect(state.world.era).toBe("prosperity");
      expect(state.world.season).toBe("spring");
      expect(state.turn_number).toBe(0);
    });

    it("applies origin modifiers to base stats", () => {
      const rng = createRng(42);
      const state = createCharacter("陈", "farming_family", rng);

      // Base: erudition 15, fortune 30, drive 100, wealth 5
      // Farming family: +15, +10, +0, +5
      expect(state.character.stats.erudition).toBe(30);
      expect(state.character.stats.fortune).toBe(40);
      expect(state.character.stats.drive).toBe(100);
      expect(state.character.stats.wealth).toBe(10);
    });

    it("caps drive at 100 for positive origin bonuses", () => {
      const rng = createRng(42);
      // Humble scholar has drive +10, but base is already 100
      const state = createCharacter("李", "humble_scholar", rng);
      expect(state.character.stats.drive).toBe(100);
    });

    it("applies negative drive modifier from origin", () => {
      const rng = createRng(42);
      // Official decline has drive -10
      const state = createCharacter("王", "official_decline", rng);
      expect(state.character.stats.drive).toBe(90);
    });

    it("is deterministic with same seed", () => {
      const rng1 = createRng(42);
      const rng2 = createRng(42);
      const state1 = createCharacter("陈", "farming_family", rng1);
      const state2 = createCharacter("陈", "farming_family", rng2);

      expect(state1.character.max_age).toBe(state2.character.max_age);
      expect(state1.world.court_whims).toEqual(state2.world.court_whims);
      expect(state1.rng_seed).toBe(state2.rng_seed);
    });

    it("assigns max_age in [40, 80] range", () => {
      for (let seed = 0; seed < 100; seed++) {
        const rng = createRng(seed);
        const state = createCharacter("陈", "farming_family", rng);
        expect(state.character.max_age).toBeGreaterThanOrEqual(40);
        expect(state.character.max_age).toBeLessThanOrEqual(80);
      }
    });

    it("includes origin trait", () => {
      const rng = createRng(42);
      const state = createCharacter("陈", "farming_family", rng);
      expect(state.character.traits).toContain("宗族荫庇");
    });
  });

  describe("advanceSeason", () => {
    it("advances season from spring to summer", () => {
      const state = makeTestState();
      const rng = createRng(100);
      const result = advanceSeason(state, "study", rng);

      expect(result.state.world.season).toBe("summer");
      expect(result.state.turn_number).toBe(1);
    });

    it("advances year when going from winter to spring", () => {
      const state = makeTestState();
      state.world.season = "winter";
      const rng = createRng(100);
      const result = advanceSeason(state, "study", rng);

      expect(result.state.world.season).toBe("spring");
      expect(result.state.world.year).toBe(state.world.year + 1);
      expect(result.state.character.age).toBe(state.character.age + 1);
    });

    it("applies study action effects (positive erudition)", () => {
      const state = makeTestState();
      const rng = createRng(100);
      const result = advanceSeason(state, "study", rng);

      expect(result.statChanges.erudition).toBeGreaterThan(0);
      expect(result.statChanges.drive).toBeLessThan(0);
    });

    it("applies drive decay", () => {
      const state = makeTestState();
      const rng = createRng(100);
      const result = advanceSeason(state, "rest", rng);

      // Rest gives +5~8 drive, but decay subtracts some
      // At age 16, decay is 1/year = 0.25/season, rounded to 0
      // So net drive change should be positive from rest
      expect(result.state.character.stats.drive).toBeLessThanOrEqual(100);
    });

    it("detects drive=0 death condition", () => {
      const state = makeTestState();
      state.character.stats.drive = 1;
      const rng = createRng(100);
      // Study costs -2 drive, plus decay
      const result = advanceSeason(state, "study", rng);

      if (result.state.character.stats.drive <= 0) {
        expect(result.characterDied).toBe(true);
        expect(result.deathReason).toBe("drive_zero");
      }
    });

    it("detects max_age death condition", () => {
      const state = makeTestState();
      state.character.age = state.character.max_age - 1;
      state.world.season = "winter"; // will advance year
      const rng = createRng(100);
      const result = advanceSeason(state, "rest", rng);

      expect(result.characterDied).toBe(true);
      expect(result.deathReason).toBe("max_age");
    });

    it("decrements status effect turns", () => {
      const state = makeTestState();
      state.character.status_effects = [{ type: "exam_ban", turns_remaining: 3 }];
      const rng = createRng(100);
      const result = advanceSeason(state, "study", rng);

      expect(result.state.character.status_effects[0].turns_remaining).toBe(2);
    });

    it("removes expired status effects", () => {
      const state = makeTestState();
      state.character.status_effects = [{ type: "exam_ban", turns_remaining: 1 }];
      const rng = createRng(100);
      const result = advanceSeason(state, "study", rng);

      expect(result.state.character.status_effects.length).toBe(0);
    });

    it("throws for unknown action", () => {
      const state = makeTestState();
      const rng = createRng(100);
      expect(() => advanceSeason(state, "invalid_action", rng)).toThrow();
    });
  });

  describe("applyEventChoice", () => {
    it("applies choice stat changes to character", () => {
      const state = makeTestState();
      state.current_event = {
        id: "test_event",
        type: "opportunity",
        title: "Test Event",
        description: "A test event",
        choices: [
          {
            id: "choice_a",
            label: "Choice A",
            stat_changes: { erudition: 5, fortune: -3, drive: 0, wealth: 0 },
            risk: null,
            narrative_hint: "You chose wisely",
          },
          {
            id: "choice_b",
            label: "Choice B",
            stat_changes: { erudition: 0, fortune: 5, drive: -2, wealth: 3 },
            risk: null,
            narrative_hint: "You chose boldly",
          },
        ],
        allows_free_input: false,
        context_for_judge: { relevant_npcs: [], relevant_items: [] },
      };

      const originalErudition = state.character.stats.erudition;
      const result = applyEventChoice(state, "choice_a");

      expect(result.character.stats.erudition).toBe(originalErudition + 5);
      expect(result.current_event).toBeNull();
    });

    it("throws when no current event", () => {
      const state = makeTestState();
      expect(() => applyEventChoice(state, "choice_a")).toThrow();
    });

    it("throws for unknown choice id", () => {
      const state = makeTestState();
      state.current_event = {
        id: "test_event",
        type: "opportunity",
        title: "Test",
        description: "Test",
        choices: [
          {
            id: "choice_a",
            label: "A",
            stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: 0 },
            risk: null,
            narrative_hint: "",
          },
          {
            id: "choice_b",
            label: "B",
            stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: 0 },
            risk: null,
            narrative_hint: "",
          },
        ],
        allows_free_input: false,
        context_for_judge: { relevant_npcs: [], relevant_items: [] },
      };
      expect(() => applyEventChoice(state, "nonexistent")).toThrow();
    });
  });

  describe("resolveExam", () => {
    it("awards title on pass", () => {
      const state = makeTestState();
      const result = resolveExam(state, "county", 55, true);

      expect(result.passed).toBe(true);
      expect(result.titleAwarded).toBe("秀才");
      expect(result.state.character.titles).toContain("秀才");
    });

    it("does not award title on fail", () => {
      const state = makeTestState();
      const result = resolveExam(state, "county", 30, false);

      expect(result.passed).toBe(false);
      expect(result.titleAwarded).toBeNull();
      expect(result.state.character.titles).not.toContain("秀才");
    });

    it("adds exam history entry", () => {
      const state = makeTestState();
      const result = resolveExam(state, "county", 55, true);

      expect(result.state.character.exam_history.length).toBe(1);
      expect(result.state.character.exam_history[0].level).toBe("county");
      expect(result.state.character.exam_history[0].result).toBe("pass");
      expect(result.state.character.exam_history[0].score).toBe(55);
    });

    it("applies risk penalty when provided", () => {
      const state = makeTestState();
      const originalDrive = state.character.stats.drive;
      const penalty = { erudition: 0, fortune: -5, drive: -10, wealth: 0 };
      const result = resolveExam(state, "county", 55, true, penalty);

      expect(result.state.character.stats.drive).toBe(originalDrive - 10);
      expect(result.state.character.stats.fortune).toBe(
        state.character.stats.fortune - 5
      );
    });

    it("does not duplicate title if already held", () => {
      const state = makeTestState();
      state.character.titles = ["秀才"];
      const result = resolveExam(state, "county", 55, true);

      expect(
        result.state.character.titles.filter((t) => t === "秀才").length
      ).toBe(1);
    });
  });

  describe("resolvePalaceExam", () => {
    it("assigns ranking and title based on score", () => {
      const state = makeTestState();
      state.character.titles = ["贡士"];
      const rivals = [
        { name: "Rival A", score: 90 },
        { name: "Rival B", score: 80 },
        { name: "Rival C", score: 70 },
      ];

      const result = resolvePalaceExam(state, 95, rivals);

      expect(result.playerRank).toBe(1);
      expect(result.playerTitle).toBe("状元");
      expect(result.state.character.titles).toContain("状元");
    });

    it("assigns 进士 for lowest rank", () => {
      const state = makeTestState();
      state.character.titles = ["贡士"];
      const rivals = [
        { name: "Rival A", score: 95 },
        { name: "Rival B", score: 90 },
        { name: "Rival C", score: 85 },
      ];

      const result = resolvePalaceExam(state, 60, rivals);

      expect(result.playerRank).toBe(4);
      expect(result.playerTitle).toBe("进士");
    });

    it("updates dynasty highest_title_ever", () => {
      const state = makeTestState();
      state.character.titles = ["贡士"];
      state.dynasty.highest_title_ever = "贡士";
      const rivals = [
        { name: "A", score: 80 },
        { name: "B", score: 70 },
        { name: "C", score: 60 },
      ];

      const result = resolvePalaceExam(state, 95, rivals);
      expect(result.state.dynasty.highest_title_ever).toBe("状元");
    });

    it("keeps 榜眼 above 探花 when updating dynasty highest_title_ever", () => {
      const state = makeTestState();
      state.character.titles = ["贡士"];
      state.dynasty.highest_title_ever = "榜眼";
      const rivals = [
        { name: "A", score: 95 },
        { name: "B", score: 90 },
        { name: "C", score: 60 },
      ];

      const result = resolvePalaceExam(state, 85, rivals);

      expect(result.playerTitle).toBe("探花");
      expect(result.state.dynasty.highest_title_ever).toBe("榜眼");
    });
  });

  describe("initExamSchedule", () => {
    it("returns valid schedule with positive values", () => {
      const rng = createRng(42);
      const schedule = initExamSchedule(rng);

      expect(schedule.next_county).toBeGreaterThanOrEqual(4);
      expect(schedule.next_county).toBeLessThanOrEqual(8);
      expect(schedule.next_provincial).toBeGreaterThanOrEqual(8);
      expect(schedule.next_provincial).toBeLessThanOrEqual(12);
      expect(schedule.next_metropolitan).toBeGreaterThanOrEqual(10);
      expect(schedule.next_metropolitan).toBeLessThanOrEqual(14);
    });
  });

  describe("resetAuxiliaryTools", () => {
    it("resets all tool flags", () => {
      const tools = resetAuxiliaryTools(5);

      expect(tools.cheat_sheet_used_this_cycle).toBe(false);
      expect(tools.insider_tip_used_this_cycle).toBe(false);
      expect(tools.mentor_plea_used_this_cycle).toBe(false);
      expect(tools.current_exam_cycle_start_year).toBe(5);
    });
  });
});
