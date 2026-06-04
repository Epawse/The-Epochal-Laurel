import { describe, expect, it } from "vitest";
import { reasoningEffortParams, thinkingParams } from "../providers";

describe("reasoningEffortParams (graduated, per-contract override)", () => {
  it("maps effort straight to Gemini reasoning_effort", () => {
    expect(reasoningEffortParams("gemini", "minimal")).toEqual({ reasoning_effort: "minimal" });
    expect(reasoningEffortParams("gemini", "low")).toEqual({ reasoning_effort: "low" });
    expect(reasoningEffortParams("gemini", "medium")).toEqual({ reasoning_effort: "medium" });
    expect(reasoningEffortParams("gemini", "high")).toEqual({ reasoning_effort: "high" });
  });

  it("collapses effort to DeepSeek's binary thinking switch (v4 has no graduated tier)", () => {
    // minimal/low → disabled (fast, dodges the thinking-mode timeout)
    expect(reasoningEffortParams("deepseek", "minimal")).toEqual({ thinking: { type: "disabled" } });
    expect(reasoningEffortParams("deepseek", "low")).toEqual({ thinking: { type: "disabled" } });
    // medium/high → enabled
    expect(reasoningEffortParams("deepseek", "medium")).toEqual({ thinking: { type: "enabled" } });
    expect(reasoningEffortParams("deepseek", "high")).toEqual({ thinking: { type: "enabled" } });
  });

  it("lets E2's single reasoningEffort:'low' stay fast on BOTH providers", () => {
    // Gemini light-thinks (fast + intact JSON); DeepSeek fallback turns thinking off.
    expect(reasoningEffortParams("gemini", "low")).toEqual({ reasoning_effort: "low" });
    expect(reasoningEffortParams("deepseek", "low")).toEqual({ thinking: { type: "disabled" } });
  });
});

describe("thinkingParams (legacy boolean — unchanged for the 7 non-E2 contracts)", () => {
  it("keeps the existing on/off behavior", () => {
    expect(thinkingParams("deepseek", false)).toEqual({ thinking: { type: "disabled" } });
    expect(thinkingParams("deepseek", true)).toEqual({ thinking: { type: "enabled" } });
    expect(thinkingParams("gemini", false)).toEqual({ reasoning_effort: "none" });
    expect(thinkingParams("gemini", true)).toEqual({ reasoning_effort: "medium" });
  });
});
