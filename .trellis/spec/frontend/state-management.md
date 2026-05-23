# State Management

---

## The split

| State | Where | Example |
|-------|-------|---------|
| **Authoritative game state** | Server (Supabase), returned per action | `GameState` |
| **Transient UI state** | Zustand `useUiStore` (client) | active modal, which moment is animating, free-text draft |
| **URL state** | route params | current screen, save slot |

The client **never** holds a second copy of game logic. After each Server Action, **replace** the local `GameState` snapshot with the server's response — don't merge or patch it client-side (that would let the client diverge from the engine).

`sessionStorage` is currently a temporary client handoff cache between routes,
not the durable source of truth. Read JSON handoff payloads through
`useSessionJSON<T>(key)` and then replace the local snapshot only when a Server
Action returns. Future DB/save-id persistence should change that hook boundary
or the route handoff layer, not every page component.

## Zustand scope

`useUiStore` holds only ephemeral UI:

```ts
import { create } from "zustand";

export const useUiStore = create<UiState>((set) => ({
  activeMoment: null,                 // "capture" | "fail" | "inheritance" | null
  examDraft: "",
  setMoment: (m) => set({ activeMoment: m }),
  setExamDraft: (t) => set({ examDraft: t }),
}));
```

Nothing in here should be derivable from `GameState` — derive those at render time.

## Derived values

Compute display-only derivations (e.g. "drive bar %", "seasons until next exam") in the component or a selector, from the server `GameState`. Never persist derived values.

## Common mistakes

- ❌ Mirroring `GameState` into Zustand and editing it locally.
- ❌ Storing the exam score in client state before the server returns it.
- ❌ A global store for state that a single component owns.
- ❌ Treating malformed session handoff JSON as a loading state forever; required
  route payloads should redirect the player back to a valid flow.
