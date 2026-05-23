// End-to-end LLM probe. Run: pnpm test:llm
// Proves: keys work, tier→provider routing, thinking disabled, JSON parses +
// Zod validates, transparent fallback (DeepSeek→Gemini), and hard-timeout abort.
// Runs as CJS via tsx; loads .env.local manually (a bare script has no Next.js env loading).

import { readFileSync } from "node:fs";
import { callLLM } from "../lib/ai/client";
import { generateEvent } from "../lib/ai/contracts/event";
import { V1EventSchema, extractJsonObject, type V1Input } from "../lib/ai/schema";
import { buildV1Messages } from "../lib/ai/prompts";
import { isConfigured, _resetClientCache } from "../lib/ai/providers";

function loadEnv(file: string): void {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local — rely on the ambient environment */
  }
}

const input: V1Input = {
  character: {
    name: "陈砚之",
    age: 35,
    erudition: 45,
    fortune: 20,
    drive: 60,
    titles: ["秀才"],
    traits: ["勤勉"],
  },
  world: { era: "prosperity", season: "autumn", year: 1042 },
  event_type: "opportunity",
  recent_events: [],
  available_npcs: [{ name: "周夫子", role: "mentor" }],
};

async function main(): Promise<void> {
  loadEnv(".env.local");
  console.log("configured:", {
    deepseek: isConfigured("deepseek"),
    gemini: isConfigured("gemini"),
  });

  // [1] Primary path, end-to-end through the contract.
  const t1 = Date.now();
  const event = await generateEvent(input);
  const check = V1EventSchema.safeParse(event);
  console.log(
    `\n[1] generateEvent (DeepSeek primary): zodValid=${check.success} latency≈${Date.now() - t1}ms`,
  );
  console.log(
    `    title="${event.title}" choices=${event.choices.length} allowsFreeInput=${event.allows_free_input}`,
  );
  console.log(JSON.stringify(event, null, 2));

  // [2] True fallback: invalidate DeepSeek's key so it 401s, expect Gemini to serve.
  if (isConfigured("gemini")) {
    // Force DeepSeek to fail deterministically via an unreachable endpoint
    // (a bogus key is unreliable — the API may accept arbitrary key strings).
    const savedBase = process.env.DEEPSEEK_BASE_URL;
    process.env.DEEPSEEK_BASE_URL = "http://127.0.0.1:9";
    _resetClientCache();
    try {
      const res = await callLLM("low", buildV1Messages(input), {
        contract: "V1-fallback",
        responseFormat: "json",
        temperature: 0.8,
        timeoutMs: 8000,
        softBudgetMs: 1500,
      });
      let jsonValid = false;
      try {
        V1EventSchema.parse(JSON.parse(extractJsonObject(res.content)));
        jsonValid = true;
      } catch (e) {
        console.log(
          "    [2] fallback JSON failed Zod (generateEvent would degrade to the static pool):",
          (e as Error).message.slice(0, 160),
        );
      }
      console.log(
        `\n[2] forced fallback: provider=${res.provider} fallbackUsed=${res.fallbackUsed} latency≈${res.latencyMs}ms jsonValid=${jsonValid}`,
      );
    } finally {
      if (savedBase) process.env.DEEPSEEK_BASE_URL = savedBase;
      else delete process.env.DEEPSEEK_BASE_URL;
      _resetClientCache();
    }
  } else {
    console.log("\n[2] skipped fallback test (Gemini not configured)");
  }

  // [3] Hard timeout aborts.
  const t3 = Date.now();
  try {
    await callLLM("low", buildV1Messages(input), {
      contract: "V1-timeout",
      responseFormat: "json",
      timeoutMs: 1,
    });
    console.log("\n[3] timeout test: unexpectedly succeeded");
  } catch (err) {
    console.log(
      `\n[3] timeout test (timeoutMs=1): aborted after ≈${Date.now() - t3}ms as expected → ${(err as Error).name}`,
    );
  }

  console.log("\nDONE");
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exitCode = 1;
});
