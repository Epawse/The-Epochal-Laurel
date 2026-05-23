# Implementation Roadmap — The Epochal Laurel (百世流芳)

> 10 tasks, strict dependency order, optimized for maximum completeness with minimal rework.
> Aligned with: `game-design/*`, `backend/directory-structure.md`, `frontend/*`, `local/claude-design-prototype/`.

---

## Phase 0: Foundation (blocks everything)

### Task 1: Schema + Constants + Design System + Assets

- `lib/game/schema.ts` — data-model.md full Zod types (Character, World, Dynasty, NPC, Event, Save)
- `lib/game/constants.ts` — enums + tables: eras, titles + values (秀才=10…状元=100), origins (with spec-correct stat modifiers from balance.md), blessing categories, action definitions
- `tailwind.config.ts` — design-tokens.md 19 colors + 5 font stacks + semantic aliases
- `app/globals.css` — paper grain, vignette, ink-wipe keyframes, danger-pulse (~100 lines)
- `public/` — all 34 assets from `local/claude-design-prototype/assets/` (including `palace-exam.png`)
- `app/layout.tsx` — Google Fonts loading (6 font families: Noto Serif SC, Noto Sans SC, Ma Shan Zheng, ZCOOL XiaoWei, Cormorant Garamond, JetBrains Mono)

**Important**: Origin stat modifiers in `constants.ts` MUST use balance.md values, NOT the prototype's visual placeholders. The prototype shows approximate display values; the engine uses the authoritative spec numbers.

---

## Phase 1: Dual-track parallel

### Task 2: Game Engine Core (depends on T1 schema)

File structure per `backend/directory-structure.md`:

- `lib/engine/rng.ts` — seeded PRNG built from `GameState.rng_seed` (reproducible runs)
- `lib/engine/balance.ts` — all formulas from balance.md: action effects, diminishing returns, drive decay, event probability, scheme exposure
- `lib/engine/exam.ts` — threshold formula, player score calc (fixed-choice + free-text), court_whims alignment, risk condition evaluation, court_whims reveal tracking
- `lib/engine/lineage.ts` — marriage, fertility window, birth rolls, child survival by era, num_heirs, max_age roll
- `lib/engine/inheritance.ts` — legacy token calc, blessing points, heir starting stats, decay between generations, era transition (constrained Markov chain)
- `lib/engine/reducer.ts` — the single entry point Server Actions call: `advanceSeason()`, `applyEventChoice()`, `resolveExam()`, `resolvePalaceExam()`, `resolveInheritance()`

Also includes:
- Character creation logic (origin modifiers, base stats, max_age roll)
- Exam schedule management (`world.exam_schedule` initialization + countdown)
- Status effects system (`character.status_effects`: mourning, exam ban, with `turns_remaining` decrement)
- Auxiliary tool state tracking (`world.auxiliary_tools`: per-cycle usage flags, cycle reset)
- Court whims reveal state transitions (hidden → partial → full)

Pure functions, zero IO, unit tests covering all balance.md formulas. Randomness ONLY from `rng.ts`.

### Task 3: UI Component Library + Landing + Create (depends on T1 tokens/assets)

- `components/ui/` — Panel, SealStamp, StatusBadge, SceneBackground, ScrollFramePanel
- `components/game/` — TopBar, StatPanel, StatRow, ActionCard, NarrativeStrip, EventChoice, ExamChoice, CourtHint
- `app/(game)/page.tsx` — Landing (ink-bloom animation, 3 buttons; "继续旧梦" disabled until save exists)
- `app/(game)/create/page.tsx` — Character creation (4 origin cards, portrait frame, family name input, confirm)
- Zustand `useUiStore` skeleton (activeMoment, examDraft, setMoment, setExamDraft)
- Uses mock data with real schema types + hardcoded values; does not depend on engine

**Note**: Origin cards display stat previews using Chinese labels (才学/运势/心气/家财) but the actual values come from `constants.ts` (which uses spec numbers). The prototype's display values are approximations for visual balance.

