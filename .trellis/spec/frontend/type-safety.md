# Type Safety

> TypeScript `strict`. One schema, shared across the wire.

---

## Single source of types

`lib/game/schema.ts` defines Zod schemas and exports inferred types; **both** server and client import from it:

```ts
export const Character = z.object({ /* ... data-model.md ... */ });
export type Character = z.infer<typeof Character>;
```

No component, hook, or action re-declares `GameState` / `Character` / etc.

## Validate at the client boundary too

Server-Action responses are already typed. But if you read external/streamed JSON (e.g. streaming narration from `app/api/ai/stream`), `Zod.parse` it before use — the same discipline the backend applies to LLM output.

## Patterns

- Model screen phases as discriminated unions, not boolean soup:
  ```ts
  type ExamView =
    | { phase: "question"; q: ExamQuestion }
    | { phase: "judging" }
    | { phase: "result"; result: ExamResult };
  ```
- Use the schema enums (`Era`, `ExamLevel`, `VictoryTier`) — never bare string literals for domain values.

## Forbidden

- ❌ `any` (use `unknown` + parse).
- ❌ `as` casts on server/LLM data.
- ❌ non-null `!` on possibly-absent fields.
- ❌ `@ts-ignore` (use `@ts-expect-error` with a reason only if truly unavoidable).
