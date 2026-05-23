# Hook Guidelines

---

## Conventions

- Custom hooks are `use*`, live in `hooks/`, and return a typed object or tuple.
- Hooks **wrap interaction**, not game logic (logic is server-side). Typical hooks: `useAdvanceTurn`, `useSubmitExam`, `useReducedMotion`.
- Browser storage snapshot hooks must use `useSyncExternalStore`, not mount-time
  `useEffect(() => setState(...), [])`. Provide a server snapshot (`null` is fine
  for optional session handoff data) so App Router prerender/build can complete.

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

## Pattern: Session Handoff JSON

Use `useSessionJSON<T>(key)` for temporary client handoff payloads in
`sessionStorage` (`game_state`, `inheritance_data`, `palace_result`,
`dynasty_summary`). It returns `T | null` and intentionally hides the storage
mechanism so the persistence rewrite can swap internals without touching every
page.

For routes that require the payload to exist (for example `/inherit`,
`/palace`, `/play/exam`), keep a separate redirect check that treats both
missing and malformed JSON as invalid:

```ts
const data = useSessionJSON<InheritanceData>("inheritance_data");

useEffect(() => {
  const stored = window.sessionStorage.getItem("inheritance_data");
  if (stored === null) {
    router.push("/play");
    return;
  }
  try {
    JSON.parse(stored);
  } catch {
    router.push("/play");
  }
}, [router]);
```

Do not replace this with an effect that parses then `setState`s the payload;
that reintroduces the React hooks lint failure this pattern exists to avoid.

## Common mistakes

- ❌ Putting balance math in a hook.
- ❌ Hooks that own authoritative game state long-term — the server save is the source of truth; a hook holds only the latest returned snapshot.
- ❌ Missing pending state → double-submitting a turn.
- ❌ Reading `sessionStorage` in a mount effect and immediately calling
  `setState` with the parsed payload.
