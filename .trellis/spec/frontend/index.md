# Frontend Development Guidelines

> Client conventions for The Epochal Laurel (百世流芳). Stack: **Next.js App Router + React + TypeScript**, **Tailwind CSS** + **Framer Motion**, client UI state via **Zustand**.

---

## Status: pre-implementation conventions

Greenfield — no UI code exists yet. These are forward-looking conventions for the first implementers and the `trellis-implement` / `trellis-check` sub-agents, derived from the chosen stack and the game-design spec (especially core-loop.md "Key Visual/Animation Moments" and Pacing). Refine against real components as they land.

## Core principle: the server is authoritative

The game engine and all numbers live server-side (see [`../backend/`](../backend/)). The frontend **renders state and sends intents** — it never recomputes scores, stat changes, or RNG. Authoritative `GameState` arrives from Server Actions; the client keeps only *transient UI state* (which animation is playing, which modal is open, the free-text draft).

## Stack decisions (locked for v1)

| Concern | Choice |
|---------|--------|
| Rendering | React Server Components by default; `"use client"` only for interactive/animated pieces |
| Mutations | Server Actions from `lib/actions/` (no client-side fetch of game logic) |
| Client state | Zustand `useUiStore` — transient UI only |
| Styling | Tailwind CSS |
| Animation | Framer Motion (the P0/P1 moments in core-loop.md) + `prefers-reduced-motion` |
| Types | Imported from `lib/game/schema.ts` (Zod-inferred); never re-declared |

## Responsive Design

The demo target is laptop/desktop browser, but QR-code distribution means some phone access is possible. Requirements:

- **Desktop-first** layout with graceful degradation to mobile
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px) — use Tailwind defaults
- Game UI must be usable (not necessarily optimal) at 375px width
- Text-heavy screens (events, exam questions, narration) should remain readable on narrow viewports
- Animation moments (P0/P1) may simplify on small screens but must still convey the outcome
- Not mobile-first; no native app patterns (swipe gestures, bottom sheets, etc.)

## Guidelines Index

| Guide | Description |
|-------|-------------|
| [Directory Structure](./directory-structure.md) | routes, components/{game,ui}, hooks, stores |
| [Component Guidelines](./component-guidelines.md) | RSC vs client, props, the visual-moment components |
| [Hook Guidelines](./hook-guidelines.md) | use* patterns, Server-Action wrappers |
| [State Management](./state-management.md) | server-authoritative state, Zustand scope |
| [Type Safety](./type-safety.md) | shared schema types, Zod at the client boundary |
| [Quality Guidelines](./quality-guidelines.md) | a11y, testing, forbidden patterns |

---

**Language**: code/comments in English; all *displayed* game narrative is Simplified Chinese and comes from the server/AI — never hardcode Chinese gameplay strings in components (only static chrome labels).
