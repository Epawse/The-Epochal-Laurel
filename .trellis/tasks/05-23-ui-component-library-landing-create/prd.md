# UI Component Library + Landing + Create

## Goal

Build the reusable component library and the first two interactive screens (Landing, Character Creation). Components use real Zod-inferred types from `lib/game/schema.ts` with mock data — no engine dependency. This establishes the visual foundation that Task 4 wires to real server state.

## Requirements

### 1. UI Primitives (`components/ui/`)

#### Panel (`components/ui/Panel.tsx`)
- Props: `title` (CN string), `en` (English subtitle), `children`
- Decorative container: paper-1 bg, hairline border
- Corner brackets: 4 positioned `<i>` elements (14×14px, gold-dim border)
- Header: vermillion marker bar (4×16px) + title (serif 16px, gold) + en subtitle (latin-serif italic 12px, bone-mute)

#### SealStamp (`components/ui/SealStamp.tsx`)
- Props: `text`, `size` (sm/md/lg), `rotation` (degrees, default -4)
- Vermillion square with calli font text centered
- Used in TopBar brand, ResultOverlay, Leaderboard

#### StatusBadge (`components/ui/StatusBadge.tsx`)
- Props: `tier` (S/A/B/C/D/F) or `label` string, `variant` (tier/title/hint)
- Pill-shaped badge with tier-specific colors
- Used in leaderboard, palace ranking, topbar

#### SceneBackground (`components/ui/SceneBackground.tsx`)
- Props: `src` (image path), `opacity` (gradient strength 0.6–0.92)
- Fixed full-bleed image + linear-gradient ink overlay + radial-gradient vignette
- Used by landing, exam, palace, era transition screens

#### ScrollFramePanel (`components/ui/ScrollFramePanel.tsx`)
- Props: `children`
- Uses `scroll-frame.png` as background-image (100% 100%)
- Padding: `clamp(58px, 7.5%, 88px) clamp(96px, 10.5%, 132px)`
- Entry animation: scroll-unfurl (Framer Motion scaleY 0.6→1, 0.7s)

### 2. Game Components (`components/game/`)

#### TopBar (`components/game/TopBar.tsx`)
- Sticky header, grid: `auto 1fr auto`
- Left: Brand seal (vermillion square "芳") + "百世流芳" (serif, gold)
- Center: Season · Year · Era display
- Right: Character name + title pill + meta (age, generation)
- Background: semi-transparent paper-0 + backdrop-blur
- Props: `season`, `year`, `era`, `characterName`, `title`, `age`, `generation`

#### StatPanel (`components/game/StatPanel.tsx`)
- Portrait frame (aspect-ratio 3/4) with gradient overlay
- Character name overlaid at bottom-left (calli, gold-glow)
- 4 StatRow instances
- Props: `portraitSrc`, `name`, `age`, `stats` (Stats type)

#### StatRow (`components/game/StatRow.tsx`)
- Grid: label (44px) | bar (1fr) | value (36px)
- Bar: 5px height, slotted gradient per stat type
- Delta chip: slides in, jade/vermillion, clears after 1.4s
- Danger state: drive ≤ 25 → pulse animation + vermillion label
- Props: `slot` (erudition/fortune/drive/wealth), `label`, `value`, `max`, `delta?`

#### ActionCard (`components/game/ActionCard.tsx`)
- States: default, hover (translateY -3px), disabled, locked
- Content: icon medallion (96px circle) + title (serif 20px) + description + stat preview
- Locked variant: grayscale + ✕ overlay + lock-note
- Props: `action` (ActionDef type), `iconSrc`, `disabled?`, `locked?`, `lockReason?`, `onClick`

#### NarrativeStrip (`components/game/NarrativeStrip.tsx`)
- Single-line story beat display
- Content: 叙 seal marker + narrative text + timestamp
- Props: `text`, `timestamp`

#### EventChoice (`components/game/EventChoice.tsx`)
- Choice card for random event modal
- States: default, hover (gold border + translateY -2px)
- Content: key label + title + stat preview (jade/vermillion)
- Props: `choice` (from CurrentEvent schema), `index`, `onClick`

#### ExamChoice (`components/game/ExamChoice.tsx`)
- Answer option for exam scroll panel
- States: default, hover, selected (gold-glow border + corner triangle)
- Content: letter (A/B/C) + answer text
- Props: `letter`, `text`, `selected`, `onClick`

#### CourtHint (`components/game/CourtHint.tsx`)
- Court whims display row
- Tag (mono, gold-dim border) + value text
- States: hidden (???), partial (非X非Y), revealed (actual value)
- Props: `label`, `state` ("hidden" | "partial" | "full"), `value?`, `eliminated?`

