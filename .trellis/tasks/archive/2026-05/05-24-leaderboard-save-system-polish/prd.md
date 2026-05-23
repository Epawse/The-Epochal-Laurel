# Leaderboard + Save System Polish

## Goal

Implement the leaderboard page (Hall of Fame) and polish the save system so that "继续旧梦" on the Landing page works. This completes the game's persistence loop and competitive display.

## Requirements

### 1. Leaderboard Page (`app/(game)/leaderboard/page.tsx`)

Client component with:

- Header: "百世流芳榜" (calli) + "HALL OF FAME" + meta
- Dynasty summary card (for current/last player run):
  - Left: seal graphic (seal-blank-red.png) with family name
  - Right: family name + tier badge + highest title + generations + score + note
- 12-row leaderboard table:
  - Columns: rank, family name, tier badge (S/A/B/C/D/F), highest title, generations, score
  - Top-3 rows: stamp-style rank numbers (vermillion)
  - Player row: vermillion left border highlight
- Footer: "再开一世" → `/create`, "回到日常" → `/play`
- Load data from Supabase leaderboard table on mount
- If no Supabase connection: show empty state with message

### 2. Save System Polish

#### "继续旧梦" Button (Landing Page)
- Update `app/(game)/page.tsx` to check for existing save on mount
- If save exists: enable "继续旧梦" button → loads save → navigates to `/play`
- If no save: button remains disabled with "暂无存档" tooltip
- Check via: load from sessionStorage first, then Supabase if available

#### Game Over Cleanup
- When game ends (F tier / victory): clear the save
- Record final result to leaderboard table
- Show leaderboard with result highlighted

#### Save on Every Action
- Ensure `advanceTurn()`, `submitExamAnswer()`, `chooseHeir()` all persist state
- Already implemented in T4 — verify it works end-to-end

### 3. Leaderboard Server Action

Add to `lib/actions/game.ts`:
- `getLeaderboard()` — fetches top 12 scores from Supabase
- `recordScore(state, tier)` — writes final score to leaderboard table

Score calculation:
```
score = highest_title_value * tier_multiplier * generations_bonus
generations_bonus = 1 + (total_generations * 0.1)
```

### 4. Landing Page Save Check

Add a client component or hook that:
- Checks sessionStorage for existing game state
- If found: enables "继续旧梦" button
- On click: loads state, navigates to `/play`

## Acceptance Criteria

- [ ] Leaderboard page displays with dynasty summary + 12-row table
- [ ] Top-3 rows have stamp-style rank numbers
- [ ] Player row highlighted with vermillion border
- [ ] "继续旧梦" enabled when save exists
- [ ] "继续旧梦" loads existing save and navigates to /play
- [ ] Game over records score to leaderboard
- [ ] Score calculation matches spec formula
- [ ] `tsc --noEmit` passes
- [ ] `next build` succeeds

## Definition of Done

- `tsc --noEmit` passes
- `next build` succeeds
- No lint errors
- Full save/load cycle works
- Leaderboard displays scores

## Spec Sources

- `frontend/screen-map.md` — leaderboard screen layout
- `frontend/component-catalog.md` — LeaderboardTable spec
- `game-design/core-loop.md` — victory tiers and scoring
