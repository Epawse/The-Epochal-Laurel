import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { evaluateFreeText } from "../judge";
import { callLLM } from "../../client";
import type { E2Input } from "../../schema";

vi.mock("../../client", () => ({
  callLLM: vi.fn(),
}));

vi.mock("../../../log", () => ({
  log: { warn: vi.fn() },
}));

const mockCallLLM = vi.mocked(callLLM);

beforeEach(() => {
  mockCallLLM.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function llmResult(content: string) {
  return {
    content,
    provider: "gemini" as const,
    model: "gemini-3.5-flash",
    latencyMs: 10,
    fallbackUsed: false,
  };
}

const input: E2Input = {
  question_text: "论民为邦本",
  player_answer: "体恤民情，轻徭薄赋，使百姓安居。",
  court_whims: { style: "pragmatic", emperor_temperament: "benevolent" },
  exam_level: "county",
  character_erudition: 50,
  character_items: [],
};

const validJudgeJson = JSON.stringify({
  scores: { relevance: 18, cleverness: 15, alignment: 20, audacity: 12 },
  total_score: 65,
  judge_narrative: "切中民本，考官颔首。",
  special_flags: { offended_emperor: false, impressed_examiner: true, plagiarism_detected: false },
});

describe("E2 judge — provider/effort config (方案甲)", () => {
  it("calls Gemini first with low reasoning effort and a roomy token budget", async () => {
    mockCallLLM.mockResolvedValue(llmResult(validJudgeJson));

    await evaluateFreeText(input);

    expect(mockCallLLM).toHaveBeenCalledTimes(1);
    const [tier, , opts] = mockCallLLM.mock.calls[0];
    expect(tier).toBe("high");
    expect(opts?.providerOrder).toEqual(["gemini", "deepseek"]);
    expect(opts?.reasoningEffort).toBe("low");
    expect(opts?.maxTokens).toBe(2048);
    // Legacy thinking flag is gone — graduated effort supersedes it.
    expect(opts?.thinking).toBeUndefined();
  });

  it("parses the AI judge result when JSON is valid", async () => {
    mockCallLLM.mockResolvedValue(llmResult(validJudgeJson));

    const result = await evaluateFreeText(input);

    expect(result.total_score).toBe(65);
    expect(result.judge_narrative).toContain("民本");
  });

  it("tolerates reasoning preamble before the JSON (text mode + extractJsonObject)", async () => {
    mockCallLLM.mockResolvedValue(llmResult("先审其立意…\n" + validJudgeJson));

    const result = await evaluateFreeText(input);

    expect(result.total_score).toBe(65);
  });

  it("falls back to erudition*0.5 when the call fails (own-fallback, never throws)", async () => {
    mockCallLLM.mockRejectedValue(new Error("llm unavailable"));

    const result = await evaluateFreeText(input);

    // erudition 50 → base 25 → 6/dim → total 24 (the contract's safe middle ground)
    expect(result.total_score).toBe(24);
    expect(result.judge_narrative).toBe("考官阅卷匆匆，未置可否。");
  });
});