---

## Phase 2: Main Loop End-to-End

### Task 4: Server Actions + Database + Daily Loop (depends on T2 + T3)

- `lib/db/client.ts` — Supabase server client factory (`@supabase/ssr`)
- `lib/db/queries.ts` — typed functions: `loadSave`, `upsertSave`, `topScores`, `recordVictory`
- Supabase schema: save blob JSONB table + anonymous session setup (anon auth required here, not T9 — persistence needs a session)
- `lib/actions/game.ts` — single file per spec: `newGame()`, `advanceTurn()`, `submitExamAnswer()`, `chooseHeir()`, `useTool()`
- `app/(game)/play/page.tsx` — Daily Loop fully wired:
  - Left: StatPanel (portrait with age-based switching: young/middle-35+/old-55+) + 4 stat rows + Counter-Fate Tools slot (display only, activation in T5)
  - Center: 5 ActionCards + locked slots (e.g., 成婚 gated by requirements) + NarrativeStrip
  - Right: title/exam status + exam countdown (from `world.exam_schedule`) + "参加考试" CTA (gated on schedule) + era + court hints (with reveal state: ???/非X非Y/actual value)
- `app/(game)/play/layout.tsx` — TopBar + game shell
- Action narration: template-based (no AI call) — use static narration strings per action type, similar to prototype's `ACTION_NARRATIONS`. Optional AI narration deferred to polish.
- Drive danger mode: spirit ≤ 25 → portrait desaturates, bar pulses (CSS), warning box appears
- Era-conditional background: `study-room.png` default, `study-room--invasion.png` during invasion era

Milestone: create character → select actions → see stat changes → seasons advance → court hints update

### Task 5: Exam Flow + Auxiliary Tools (depends on T4)

- `lib/ai/contracts/examQuestion.ts` — E1 exam question generation (prompt from prompt-library.md + Zod schema + 10 fallback questions per era/level)
- `lib/ai/contracts/judge.ts` — E2 free-text evaluation (thinking mode, post-process JSON extraction, temperature 0.3)
- `lib/ai/contracts/narrate.ts` — R1 result narration (temperature 0.9)
- `lib/ai/schema.ts` — add E1, E2, R1 output schemas (extend existing V1 schema)
- Exam flow in `lib/actions/game.ts` → `submitExamAnswer()`:
  - Fixed choice: engine formula scoring (no AI call)
  - Free-text: E2 Judge → engine applies score formula → R1 narration
  - Risk evaluation: engine checks `choice.risk.condition` against `court_whims` post-scoring
