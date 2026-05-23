# Palace Exam + Palace Ranking

## Goal

Implement the palace exam (殿试) competitive ranking system and victory condition evaluation. The palace exam has no pass/fail threshold — instead, the player competes against 3 AI-generated rivals for the title of 状元. This is the endgame mechanic that determines victory tier.

## Requirements

### 1. AI Contract — E3 Palace Rivals (`lib/ai/contracts/palaceRivals.ts`)

- Uses prompt from PT-E3 (prompt-library.md)
- Model tier: High (non-thinking)
- Temperature: 0.5
- Input: question_text, court_whims, dynasty_generation, era, rival_strength
- E3 does NOT receive the player's score (structurally prevents anchoring)
- rival_strength determined by generation: weak (gen<=2), moderate (gen<=4), strong (gen>=5)
- Output schema (add to lib/ai/schema.ts):
```ts
export const E3RivalsSchema = z.object({
  rivals: z.array(z.object({
    name: z.string(),
    answer_summary: z.string(),
    score: z.number().int(),
    style: z.enum(["conservative", "bold", "sycophantic", "scholarly"]),
  })).length(3),
});
```
- Fallback: procedural rivals with scores at midpoint of strength band (±5 jitter)

### 2. Palace Exam Flow (Server Action)

Add `submitPalaceExam()` to `lib/actions/game.ts`:
1. Player submits answer (fixed choice or free-text) — scored same as regular exam
2. Call E3 to generate 3 rivals (does NOT receive player score)
3. Engine `palaceRanking(playerScore, rivalScores)` → sorted ranking with titles:
   - Rank 1: 状元
   - Rank 2: 榜眼
   - Rank 3: 探花
   - Rank 4: 进士
4. Call R1 for narration (include emperor's 御评 for the champion)
5. Store ranking in exam_history
6. Evaluate victory condition
7. Return ranking result + narration

### 3. Palace Ranking Page (`app/(game)/palace/page.tsx`)

Client component:
- Full-screen with SceneBackground (`imperial-court.png`, opacity 0.78-0.92)
- Header: "金銮殿 · 三鼎甲" (calli) + meta (year, era)
- 4 palace-row cards (stagger-animated: 0.05/0.25/0.45/0.65s delays):
  - Each row: rank number + title (状元/榜眼/探花/进士) | name + answer summary | score
  - Player row: gold-glow border + vermillion left marker + "本家 · You" tag
- Emperor commentary aside panel:
  - 御 watermark (calli 52px, vermillion, low opacity)
  - Label: "IMPERIAL COMMENTARY"
  - Title: "御评" (calli 36px)
  - Quote (serif, border-left vermillion)
  - Seal signature
- Footer: "衣锦还乡" → `/leaderboard`, "传之后世" → `/inherit`
- Entry animation: Framer Motion stagger for rows

### 4. Victory Condition Evaluation

After palace exam (or at game over), evaluate victory tier:
- S: 状元 in ≤ 3 generations
- A: 状元 in any generation
- B: 进士 in ≤ 3 generations
- C: 进士 in any generation
- D: 举人 but never 进士 (10 gen limit reached)
- F: Family line dies out

Add `evaluateVictory(dynasty)` function to engine or actions.

### 5. Game Over Conditions

- Family line dies out (no heirs + can't adopt) → F tier
- 10 generations without 举人+ → D tier (forced end)
- Player achieves 状元 or 进士 → victory screen → leaderboard

### 6. Exam Page Update

Update `app/(game)/play/exam/page.tsx` to handle palace exam level:
- When exam_level is "palace": after submit, navigate to `/palace` instead of showing ResultOverlay
- Palace exam uses the same question generation (E1) but different result flow

## Acceptance Criteria

- [ ] E3 Zod schema added to lib/ai/schema.ts
- [ ] E3 contract generates 3 rivals with fallback
- [ ] submitPalaceExam() ranks player against rivals correctly
- [ ] Palace ranking page displays 4 rows with stagger animation
- [ ] Player row highlighted with gold-glow + vermillion marker
- [ ] Emperor commentary panel shows 御评
- [ ] Victory tier evaluated correctly per spec
- [ ] Game over at 10 generations without 举人+
- [ ] `tsc --noEmit` passes
- [ ] `next build` succeeds

## Definition of Done

- `tsc --noEmit` passes
- `next build` succeeds
- No lint errors
- Palace exam flow: question → answer → ranking with rivals

## Spec Sources

- `game-design/ai-contracts.md` — E3 contract spec
- `game-design/prompt-library.md` — PT-E3 template
- `game-design/balance.md` — palace exam (no threshold, ranking only)
- `game-design/core-loop.md` — victory tiers
- `frontend/screen-map.md` — palace ranking screen layout
- `frontend/component-catalog.md` — PalaceRanking component spec
