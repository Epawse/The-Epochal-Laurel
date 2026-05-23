# Random Event System + NPC

## Goal

Implement the AI-generated random event system (V1 + V2) and basic NPC interactions (N1). Events trigger during the daily loop based on fortune-weighted probability. Players choose from AI-generated options or provide creative free-text solutions. NPCs are created through social actions and provide court whims intelligence.

## Requirements

### 1. AI Contract Schemas (`lib/ai/schema.ts` additions)

Add V2 and N1 output schemas (V1 already exists):

#### V2 — Event Free-Input Evaluation
```ts
export const V2EventEvalSchema = z.object({
  success: z.boolean(),
  plausibility_score: z.number().int().min(0).max(100),
  stat_changes: StatChangesSchema,
  narrative_result: z.string().max(200),
  npc_reaction: z.object({
    npc_name: z.string(),
    reaction: z.string(),
    relationship_delta: z.number().int().min(-5).max(5),
  }).nullable(),
});
```

#### N1 — NPC Dialogue
```ts
export const N1DialogueSchema = z.object({
  dialogue: z.string(),
  mood: z.enum(["friendly", "neutral", "hostile", "mysterious"]),
  hint: z.string().nullable(),
  relationship_delta: z.number().int().min(-5).max(5),
});
```

### 2. AI Contracts (`lib/ai/contracts/`)

#### `lib/ai/contracts/event.ts` — V1 (complete integration)
- V1 schema already exists in lib/ai/schema.ts
- Uses prompt from PT-V1 (prompt-library.md)
- Model tier: Low (deepseek-v4-flash)
- Temperature: 0.8
- Input: V1Input (character state, world state, event_type, recent_events, available_npcs)
- Output: V1EventSchema validated
- Fallback: 20 static events per era (hardcoded pool)
- Integration: called from advanceTurn() when event triggers

#### `lib/ai/contracts/eventEval.ts` — V2
- Uses prompt from PT-V2
- Model tier: Mid (deepseek-v4-pro)
- Temperature: 0.5
- Input: event context + player_input + character stats/items + available NPCs
- Output: V2EventEvalSchema validated
- Fallback: success=true, stat_changes={fortune: +5}, generic narrative

#### `lib/ai/contracts/npcDialogue.ts` — N1
- Uses prompt from PT-N1
- Model tier: Low (deepseek-v4-flash)
- Temperature: 0.7
- Input: NPC profile + character_name + interaction_type + world_context
- Output: N1DialogueSchema validated
- Fallback: generic dialogue based on NPC role template

### 3. Event Integration in Server Actions (`lib/actions/game.ts`)

Update `advanceTurn()` to handle events:

```
advanceTurn(state, actionId):
  1. Apply action effects (existing)
  2. If event triggered (from engine's eventTrigger):
     a. Determine event type via engine (rollEventType based on fortune)
     b. Call V1 to generate event
     c. Store event in state.current_event
     d. Return state with current_event populated (UI shows EventModal)
  3. Return updated state
```

Add new action: `submitEventChoice(state, choiceId)`:
- Apply choice's stat_changes from current_event
- Clear current_event
- Persist and return

Add new action: `submitEventFreeInput(state, freeText)`:
- Call V2 to evaluate player's creative solution
- Apply V2's stat_changes
- If V2 returns npc_reaction, update NPC relationship
- Clear current_event
- Persist and return

### 4. NPC System Basics

#### NPC Creation
- On socialize action: 30% chance to create a new NPC (if < 5 NPCs exist)
- On scheme action: 20% chance to create a patron NPC
- NPC roles: mentor, rival, patron, friend (spouse handled in lineage)
- NPC personality: random from [strict, warm, corrupt, idealistic]

#### NPC Memory
- Max 10 entries per NPC (per schema)
- Each interaction adds a memory entry: { event, sentiment, turn }
- When memory full, oldest entry is dropped

#### Court Whims Reveal via NPC
- Patron NPC with affinity >= 40: gossip reveals emperor_temperament (full)
- Socialize with officials (fortune >= 30): eliminates 2 temperament options (partial)
- These update `world.court_whims_revealed`

#### NPC Dialogue Integration
- When socialize action targets an existing NPC: call N1 for dialogue
- Dialogue result shown in NarrativeStrip
- relationship_delta applied to NPC affinity

### 5. Event Modal (`components/game/EventModal.tsx`)

Client component:
- Scrim: fixed, rgba(8,6,4,0.78), backdrop-blur 6px
- Card: max 880px, paper-1 bg, gold-dim border
- Content:
  - Label (mono, vermillion): event type
  - Title (calli 44px, gold)
  - Ink divider image (ink-divider-plum.png)
  - Body text (serif 16px, bone-dim, line-height 1.85)
  - 3 EventChoice cards in a grid (using existing EventChoice component)
  - Free-form textarea section (if allows_free_input)
- Entry animation: scrim fade 0.35s + card scale-in 0.45s (Framer Motion)
- Props: `event: CurrentEvent`, `onChoice: (id: string) => void`, `onFreeInput: (text: string) => void`, `onClose: () => void`

### 6. Daily Loop Integration

Update `app/(game)/play/page.tsx`:
- After advanceTurn() returns with current_event populated → show EventModal
- On choice selection → call submitEventChoice() → dismiss modal, update state
- On free-text submit → call submitEventFreeInput() → dismiss modal, update state
- Show NPC dialogue in NarrativeStrip when socialize triggers N1

## Acceptance Criteria

- [ ] V2, N1 Zod schemas added to lib/ai/schema.ts
- [ ] V1 contract generates events with fallback pool
- [ ] V2 contract evaluates free-input with fallback
- [ ] N1 contract generates NPC dialogue with fallback
- [ ] advanceTurn() triggers events based on fortune-weighted probability
- [ ] EventModal renders with choices + free-text option
- [ ] submitEventChoice() applies stat changes correctly
- [ ] submitEventFreeInput() calls V2 and applies results
- [ ] NPC creation on socialize/scheme actions
- [ ] NPC memory capped at 10 entries
- [ ] Court whims reveal via NPC interactions
- [ ] `tsc --noEmit` passes
- [ ] `next build` succeeds

## Definition of Done

- `tsc --noEmit` passes
- `next build` succeeds
- No lint errors
- Events trigger and display during daily loop
- Player can choose options or submit free-text

## Technical Approach

- AI contracts use existing callLLM() wrapper from lib/ai/client.ts
- V1 schema already exists — just wire the contract to advanceTurn()
- Event probability already computed by engine (eventChancePerSeason)
- EventModal uses existing EventChoice component from T3
- NPC state stored in GameState.npcs array (schema already supports this)
- Framer Motion for modal entry animation

## Out of Scope

- Exam system (Task 5)
- Inheritance (Task 7)
- NPC era-change handling (Task 7)
- Marriage action (Task 7)

## Spec Sources

- `game-design/ai-contracts.md` — V1, V2, N1 contract specs
- `game-design/prompt-library.md` — PT-V1, PT-V2, PT-N1 templates
- `game-design/balance.md` — event probability, NPC mechanics
- `game-design/data-model.md` — NPC schema, memory cap
- `frontend/component-catalog.md` — EventModal spec
- `frontend/screen-map.md` — event overlay layout
