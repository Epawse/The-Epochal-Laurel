# Frontend Directory Structure

---

## Layout

```
app/                         # App Router (routes + layouts)
├── layout.tsx               # root: fonts, Tailwind, providers
├── page.tsx                 # landing / new-game
├── (game)/
│   ├── play/page.tsx        # daily-loop screen (season actions)
│   ├── exam/page.tsx        # examination screen
│   └── inheritance/page.tsx # heir selection
└── leaderboard/page.tsx

components/
├── ui/                      # presentational primitives — Button, Card, StatBar, Dialog
└── game/                    # domain components — bound to GameState shapes
    ├── SeasonActions.tsx
    ├── EventCard.tsx
    ├── ExamScreen.tsx
    ├── PalaceRanking.tsx
    ├── FamilyTree.tsx
    └── moments/             # the cinematic moments (core-loop.md)
        ├── CaptureBanner.tsx    # 中举 报喜 (P0)
        ├── FailRain.tsx         # 落第 (P0)
        └── InheritanceFade.tsx  # 传承 (P0)

hooks/                       # useGameState, useAdvanceTurn, useReducedMotion
stores/                      # useUiStore.ts (Zustand) — transient UI only
```

## Rules

- **`components/game/` may import domain types** from `lib/game/schema.ts`; **`components/ui/` may not** — primitives stay generic and reusable.
- One component per file, `PascalCase.tsx`. Co-locate a `*.test.tsx` next to non-trivial components.
- The "Key Visual/Animation Moments" table in core-loop.md maps 1:1 to `components/game/moments/` — each P0/P1 moment is its own component so it can be tuned or disabled independently.
- Route segments are `kebab-case`; component/hook/store files are `camelCase`/`PascalCase`.
