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

## Pattern: fire a server action once from an effect (StrictMode-safe)

An effect that calls a server action (e.g. fetch an exam question) must guard
against React 19 StrictMode's dev `mount → cleanup → remount`, which runs the
effect twice. A `cancelled` flag set in cleanup only blocks the stale `setState`
— it does NOT stop the already-dispatched server action, so the call fires twice
(double-billing the LLM; the two responses can also desync). Use a `useRef` keyed
on the request identity so the action fires exactly once; reset the key on failure
to allow a retry:

```ts
const requestedKeyRef = useRef<string | null>(null);
useEffect(() => {
  if (!ready || data !== null || id === null) return;
  const key = `${id}:${variant}`;
  if (requestedKeyRef.current === key) return;       // StrictMode 2nd run: skip
  requestedKeyRef.current = key;
  fetchAction(id, variant)
    .then((d) => { setData(d); setLoading(false); })
    .catch(() => { requestedKeyRef.current = null; }); // allow retry
}, [ready, data, id, variant]);
```

Do NOT pair this ref-guard with a cleanup `cancelled` flag — the cleanup would
cancel the only in-flight call's `setState` while the guard blocks the
re-dispatch, leaving the UI stuck in loading. (Real case: `play/exam` double-fired
`getExamQuestion` at ~9s + ~15s; see task 06-04-ai.)

## Common mistakes

- ❌ Putting balance math in a hook.
- ❌ Hooks that own authoritative game state long-term — the server save is the source of truth; a hook holds only the latest returned snapshot.
- ❌ Missing pending state → double-submitting a turn.
- ❌ Reading `sessionStorage` in a mount effect and immediately calling
  `setState` with the parsed payload.
