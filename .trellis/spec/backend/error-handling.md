# Error Handling

> The defining rule for this project: an LLM failure is **not an exception to surface — it's a fallback to take.**

---

## Four failure classes (handle each differently)

| Class | Example | Handling |
|-------|---------|----------|
| **AI unavailable** | timeout, 5xx, rate limit from LLM provider | Take the contract's **Fallback** (game-design/ai-contracts.md). Never 500 the turn. |
| **AI output invalid** | LLM returns malformed/incomplete JSON | Zod parse fails → **same fallback** as unavailable. Log it. |
| **Engine invariant broken** | score > 100, negative turn, unknown era | `throw` — this is a bug. Fail loudly in dev; log + safe-abort the action in prod. |
| **Player/input error** | illegal action, can't afford a tool | Return a typed `{ ok: false, reason }` — not a throw. |

## AI calls always degrade, never crash

Every `lib/ai/contracts/*` function owns its fallback, so the caller always gets a value.

```ts
export async function generateEvent(input: V1Input): Promise<EventCard> {
  try {
    const raw = await aiClient.call("low", buildEventPrompt(input), { timeoutMs: 1500 });
    return V1Output.parse(JSON.parse(raw));   // invalid output → catch → fallback
  } catch (err) {
    log.warn("ai.fallback", { contract: "V1", reason: errMessage(err) });
    return staticEventPool(input);            // game-design/ai-contracts.md V1 Fallback
  }
}
```

## Server actions return results, not throws (for expected failures)

```ts
type ActionResult<T> = { ok: true; data: T } | { ok: false; reason: string };

export async function useTool(saveId: string, tool: ToolId): Promise<ActionResult<GameState>> {
  const state = loadSave(saveId);
  if (!state) return { ok: false, reason: "save_not_found" };
  const check = engine.canUseTool(state, tool);   // pure validation
  if (!check.ok) return { ok: false, reason: check.reason };
  // ... apply + persist ...
}
```

Unexpected/programmer errors (a thrown bug) propagate to Next.js's error boundary; expected failures are values the UI can render.

## Common mistakes

- ❌ Letting a Judge (E2) timeout fail the exam — the player loses progress. Fall back to `erudition * 0.5` (the contract's defined fallback).
- ❌ `catch (e) {}` swallowing engine bugs — only AI/validation failures get caught-and-fallen-back; engine invariant breaks must surface.
- ❌ Returning raw exception messages to the client.
