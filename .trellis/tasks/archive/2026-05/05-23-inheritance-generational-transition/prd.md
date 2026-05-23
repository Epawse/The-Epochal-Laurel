# Inheritance + Generational Transition

## Goal

Complete the generational loop: when a character dies (drive=0 or max_age reached), transition to the inheritance phase where the player selects an heir, purchases blessings, and begins a new generation. Includes era transitions with dramatic interstitial, NPC era-change handling, and the sonless/adoption path.

## Requirements

### 1. AI Contract — I1 Heir Generation (`lib/ai/contracts/heirs.ts`)

- Uses prompt from PT-I1 (prompt-library.md)
- Model tier: Mid (deepseek-v4-pro)
- Temperature: 0.8
- Input: parent info (name, traits, highest_title, erudition), dynasty info (family_name, generation, era), num_heirs, is_adoption
- Output schema (add to lib/ai/schema.ts):
```ts
export const I1HeirSchema = z.object({
  heirs: z.array(z.object({
    name: z.string(),
    traits: z.array(z.string()).min(1).max(2),
    personality_hint: z.string(),
    starting_bonus: z.object({
      stat: z.enum(["erudition", "fortune", "drive"]),
      value: z.number().int().min(3).max(8),
    }),
  })),
});
```
- Fallback: procedural heir generation (random name from pool + random traits)

### 2. Server Action — `chooseHeir()` (`lib/actions/game.ts`)

Replace placeholder with full implementation:
1. Calculate legacy tokens from ending character (engine: calculateLegacyTokens)
2. Apply generation decay (engine: applyGenerationDecay)
3. Calculate blessing points (engine: calculateBlessingPoints)
4. Apply purchased blessings to heir starting stats
5. Create new character from selected heir data
6. Check era transition (engine: shouldTransitionEra + rollNextEra)
7. Handle NPC era-change rules
8. Reset auxiliary tools
9. Persist new state and return

### 3. Inheritance Page (`app/(game)/inherit/page.tsx`)

Client component with full inheritance UI:

- Header: generation summary (family name, generation number, era)
- Ancestor card:
  - Portrait (age-based) + name + lifespan + highest title + cause of end
  - 2-column layout: image | meta
- Legacy tokens display:
  - 4 token cards: books, land, reputation, blessing points
  - Each shows: label + value + note
- Heir candidates (3-column grid):
  - 3 HeirCards (or 1 if adoption)
  - Each: name + birth-order + trait pills + personality hint + 4-stat tendency
  - Selected state: gold-glow border + 嗣 stamp
- Blessings (4-column grid):
  - BlessingCards from BLESSINGS constant
  - Each: title + effect + cost
  - Toggle purchase (disabled if insufficient points)
  - Purchased state: gold border + checkmark + jade cost
- Footer:
  - Selected heir summary + blessing points remaining
  - "开启新篇" button (disabled until heir selected)
- On confirm: call chooseHeir() → if era transition → show EraTransition → navigate to /play

### 4. Era Transition Component (`components/game/EraTransition.tsx`)

Full-screen interstitial:
- Two stacked scene images:
  - Old era image (faded, saturate 0.6, brightness 0.55)
  - New era image (ink-wipe clip-path from left, 2.4s) using `.era-wipe` class from globals.css
- Content fades in at 1.2s:
  - Label: "ERA TRANSITION" (mono, vermillion)
  - Title: "世道更替" (calli, clamp 56-132px, gold-glow)
  - From → To display (serif 28px, with arrow)
  - Quote (serif italic, bone-mute)
  - "承之" continue button
- Props: `fromEra`, `toEra`, `onContinue`
- Era image mapping:
  - prosperity/decline → village.png
  - invasion → village--invasion.png
  - restoration → village.png

### 5. NPC Era-Change Handling

When era transitions occur (in chooseHeir server action):
- Examiners: all removed (replaced next era)
- Mentors/patrons: 50% death chance each (roll via RNG)
- Spouse: persists
- Friends: persist
- Rivals: persist but memory reset (clear memory array)
- Dead NPCs: set `alive = false`

### 6. Death/Inheritance Trigger

Update `advanceTurn()` or the play page to detect end-of-generation:
- When `character.stats.drive <= 0`: generation ends (exhaustion)
- When `character.age >= character.max_age`: generation ends (natural death)
- On detection: call I1 to generate heirs → navigate to `/inherit`
- Sonless path: if `countHeirs(children) == 0`:
  - If `dynasty.legacy.reputation >= 20`: offer adoption (I1 with is_adoption=true, num_heirs=1)
  - Else: game over (F tier) → navigate to `/leaderboard`

### 7. Game Over Detection

When family line dies out (no heirs + can't adopt):
- Show a brief game-over state
- Navigate to leaderboard with F tier result

## Acceptance Criteria

- [ ] I1 Zod schema added to lib/ai/schema.ts
- [ ] I1 contract generates heirs with fallback
- [ ] chooseHeir() creates new generation correctly
- [ ] Inheritance page displays ancestor, tokens, heirs, blessings
- [ ] Heir selection + blessing purchase works
- [ ] Era transition triggers when conditions met
- [ ] EraTransition component shows ink-wipe animation
- [ ] NPC era-change rules applied correctly
- [ ] Drive=0 and max_age death trigger inheritance
- [ ] Sonless/adoption path works
- [ ] Game over (F tier) when no heirs and can't adopt
- [ ] `tsc --noEmit` passes
- [ ] `next build` succeeds

## Definition of Done

- `tsc --noEmit` passes
- `next build` succeeds
- No lint errors
- Full generational loop: create → live → die → inherit → new generation

## Technical Approach

- Engine functions already exist in lib/engine/inheritance.ts and lib/engine/lineage.ts
- I1 contract follows same pattern as other AI contracts
- Inheritance page uses existing HeirCard-style components (or create inline)
- EraTransition uses the `.era-wipe` CSS class already in globals.css
- Death detection in play page or advanceTurn response handling

## Out of Scope

- Palace exam (Task 8)
- Leaderboard page (Task 9)
- Animation polish (Task 10)

## Spec Sources

- `game-design/ai-contracts.md` — I1 contract spec
- `game-design/prompt-library.md` — PT-I1 template
- `game-design/balance.md` — inheritance formulas, era transitions, lineage
- `game-design/data-model.md` — NPC era-change rules
- `frontend/screen-map.md` — inheritance screen layout
- `frontend/component-catalog.md` — EraTransition, HeirCard, BlessingCard specs