### 3. Landing Page (`app/(game)/page.tsx`)

- Full-screen, centered content, no TopBar
- SceneBackground with `study-room.png` (opacity 0.78–0.92)
- Brand mark: stamp + "THE EPOCHAL LAUREL" (mono, bone-mute)
- Title: "百世流芳" (calli, clamp 64–128px, ink-bloom animation via Framer Motion)
- Subtitle: "The Epochal Laurel" (latin-serif italic, bone-dim)
- Ink divider image
- Tagline: "十年寒窗，百世流芳" (serif, bone-dim)
- 3 buttons:
  - "开创新局" (primary, vermillion) → `/create`
  - "继续旧梦" (secondary, disabled until save exists) → `/play`
  - "百世流芳榜" (link style) → `/leaderboard`
- Footer: version + "AI-NATIVE ROGUELIKE"
- Server Component (static content)

### 4. Character Creation (`app/(game)/create/page.tsx`)

- Client component (`"use client"`)
- TopBar at top (with placeholder data)
- 2-column grid: 360px portrait | 1fr main
- Left column:
  - Portrait frame with `scholar-young.png`
  - Family name input (calli font, gold-glow, centered)
  - Seal summary (selected origin + trait)
- Right column:
  - Title: "择身出世" (calli 44px) + "Choose Your Origin"
  - Intro text
  - 4-column origin grid using ORIGINS from constants.ts:
    - Each card: corner label + title (serif 22px, gold) + flavor text + stat pills + trait
    - Selected state: gold-glow border + corner triangle
  - Footer: hint text + "入世求名" confirm button (disabled until origin selected)
- State: `familyName` (string), `selectedOrigin` (Origin | null)
- On confirm: navigate to `/play` (actual Server Action wiring is Task 4)

### 5. Zustand UI Store (`lib/stores/uiStore.ts`)

Skeleton store for transient UI state:

```ts
interface UiState {
  activeMoment: "capture" | "fail" | "inheritance" | null;
  examDraft: string;
  setMoment: (m: UiState["activeMoment"]) => void;
  setExamDraft: (t: string) => void;
}
```

### 6. Route Structure

Create the `(game)` route group:
- `app/(game)/layout.tsx` — minimal wrapper (no TopBar here, screens manage their own)
- `app/(game)/page.tsx` — Landing
- `app/(game)/create/page.tsx` — Character Creation
- `app/(game)/play/page.tsx` — placeholder (Task 4)
- `app/(game)/play/layout.tsx` — placeholder with TopBar (Task 4)

## Acceptance Criteria

- [ ] All 5 UI primitives render correctly with props
- [ ] All 8 game components render with mock data
- [ ] Landing page displays with ink-bloom animation on title
- [ ] Character creation allows origin selection and family name input
- [ ] Origin cards show correct stat modifiers from `constants.ts`
- [ ] "入世求名" button disabled until origin is selected
- [ ] Zustand store exports and works in client components
- [ ] `tsc --noEmit` passes
- [ ] `next build` succeeds
- [ ] Components use types from `lib/game/schema.ts` (not ad-hoc types)
- [ ] No `any` types
- [ ] `prefers-reduced-motion` respected in Framer Motion animations

## Definition of Done

- `tsc --noEmit` passes
- `next build` succeeds
- No lint errors
- Landing and Create pages visually match prototype reference
- Components are typed with schema-derived types

## Technical Approach

- Framer Motion for component-level animations (fade/scale, stamp-down, scroll-unfurl)
- CSS keyframes in globals.css for clip-path and infinite animations (already done in T1)
- Tailwind utility classes for all styling (using design tokens from T1)
- `"use client"` only on interactive components (creation page, action cards, etc.)
- Mock data uses real schema types with hardcoded values
- `next/font/google` already configured in layout.tsx (T1)
- Install: `framer-motion`, `zustand` (if not already present)

## Out of Scope

- No Server Actions or database (Task 4)
- No game engine logic (Task 2)
- No exam flow (Task 5)
- No event modal wiring (Task 6)
- No real game state — mock data only
- No responsive/mobile optimization (Task 10)
- No P0/P1 animation polish beyond basic entry animations (Task 10)

## Spec Sources

- `frontend/component-catalog.md` — component specs
- `frontend/screen-map.md` — screen layouts and routes
- `frontend/component-guidelines.md` — coding patterns
- `frontend/state-management.md` — Zustand patterns
- `frontend/design-tokens.md` — visual reference
- `frontend/motion-patterns.md` — animation specs
- `local/claude-design-prototype/styles.css` — CSS reference
