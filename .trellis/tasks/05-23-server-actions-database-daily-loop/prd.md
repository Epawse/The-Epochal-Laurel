# Server Actions + Database + Daily Loop

## Goal

Wire the game engine (T2) to the UI components (T3) through Server Actions and Supabase persistence. Deliver the fully playable daily loop: create character → select actions → see stat changes → seasons advance → court hints update.

## Requirements

### 1. Supabase Database (`lib/db/`)

#### `lib/db/client.ts` — Server client factory
- Use `@supabase/ssr` for server-side Supabase client
- Create client from environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- Cookie-based session for anonymous auth

#### `lib/db/queries.ts` — Typed query functions
- `loadSave(sessionId: string)` → GameState | null
- `upsertSave(sessionId: string, state: GameState)` → void
- `topScores(limit: number)` → LeaderboardEntry[]
- `recordVictory(sessionId: string, entry: LeaderboardEntry)` → void

#### Supabase Schema (SQL migration)
```sql
create table saves (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  state jsonb not null,
  updated_at timestamptz default now()
);

create table leaderboard (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  family_name text not null,
  tier text not null,
  highest_title text not null,
  generations int not null,
  score int not null,
  created_at timestamptz default now()
);
```

#### Anonymous Auth
- On first visit, create anonymous Supabase session (no login required)
- Session persists via cookies for save continuity
- Implement in middleware or layout-level initialization

### 2. Server Actions (`lib/actions/game.ts`)

Single file, all game mutations:

#### `newGame(familyName: string, origin: Origin)`
- Call `createCharacter()` from engine/reducer
- Persist initial state via `upsertSave()`
- Return new GameState

#### `advanceTurn(actionId: string)`
- Load current save
- Call `advanceSeason()` from engine/reducer
- If scheme action: check exposure via engine
- Persist updated state
- Return: `{ state: GameState, narration: string, eventTrigger: EventType | null }`

#### `submitExamAnswer(examLevel: ExamLevel, choiceId: string, freeText?: string)`
- Placeholder for T5 (returns error "not implemented yet")

#### `chooseHeir(heirIndex: number, blessingIds: string[])`
- Placeholder for T7

#### `useTool(toolId: string)`
- Placeholder for T5

### 3. Daily Loop Page (`app/(game)/play/page.tsx`)

Fully wired client page:

#### Layout (`app/(game)/play/layout.tsx`)
- TopBar with real game state (season, year, era, character name, title, age, generation)
- Game shell wrapper

#### Left Panel — StatPanel
- Portrait with age-based switching:
  - Age < 35: `scholar-young.png`
  - Age 35-54: `scholar-middle.png`
  - Age 55+: `scholar-old.png`
- 4 stat rows with real values from GameState
- Counter-Fate Tools slot (display only, grayed out — activation in T5)

#### Center — Actions + Narrative
- 5 ActionCards from `ACTIONS` constant
- Locked slots: 成婚 (marriage) gated by `canMarry(fortune, wealth)` from engine
- NarrativeStrip showing last action result
- On action click → call `advanceTurn()` Server Action → update UI

#### Right Panel — Status
- Current title display
- Exam countdown from `world.exam_schedule` (seasons until next exam)
- "参加考试" CTA button (disabled until exam schedule reaches 0) — navigates to exam page (T5)
- Era display with era name
- Court hints using CourtHint component (with reveal state from `world.court_whims_revealed`)

#### Action Narration (Template-based)
Static narration strings per action type — no AI call:
```ts
const ACTION_NARRATIONS: Record<string, string[]> = {
  study: ["秉烛夜读，略有所得。", "翻阅经典，心有所悟。", ...],
  socialize: ["与友人把酒言欢。", "拜访名士，获益匪浅。", ...],
  earn: ["经营有方，略有进账。", ...],
  rest: ["闭门养神，精力渐复。", ...],
  scheme: ["暗中筹谋，小有收获。", ...],
};
```
Pick randomly from array using RNG.

#### Drive Danger Mode
- When `character.stats.drive ≤ 25`:
  - Portrait desaturates (CSS filter)
  - Spirit bar pulses (danger-pulse keyframe from globals.css)
  - Warning box appears below stats

#### Era-conditional Background
- Default: `study-room.png`
- During invasion era: `study-room--invasion.png`

### 4. Character Creation Wiring (`app/(game)/create/page.tsx`)

Update the existing creation page to call `newGame()` Server Action on confirm:
- On "入世求名" click → `newGame(familyName, selectedOrigin)` → redirect to `/play`
- Show loading state during action

### 5. Game State Management (Client)

- Store `GameState` in React state (from server response)
- After each Server Action call, replace entire state with server response
- Transient UI state (deltas, narration) managed locally
- No Zustand for game state — only for UI ephemera (per state-management.md)

## Acceptance Criteria

- [ ] `lib/db/client.ts` creates Supabase server client
- [ ] `lib/db/queries.ts` exports typed load/save functions
- [ ] SQL migration file exists for saves + leaderboard tables
- [ ] `lib/actions/game.ts` exports `newGame()` and `advanceTurn()` as Server Actions
- [ ] Character creation → `newGame()` → redirects to `/play` with real state
- [ ] Daily loop displays real stats from GameState
- [ ] Clicking an action calls `advanceTurn()` and updates UI
- [ ] Seasons advance correctly (spring→summer→autumn→winter→spring+year)
- [ ] Stat changes visible after actions (delta chips animate)
- [ ] Portrait switches based on character age
- [ ] Drive danger mode activates at drive ≤ 25
- [ ] Court hints display with correct reveal state
- [ ] Exam countdown decrements each season
- [ ] Template narration displays after each action
- [ ] `tsc --noEmit` passes
- [ ] `next build` succeeds

## Definition of Done

- `tsc --noEmit` passes
- `next build` succeeds
- No lint errors
- Full daily loop playable: create → act → see changes → seasons advance

## Technical Approach

- Server Actions (`"use server"`) for all mutations
- `@supabase/ssr` for server-side client with cookie auth
- Anonymous auth — no login UI needed
- GameState stored as JSONB blob (schema-validated on load)
- Client receives full GameState after each action (no partial updates)
- Template narration (no AI calls) — random selection via engine RNG
- Age-based portrait switching via simple conditional

## Out of Scope

- Exam flow (Task 5)
- Random event generation/display (Task 6)
- Inheritance (Task 7)
- AI narration (Task 10)
- Leaderboard page wiring (Task 9)
- Auxiliary tools activation (Task 5)
- Marriage action implementation (just show locked state)

## Spec Sources

- `backend/directory-structure.md` — file layout
- `frontend/screen-map.md` — Daily Loop screen spec
- `frontend/state-management.md` — state split rules
- `frontend/component-guidelines.md` — server/client patterns
- `game-design/balance.md` — action effects reference
- `game-design/core-loop.md` — game flow
