# Schema + Constants + Design System + Assets

## Goal

Establish the foundational layer that all subsequent tasks depend on: the authoritative game state types (Zod schemas), game constants (origins, titles, eras), the visual design system (Tailwind theme + globals.css), art assets in `public/`, and proper font loading. This is Phase 0 — nothing else can start until this lands.

## Requirements

### 1. Game State Schema (`lib/game/schema.ts`)

Full Zod schemas matching `game-design/data-model.md`:

- `CharacterSchema` — id, name, generation, age, max_age, gender, origin, stats (erudition/fortune/drive/wealth), titles, exam_history, relationships, inventory, traits, status_effects, family (spouse + children)
- `WorldSchema` — era, era_year, dynasty, year, season, court_whims (style + intensity + emperor_temperament), court_whims_revealed, events_this_era, exam_schedule, auxiliary_tools
- `DynastySchema` — family_name, total_generations, highest_title_ever, last_era_change_generation, legacy (books/land/reputation/ancestral_blessings), ancestors, blessing_points, available_blessings
- `NpcSchema` — id, name, role, personality, era_introduced, generation_introduced, alive, memory (max 10 entries)
- `CurrentEventSchema` — id, type, title, description, choices (with stat_changes + risk + narrative_hint), allows_free_input, context_for_judge
- `GameStateSchema` — version, character, world, dynasty, npcs, current_event, turn_number, rng_seed

Export inferred TypeScript types from all schemas.

### 2. Game Constants (`lib/game/constants.ts`)

Enums and lookup tables from `game-design/balance.md`:

- `Era` enum: prosperity, decline, invasion, restoration
- `Season` enum: spring, summer, autumn, winter
- `ExamLevel` enum: county, provincial, metropolitan, palace
- `Origin` enum + `ORIGINS` table with spec-correct stat modifiers:
  - humble_scholar: erudition+5, fortune-20, drive+10, wealth 0
  - farming_family: erudition+15, fortune+10, drive 0, wealth+5
  - merchant_son: erudition 0, fortune+5, drive 0, wealth+30
  - official_decline: erudition+10, fortune-10, drive-10, wealth+10
- `TITLE_VALUES` map: 秀才=10, 举人=30, 贡士=50, 进士=80, 状元=100
- `BASE_STATS` for generation 1: erudition 15, fortune 30, drive 100, wealth 5
- `STAT_BOUNDARIES`: min/max per stat
- `ACTION_DEFINITIONS`: the 5 actions with their stat effect ranges
- `ERA_MODIFIERS`: exam threshold modifier, event danger, opportunity frequency per era
- `EXAM_THRESHOLDS`: base threshold per exam level (40/60/75)
- `BLESSING_CATEGORIES`: academic, social, survival, wealth

### 3. Tailwind Theme (`globals.css` with `@theme inline`)

Register design-tokens.md colors + fonts in Tailwind v4 syntax:

- 19 color tokens (ink, paper-0..3, paper-bone, hairline, gold, vermillion, jade, smoke, bone, etc.)
- Semantic aliases (background, foreground, card, accent, destructive, positive, muted)
- 5 font stack CSS custom properties (--font-serif, --font-sans, --font-mono, --font-latin-serif, --font-calli)
- Register fonts in `@theme inline` block

### 4. Globals.css Effects (~100 lines)

Effects that can't be expressed as Tailwind utilities:

- Paper grain SVG `feTurbulence` texture overlay (mix-blend-mode: overlay)
- Vignette radial gradient (fixed, pointer-events: none)
- `@keyframes era-wipe` (clip-path polygon animation, 2.4s)
- `@keyframes danger-pulse` (box-shadow pulse for spirit ≤ 25)
- `@keyframes stamp-down` (scale 2.4→1 with rotation)
- `@media (prefers-reduced-motion: reduce)` overrides

### 5. Assets Migration