- `app/(game)/play/exam/page.tsx` — ScrollFramePanel + exam header + question + 3 ExamChoice + free-text textarea (300 char limit) + submit/cancel
- `components/game/ResultOverlay.tsx` — pass/fail 2-column overlay (image | body) + stamp-down animation + 4-stat readout
- Auxiliary Tools activation:
  - 小抄 (Cheat Sheet): activate before exam → doubles erudition in score formula, 15% exposure check
  - 榜眼引路 (Insider Tip): activate anytime court_whims hidden → reveals best-aligned choice
  - 恩师引荐 (Mentor's Plea): activate after exam failure → re-review with threshold -15
  - UI: tools section in left panel becomes interactive; `useTool()` Server Action
  - Engine: `world.auxiliary_tools` state updates per activation

Milestone: full exam flow — question → answer (choice or free-text) → pass/fail result with narration

---

## Phase 3: Complete Generational Loop

### Task 6: Random Event System + NPC (depends on T4, parallel with T5)

- `lib/ai/contracts/event.ts` — V1 complete prompt call (schema already exists), integrate with `advanceTurn()` event trigger
- `lib/ai/contracts/eventEval.ts` — V2 free-input evaluation
- `lib/ai/contracts/npcDialogue.ts` — N1 basic NPC dialogue (socialize action, patron gossip for court_whims reveal)
- `lib/actions/game.ts` additions: event choice application + free-input submission (within `advanceTurn` flow)
- `components/game/EventModal.tsx` — scrim + scale-in card + title (calli 44px) + ink-divider + body + 3 EventChoice cards + free-form textarea
- NPC system basics:
  - NPC creation on socialize/scheme actions
  - NPC memory (max 10 entries per NPC)
  - Court whims reveal via NPC interactions (patron gossip → temperament reveal)

### Task 7: Inheritance + Generational Transition (depends on T5 AND T6)

- `lib/ai/contracts/heirs.ts` — I1 heir generation (num_heirs from lineage system, adoption case)
- `lib/actions/game.ts` addition: `chooseHeir()` — select heir + buy blessings + era transition check + new generation init
- `app/(game)/inherit/page.tsx`:
  - Header (generation summary)
  - Ancestor card (portrait + name + lifespan + highest title + cause of end)
  - Legacy tokens (books/land/fame/blessing points)
  - 3 HeirCards (name + birth-order + trait pills + flavor + 4-stat tendency)
  - 4 BlessingCards (title + effect + cost, toggle purchase)
  - Footer (selected heir summary + "开启新篇" button)
- `components/game/EraTransition.tsx` — full-screen interstitial:
  - Old era image (faded) + new era image (ink-wipe clip-path from left, 2.4s)
  - Content fades in at 1.2s: label + 世道更替 title + from→to + quote + continue button
- NPC era-change handling:
  - Examiners replaced
  - Mentors/patrons 50% death chance
  - Spouse/friends persist
  - Rivals persist with memory reset
- Sonless/adoption path: if no surviving sons + reputation ≥ 20 → adoption option; else game over (F tier)

Milestone: full generational loop — create → live → exam → inherit → era transition → new generation

---

## Phase 4: Competition + Endgame

### Task 8: Palace Exam + Palace Ranking (depends on T7)

- `lib/ai/contracts/palaceRivals.ts` — E3 rival generation (does NOT receive player score; rival_strength by generation)
- Engine `resolvePalaceExam()` in `reducer.ts`: append player score to 3 rival scores → sort descending → assign 状元/榜眼/探花/进士 to ranks 1-4
- R1 extension: palace exam 御评 generation (emperor's one-line comment on champion's answer)
- `app/(game)/palace/page.tsx`:
  - Full-screen with `imperial-court.png` background
  - Header (金銮殿 · 三鼎甲)
  - 4 palace-row cards (stagger-animated: 0.05/0.25/0.45/0.65s delays)
  - Player row: gold-glow border + vermillion left marker + "本家 · You" tag
  - Emperor commentary aside panel (御 watermark + quote + seal signature)
  - Footer: "衣锦还乡" → leaderboard, "传之后世" → inherit
- Victory condition evaluation (S/A/B/C/D/F tier per core-loop.md Victory Tiers)
- Game over conditions: family line dies out OR 10 generations without 举人+

### Task 9: Leaderboard + Save System Polish (depends on T8)

- `app/(game)/leaderboard/page.tsx`:
  - Dynasty summary card (seal graphic + family name + stats + note)
  - 12-row table (rank + family + tier badge + title + generations + score)
  - Top-3 rows: stamp-style rank numbers
  - Player row: vermillion left border highlight
  - Footer: "再开一世" → create, "回到日常" → play
- Supabase leaderboard relational table (score, tier, generations, family_name, created_at)
- Save system polish: "继续旧梦" button on Landing now functional, game over cleanup
- Landing page "继续旧梦" enabled when save exists (check on mount)

---

## Phase 5: Polish

### Task 10: Animation + Responsive + Edge Cases (depends on T9)

- P0 animation polish:
  - Exam pass: full-screen "捷报" banner, screen shake, confetti particles, drums+firecrackers sound cue
  - Exam fail: screen dims, rain effect, text fades to grey
  - Inheritance: slow fade to black, ancestor portrait added to family tree
- P1 animation:
  - Era change: dramatic wipe transition, new color palette loads
  - Scheme exposure: red flash, "东窗事发" stamp, gavel slam
  - Palace exam ranking: scroll unrolling animation
  - Blessing unlock: golden glow on family tree, new node appears
  - Drive reaches 0: gradual desaturation over last 3 turns, final collapse
- Framer Motion `prefers-reduced-motion` degradation (instant transitions, no scale/translate)
- Responsive: usable at 375px width (text readable, animations simplified, not mobile-first)
- Optional AI action narration (upgrade from templates to V1-style generation for richer flavor)
- Error states (AI fallback static pool display, network disconnect notice, loading states)
- Vercel deployment config + QR code demo preparation
- Final pass: accessibility (aria-labels, focus management on modals, keyboard navigation)

---

## Critical Path

```
T1 ──┬── T2 (engine) ──┐
     │                  ├── T4 (wire+db+anon-session) ──┬── T5 (exam+tools) ──┬── T7 (inherit+era) ── T8 (palace) ── T9 (board) ── T10
     └── T3 (UI shell) ─┘                              │                      │
                                                        └── T6 (events+NPC) ──┘
```

T5 and T6 are **parallel** after T4 (no dependency between them). T7 depends on BOTH completing.

## Milestones

| After | What's playable |
|-------|----------------|
| T1 | Nothing visible (foundation only) |
| T3 | Static Landing + Character Creation screens (interactive, mock data) |
| T4 | Create character → select actions → see stat changes → seasons advance |
| T5 | Full exam flow: question → answer → pass/fail result with AI narration |
| T6 | Random events trigger during daily loop with AI-generated content |
| T7 | Complete generational loop (one full run across multiple generations) |
| T8 | Palace exam competitive ranking + victory conditions |
| T9 | Full game with leaderboard + persistent saves |
| T10 | Production-ready demo with polished animations |

## Design Decisions

- **Schema-first**: T3 uses real Zod-inferred types with mock data, so T4 wiring is zero-rework
- **Engine purity**: `lib/engine/` is pure deterministic TS — no IO, no LLM, no Date.now()/Math.random(), fully unit-testable
- **AI as service**: AI layer returns narrative + proposed deltas; engine validates and applies
- **Server-authoritative**: frontend renders state and sends intents, never recomputes scores
- **Single actions file**: `lib/actions/game.ts` per backend spec — one orchestration point
- **Template narration first**: daily loop uses static narration strings (fast, no AI latency); AI narration is a T10 upgrade
- **Spec values are authoritative**: when prototype display values conflict with balance.md formulas, the spec wins

## Spec Alignment Notes

| Concern | Spec source | Roadmap location |
|---------|-------------|-----------------|
| Origin stat modifiers | balance.md > Origin Definitions | T1 constants.ts |
| Exam threshold formula | balance.md > Exam Scoring | T2 exam.ts |
| Court whims reveal | balance.md > Court Whims Reveal Mechanism | T2 exam.ts + T4 UI |
| Fertility & lineage | balance.md > Fertility & Lineage | T2 lineage.ts |
| Era transitions | balance.md > Era Transition Rules | T2 inheritance.ts |
| Auxiliary tools balance | balance.md > Auxiliary Tools Balance | T2 balance.ts + T5 |
| Status effects | data-model.md > Character State | T2 reducer.ts |
| NPC memory cap | data-model.md > NPC Memory Cap | T6 |
| NPC era-change rules | data-model.md > NPC Handling on Era Change | T7 |
| Palace exam (no threshold) | core-loop.md > Palace Exam Special Mechanic | T8 |
| Victory tiers | core-loop.md > Victory Tiers | T8 |
| Portrait aging | frontend/screen-map.md > Daily Loop | T4 |
| Motion patterns (7) | frontend/motion-patterns.md | T3 (structure) + T10 (polish) |
| Reduced motion | frontend/motion-patterns.md | T10 |
