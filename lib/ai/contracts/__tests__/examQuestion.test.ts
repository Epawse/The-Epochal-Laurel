import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateExamQuestion } from "../examQuestion";
import { callLLM } from "../../client";
import type { E1Input } from "../../schema";

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

const input: E1Input = {
  exam_level: "county",
  era: "prosperity",
  court_whims: { style: "pragmatic", emperor_temperament: "benevolent" },
  year: 1042,
  character_erudition: 45,
  previous_questions_this_run: [],
};

const validQuestionJson = JSON.stringify({
  question_text: "试论今岁文教兴废之道。",
  topic_category: "governance",
  difficulty_hint: "county-level governance",
  choices: [
    { id: "a", label: "广设义学", alignment: "partial", base_score: 45, risk: null },
    {
      id: "b",
      label: "严立考课",
      alignment: "full",
      base_score: 55,
      risk: {
        condition: "temperament_mismatch",
        description: "严苛之策恐忤仁君",
        penalty: { drive: -5, fortune: -5 },
      },
    },
    {
      id: "c",
      label: "亲自讲学",
      alignment: "none",
      base_score: 65,
      risk: {
        condition: "full_mismatch",
        description: "越俎代庖恐遭非议",
        penalty: { drive: -10, fortune: -5 },
      },
    },
  ],
  free_input_hint: "可从地方实际提出可行之策",
});

describe("E1 examQuestion — provider/effort config (Gemini-first)", () => {
  it("calls the mid tier Gemini-first with minimal reasoning effort", async () => {
    mockCallLLM.mockResolvedValue(llmResult(validQuestionJson));

    await generateExamQuestion(input);

    expect(mockCallLLM).toHaveBeenCalledTimes(1);
    const [tier, , opts] = mockCallLLM.mock.calls[0];
    expect(tier).toBe("mid");
    expect(opts?.providerOrder).toEqual(["gemini", "deepseek"]);
    expect(opts?.reasoningEffort).toBe("minimal");
    // Legacy thinking flag is gone — graduated effort supersedes it.
    expect(opts?.thinking).toBeUndefined();
  });

  it("parses the AI question when JSON is valid", async () => {
    mockCallLLM.mockResolvedValue(llmResult(validQuestionJson));

    const result = await generateExamQuestion(input);

    expect(result.question_text).toContain("文教");
    expect(result.choices).toHaveLength(3);
  });

  it("tolerates trailing prose after the JSON (extractJsonObject)", async () => {
    mockCallLLM.mockResolvedValue(llmResult(validQuestionJson + "\n以上为本次考题。"));

    const result = await generateExamQuestion(input);

    expect(result.choices).toHaveLength(3);
  });

  it("falls back to a static question when the call fails (own-fallback, never throws)", async () => {
    mockCallLLM.mockRejectedValue(new Error("llm unavailable"));

    const result = await generateExamQuestion(input);

    // prosperity + county static pool entry — the fallback returns a valid E1ExamQuestion.
    expect(result.choices).toHaveLength(3);
    expect(E1ExamQuestionMatchesContract(result)).toBe(true);
  });
});

// Light structural assertion the fallback honours the E1 contract shape.
function E1ExamQuestionMatchesContract(q: {
  question_text: string;
  choices: Array<{ id: string; base_score: number }>;
}): boolean {
  return (
    typeof q.question_text === "string" &&
    q.question_text.length > 0 &&
    q.choices.length === 3 &&
    q.choices.every((c) => c.base_score >= 40 && c.base_score <= 70)
  );
}