Copy all 34 PNG assets from `local/claude-design-prototype/assets/` to `public/assets/`:
- Scenes: study-room, examination-hall, imperial-court, village, village--invasion, study-room--invasion
- Portraits: scholar-young, scholar-middle, scholar-old
- Moments: exam-pass, exam-fail, inheritance, scheme-exposure, palace-exam
- UI Frames: scroll-frame, seal-blank-red, seal-blank-grey
- Dividers: ink-divider-simple, ink-divider-plum
- Action Icons: action-study, action-socialize, action-earn, action-rest, action-scheme
- NPCs: mentor, spouse, examiner-strict, examiner-corrupt, rival-arrogant, rival-cunning
- Reference: reference-01 through reference-04

### 6. Font Loading (`app/layout.tsx`)

Replace default Geist fonts with game font stack via `next/font/google`:
- Noto Serif SC (400, 500, 600, 700) — primary body/panel font
- Noto Sans SC (300, 400, 500, 600) — base sans font
- Ma Shan Zheng (400) — calligraphic hero titles
- ZCOOL XiaoWei (400) — calligraphic fallback
- Cormorant Garamond (400, 500, 600, italic) — English/Latin serif
- JetBrains Mono (400, 500) — labels, metadata, stat values

Set CSS variables on `<html>` element. Update body base styles.

## Acceptance Criteria

- [ ] `lib/game/schema.ts` exports all schemas + inferred types; `tsc --noEmit` passes
- [ ] `lib/game/constants.ts` exports all enums + tables; origin modifiers match balance.md exactly
- [ ] `globals.css` registers all 19 color tokens + 5 font stacks in `@theme inline`
- [ ] Paper grain, vignette, era-wipe, danger-pulse, stamp-down keyframes present in globals.css
- [ ] `prefers-reduced-motion` media query disables animations
- [ ] All 34 assets exist in `public/assets/` (verified by file count)
- [ ] `app/layout.tsx` loads 6 Google Font families with correct weights
- [ ] `next build` succeeds without errors
- [ ] Existing `lib/ai/` code continues to compile (schema.ts doesn't break imports)

## Definition of Done

- `tsc --noEmit` passes
- `next build` succeeds
- No lint errors
- All assets present and correctly named

## Technical Approach

- Tailwind v4 uses `@theme inline` in CSS (not `tailwind.config.ts`) — this project already uses this pattern
- Zod schemas define the shape; TypeScript types are inferred via `z.infer<>` — never manually declared
- `constants.ts` uses `as const` objects for lookup tables (tree-shakeable, type-safe)
- Font loading via `next/font/google` for automatic optimization + CSS variable injection
- Assets are static PNGs served from `public/` — no processing needed

## Out of Scope

- No UI components (Task 3)
- No engine logic (Task 2)
- No database schema (Task 4)
- No Zustand store (Task 3)
- No Framer Motion setup (Task 3)
- No route structure changes (Task 3)

## Technical Notes

- Project uses Tailwind v4 (`@import "tailwindcss"` + `@theme inline` syntax, NOT v3 config file)
- Zod ^3.24.0 already installed
- TypeScript strict mode enabled
- Path alias `@/*` maps to project root
- Existing `lib/ai/schema.ts` exports `Era`, `Season`, `EventType` types — these should be consolidated into `lib/game/constants.ts` and re-exported from `lib/ai/schema.ts` for backwards compat (or just update imports)
- `lib/ai/schema.ts` also has `StatChangesSchema` — this can stay in ai/ since it's AI-output-specific validation, but the base stat type should come from `lib/game/schema.ts`

## Spec Sources

- `game-design/data-model.md` — authoritative JSON schema
- `game-design/balance.md` — all numerical constants
- `frontend/design-tokens.md` — colors, typography, spacing
- `frontend/motion-patterns.md` — keyframe definitions
- `local/claude-design-prototype/styles.css` — reference CSS implementation
