# Component Guidelines

---

## Server vs client components

- **Default to Server Components.** Static screens, layouts, leaderboard, and the initial game-state render need no `"use client"`.
- **Add `"use client"` only** for: interactivity (action buttons, free-text input), animation (Framer Motion moments), or Zustand subscriptions.
- Keep client components as leaves; pass server-fetched `GameState` down as props.

## Props

- Type props from the domain schema — never re-shape:
  ```ts
  import type { CurrentEvent } from "@/lib/game/schema";
  export function EventCard({ event, onChoose }: { event: CurrentEvent; onChoose: (id: string) => void }) { /* ... */ }
  ```
- No `any`. Avoid optional-everything; model real states with discriminated unions (e.g. exam: `{ phase: "question" } | { phase: "result"; result: ExamResult }`).
- Components are **dumb about rules**: they display the `stat_changes` the server computed; they never compute them.

## The visual moments are first-class

core-loop.md ranks moments P0–P2 with specific treatments. Implement each as a dedicated component in `components/game/moments/`:

```tsx
"use client";
import { motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function CaptureBanner({ name, rank }: { name: string; rank: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="capture-banner"
    >
      捷报！{name} 高中{rank}！
    </motion.div>
  );
}
```

## Styling

- Tailwind utility classes; extract repeated clusters into `components/ui` primitives, not `@apply` soup.
- Era changes swap a color palette (core-loop.md). Drive it from a CSS variable / `data-era` attribute on a layout wrapper, not per-component conditionals.

## Accessibility

- Every animated moment honors `prefers-reduced-motion`; the game must be fully playable with motion off.
- Action buttons are real `<button>`s, keyboard-reachable; free-text uses a labeled `<textarea>`.

## Language: Chinese-only UI

All player-facing text MUST be Simplified Chinese. No English in the game UI unless absolutely unavoidable (e.g., a third-party widget with no i18n support).

This applies to: button labels, stat names, tooltips, error/empty states, narration, relic/skill/event names, modal titles, placeholder text, loading indicators.

English is permitted only in: CSS classes, `data-` attributes, internal identifiers, code comments, and developer-facing logs — anything the player never sees.

Static chrome labels (按钮、标题、提示) live in components or `lib/game/display.ts`. Dynamic narrative text comes from the server (AI contracts generate Chinese). When adding new UI elements, source Chinese labels from `display.ts` or add them there — do not inline English strings that will be shown to the player.

## Common mistakes

- ❌ Hardcoding Chinese gameplay narrative — it comes from the server (R1 etc.). Only static chrome labels live in components.
- ❌ Recomputing a score/threshold client-side to "preview" — show server-provided previews (`narrative_preview`) instead.
- ❌ Marking a whole page `"use client"` because one button needs it.
