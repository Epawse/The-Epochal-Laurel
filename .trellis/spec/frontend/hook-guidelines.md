# Hook Guidelines

---

## Conventions

- Custom hooks are `use*`, live in `hooks/`, and return a typed object or tuple.
- Hooks **wrap interaction**, not game logic (logic is server-side). Typical hooks: `useAdvanceTurn`, `useSubmitExam`, `useReducedMotion`.

## Server Actions, not data-fetching libraries

There is no client REST layer — game mutations are Server Actions. Wrap them for pending/optimistic UI with React's `useTransition` / `useActionState`:

```ts
export function useAdvanceTurn(saveId: string) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<GameState | null>(null);
  const advance = (action: SeasonAction) =>
    start(async () => {
      const res = await advanceTurn(saveId, action); // server action
      if (res.ok) setState(res.data);
      else toast(res.reason);
    });
  return { state, advance, pending };
}
```

- No SWR / React Query for v1. If read-caching becomes necessary later, add TanStack Query — don't hand-roll caches.
- Don't call `app/api/*` for anything a Server Action can do; reserve route handlers for streaming narration.

## Common mistakes

- ❌ Putting balance math in a hook.
- ❌ Hooks that own authoritative game state long-term — the server save is the source of truth; a hook holds only the latest returned snapshot.
- ❌ Missing pending state → double-submitting a turn.
