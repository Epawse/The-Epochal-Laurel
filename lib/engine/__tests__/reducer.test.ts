import { describe, it, expect } from "vitest";
import { createRng, type Rng } from "../rng";
import {
  advanceSeason,
  applyCatastrophe,
  applyEventChoice,
  applyEventChoiceWithResult,
  applyMourning,
  resolveExam,
  resolvePalaceExam,
  resolveInheritance,
  createCharacter,
  initExamSchedule,
  resetAuxiliaryTools,
} from "../reducer";
import type { GameState } from "@/lib/game/schema";
import { collectModifiers, hasMetaModifier, isActionBlocked } from "../effects";

function makeTestState(): GameState {
  const rng = createRng(42);
  return createCharacter("陈", "farming_family", rng);
}

describe("reducer", () => {
  describe("createCharacter", () => {
    it("creates a valid initial game state", () => {
      const rng = createRng(42);
      const state = createCharacter("陈", "farming_family", rng);

      expect(state.version).toBe("0.2.0");
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
      expect(state.character.skills.map((skill) => skill.id)).toEqual(
        expect.arrayContaining([
          "origin_farming_family_passive",
          "origin_farming_family_active",
        ])
      );
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

    it("lets rest grant a short-lived inspiration exam buff", () => {
      const state = makeTestState();
      state.character.stats.drive = 80;
      const rolls = [0.1, 1];
      const rng: Rng = {
        next: () => rolls.shift() ?? 1,
        nextInt: (min) => min,
        nextFloat: () => 0,
        state: () => [1, 2, 3, 4],
      };

      const result = advanceSeason(state, "rest", rng);
      const inspiration = result.state.character.modifiers.find((modifier) =>
        modifier.id.startsWith("event_inspiration")
      );

      expect(inspiration?.effect).toEqual({ kind: "exam_score", value: 5 });
      expect(inspiration?.turns_remaining).toBe(4);
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

    it("resolves dice-check event choices through seeded roll outcomes", () => {
      const state = makeTestState();
      state.character.stats.fortune = 40;
      state.current_event = {
        id: "dice_event",
        type: "social",
        title: "席间试探",
        description: "A test event",
        choices: [
          {
            id: "choice_a",
            label: "察言观色",
            stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: 0 },
            check: {
              stat: "fortune",
              dc: 12,
              outcomes: {
                crit_success: { erudition: 0, fortune: 12, drive: 0, wealth: 0 },
                success: { erudition: 0, fortune: 6, drive: 0, wealth: 0 },
                fail: { erudition: 0, fortune: -3, drive: 0, wealth: 0 },
                crit_fail: { erudition: 0, fortune: -9, drive: -3, wealth: 0 },
              },
            },
            risk: null,
            narrative_hint: "局面有变",
          },
          {
            id: "choice_b",
            label: "退席",
            stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: 0 },
            risk: null,
            narrative_hint: "",
          },
        ],
        allows_free_input: false,
        context_for_judge: { relevant_npcs: [], relevant_items: [] },
      };

      const result = applyEventChoiceWithResult(state, "choice_a", createRng(7));
      if (!result.roll) throw new Error("expected dice roll");
      const expected = state.current_event.choices[0].check!.outcomes[result.roll.tier];

      expect(result.statChanges).toEqual(expected);
      expect(result.state.character.stats.fortune).toBe(40 + expected.fortune);
      expect(result.state.current_event).toBeNull();
    });

    it("queues relic drafts from typed event rewards", () => {
      const state = makeTestState();
      state.current_event = {
        id: "reward_event",
        type: "opportunity",
        title: "旧柜开启",
        description: "A test event",
        choices: [
          {
            id: "choice_a",
            label: "取一件",
            stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: 0 },
            risk: null,
            narrative_hint: "",
          },
          {
            id: "choice_b",
            label: "离开",
            stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: 0 },
            risk: null,
            narrative_hint: "",
          },
        ],
        allows_free_input: false,
        context_for_judge: { relevant_npcs: [], relevant_items: [] },
        reward: {
          type: "relic_draft",
          relic_ids: ["wenquxing_charm", "inkstone_of_focus", "lucky_coin"],
          skill_id: null,
          buff: null,
        },
      };

      const result = applyEventChoiceWithResult(state, "choice_a", createRng(5));

      expect(result.relicDraft?.source).toBe("event");
      expect(result.state.pending_relic_draft?.options.map((option) => option.relic.id)).toEqual([
        "wenquxing_charm",
        "inkstone_of_focus",
        "lucky_coin",
      ]);
    });
  });

  describe("mourning and catastrophe", () => {
    it("applies mourning as a typed action-block modifier", () => {
      const state = makeTestState();
      const result = applyMourning(state);
      const modifiers = collectModifiers(result.character, result.world);

      expect(isActionBlocked("socialize", modifiers)).toBe(true);
      expect(isActionBlocked("scheme", modifiers)).toBe(true);
      expect(isActionBlocked("study", modifiers)).toBe(false);
    });

    it("recognizes obituary fallback events as mourning triggers", () => {
      const state = makeTestState();
      state.current_event = {
        id: "event_misfortune_1",
        type: "misfortune",
        title: "讣音入门",
        description: "家中长辈病逝，白布悬门。",
        choices: [
          {
            id: "choice_a",
            label: "依礼守孝",
            stat_changes: { erudition: 0, fortune: 4, drive: -4, wealth: -2 },
            risk: null,
            narrative_hint: "名声稍安，仕途暂缓。",
          },
          {
            id: "choice_b",
            label: "强忍读书",
            stat_changes: { erudition: 3, fortune: -6, drive: -6, wealth: 0 },
            risk: null,
            narrative_hint: "书声未断，人言也不会断。",
          },
        ],
        allows_free_input: false,
        context_for_judge: { relevant_npcs: [], relevant_items: [] },
      };

      const result = applyEventChoiceWithResult(state, "choice_a", createRng(5));
      const modifiers = collectModifiers(result.state.character, result.state.world);

      expect(isActionBlocked("socialize", modifiers)).toBe(true);
      expect(isActionBlocked("scheme", modifiers)).toBe(true);
    });

    it("lets mourning_exemption skip mourning and gain fortune", () => {
      const state = makeTestState();
      state.character.modifiers.push({
        id: "blessing_mourning_exemption_0",
        source: { type: "blessing", id: "mourning_exemption" },
        label: "夺情特许",
        effect: { kind: "meta", key: "skip_mourning", value: 1 },
        turns_remaining: null,
      });

      const result = applyMourning(state);
      const modifiers = collectModifiers(result.character, result.world);

      expect(result.character.stats.fortune).toBe(state.character.stats.fortune + 10);
      expect(isActionBlocked("socialize", modifiers)).toBe(false);
    });

    it("marks catastrophe survival and queues a survival relic draft", () => {
      const state = makeTestState();
      const result = applyCatastrophe(state, createRng(9));
      const modifiers = collectModifiers(result.state.character, result.state.world);

      expect(hasMetaModifier("catastrophe_survivor", modifiers)).toBe(true);
      expect(result.relicDraft?.source).toBe("catastrophe");
      expect(result.state.pending_relic_draft?.options).toHaveLength(3);
      expect(result.state.character.stats.drive).toBe(state.character.stats.drive - 10);
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

  describe("resolveInheritance", () => {
    it("turns purchased inert blessings into typed modifiers for the heir", () => {
      const state = makeTestState();
      const result = resolveInheritance(
        state,
        0,
        ["photographic_memory", "merchant_lineage"],
        createRng(200)
      );

      expect(result.state.character.modifiers.map((modifier) => modifier.id)).toEqual(
        expect.arrayContaining([
          "blessing_photographic_memory_0",
          "blessing_merchant_lineage_0",
        ])
      );
      expect(result.state.dynasty.legacy.ancestral_blessings.map((blessing) => blessing.id)).toEqual(
        expect.arrayContaining(["photographic_memory", "merchant_lineage"])
      );
      expect(
        result.state.dynasty.available_blessings.find((blessing) => blessing.id === "merchant_lineage")?.unlocked
      ).toBe(true);
    });

    it("applies existing ancestral blessings without repurchasing them", () => {
      const state = makeTestState();
      state.dynasty.legacy.ancestral_blessings = [
        {
          id: "official_connections",
          name: "官场人脉",
          effect: "socialize_fortune_+3",
          unlocked_gen: 1,
        },
      ];

      const result = resolveInheritance(state, 0, [], createRng(200));

      expect(result.state.character.modifiers.map((modifier) => modifier.id)).toEqual(
        expect.arrayContaining([
          "blessing_official_connections_0",
          "blessing_official_connections_1",
        ])
      );
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
