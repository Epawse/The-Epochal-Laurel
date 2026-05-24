import { describe, expect, it } from "vitest";
import {
  extractJsonObject,
  V1EventChoiceSchema,
  V1EventSchema,
  V2EventEvalSchema,
} from "../schema";

describe("extractJsonObject", () => {
  it("returns clean JSON unchanged", () => {
    const raw = '{"a":1,"b":"x"}';
    expect(extractJsonObject(raw)).toBe(raw);
    expect(JSON.parse(extractJsonObject(raw))).toEqual({ a: 1, b: "x" });
  });

  it("strips ```json fenced blocks", () => {
    const raw = '```json\n{"a":1}\n```';
    expect(JSON.parse(extractJsonObject(raw))).toEqual({ a: 1 });
  });

  it("strips bare ``` fenced blocks", () => {
    const raw = '```\n{"a":2}\n```';
    expect(JSON.parse(extractJsonObject(raw))).toEqual({ a: 2 });
  });

  it("drops trailing prose after the first balanced object (Gemini case)", () => {
    const raw = '{"a":1,"nested":{"b":2}}\n\n以上就是生成的事件。希望对你有帮助！';
    expect(JSON.parse(extractJsonObject(raw))).toEqual({ a: 1, nested: { b: 2 } });
  });

  it("ignores braces inside string literals", () => {
    const raw = '{"label":"选择 {不要慌}","v":3} trailing text';
    expect(JSON.parse(extractJsonObject(raw))).toEqual({ label: "选择 {不要慌}", v: 3 });
  });

  it("handles escaped quotes inside strings", () => {
    const raw = '{"q":"he said \\"hi\\"","n":4}';
    expect(JSON.parse(extractJsonObject(raw))).toEqual({ q: 'he said "hi"', n: 4 });
  });
});

// Reusable builders so each assertion changes exactly one field.
function choice(stat_changes: Record<string, number>) {
  return {
    id: "a",
    label: "选项",
    stat_changes,
    narrative_preview: "提示",
    check: null,
  };
}

function checkChoice(outcomeOverride: Record<string, number>) {
  return {
    id: "b",
    label: "赌一把",
    stat_changes: { erudition: 0, fortune: 0, drive: 0, wealth: 0 },
    narrative_preview: "提示",
    check: {
      stat: "fortune",
      dc: 10,
      outcomes: {
        crit_success: { erudition: 0, fortune: 10, drive: 0, wealth: 0 },
        success: { erudition: 0, fortune: 5, drive: 0, wealth: 0 },
        fail: { erudition: 0, fortune: -5, drive: 0, wealth: 0 },
        crit_fail: outcomeOverride,
      },
    },
  };
}

describe("V1 stat-delta guardrails (±15)", () => {
  it("accepts a choice with deltas at the ±15 boundary", () => {
    const result = V1EventChoiceSchema.safeParse(
      choice({ erudition: 15, fortune: -15, drive: 0, wealth: 0 }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a choice stat_changes with a +16 delta", () => {
    const result = V1EventChoiceSchema.safeParse(
      choice({ erudition: 16, fortune: 0, drive: 0, wealth: 0 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a choice stat_changes with a -16 delta", () => {
    const result = V1EventChoiceSchema.safeParse(
      choice({ erudition: 0, fortune: 0, drive: -16, wealth: 0 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a check.outcomes entry with a ±16 delta", () => {
    const result = V1EventChoiceSchema.safeParse(
      checkChoice({ erudition: 0, fortune: -16, drive: 0, wealth: 0 }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts a check.outcomes entry at the ±15 boundary", () => {
    const result = V1EventChoiceSchema.safeParse(
      checkChoice({ erudition: 0, fortune: -15, drive: 0, wealth: 0 }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects an out-of-range delta even inside a full V1 event", () => {
    const result = V1EventSchema.safeParse({
      title: "标题",
      description: "描述足够长。",
      choices: [
        choice({ erudition: 20, fortune: 0, drive: 0, wealth: 0 }),
        choice({ erudition: 1, fortune: 0, drive: 0, wealth: 0 }),
      ],
      allows_free_input: true,
      free_input_context: "",
      reward: null,
    });
    expect(result.success).toBe(false);
  });
});

describe("V2 stat-delta guardrails (±20)", () => {
  function evalWith(stat_changes: Record<string, number>) {
    return {
      success: true,
      plausibility_score: 70,
      stat_changes,
      narrative_result: "结果描述。",
      npc_reaction: null,
    };
  }

  it("accepts deltas at the ±20 boundary", () => {
    const result = V2EventEvalSchema.safeParse(
      evalWith({ erudition: 20, fortune: -20, drive: 0, wealth: 0 }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a +21 delta", () => {
    const result = V2EventEvalSchema.safeParse(
      evalWith({ erudition: 21, fortune: 0, drive: 0, wealth: 0 }),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a -21 delta", () => {
    const result = V2EventEvalSchema.safeParse(
      evalWith({ erudition: 0, fortune: 0, drive: 0, wealth: -21 }),
    );
    expect(result.success).toBe(false);
  });
});
