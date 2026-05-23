# Exam Flow + Auxiliary Tools

## Goal

Implement the complete exam flow: AI-generated questions (E1), fixed-choice and free-text scoring (E2), result narration (R1), the exam UI page, result overlay, and the three auxiliary tools. This is the core skill-expression mechanic of the game.

## Requirements

### 1. AI Contract Schemas (`lib/ai/schema.ts` additions)

Add E1, E2, R1 output schemas extending the existing file:

#### E1 — Exam Question
```ts
export const E1ChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  alignment: z.enum(["full", "partial", "none"]),
  base_score: z.number().int().min(40).max(70),
  risk: z.object({
    condition: z.enum(["temperament_mismatch", "style_mismatch", "full_mismatch"]),
    description: z.string(),
    penalty: StatChangesSchema,
  }).nullable(),
});

export const E1ExamQuestionSchema = z.object({
  question_text: z.string(),
  topic_category: z.enum(["governance", "ethics", "military", "economics", "philosophy"]),
  difficulty_hint: z.string(),
  choices: z.array(E1ChoiceSchema).length(3),
  free_input_hint: z.string(),
});
```

#### E2 — Judge Evaluation
```ts
export const E2JudgeSchema = z.object({
  scores: z.object({
    relevance: z.number().int().min(0).max(25),
    cleverness: z.number().int().min(0).max(25),
    alignment: z.number().int().min(0).max(25),
    audacity: z.number().int().min(0).max(25),
  }),
  total_score: z.number().int().min(0).max(100),
  judge_narrative: z.string(),
  special_flags: z.object({
    offended_emperor: z.boolean(),
    impressed_examiner: z.boolean(),
    plagiarism_detected: z.boolean(),
  }),
});
```

#### R1 — Result Narration
```ts
export const R1NarrationSchema = z.object({
  narration: z.string(),
  sound_cue: z.enum(["celebration", "mourning", "tension", "neutral"]),
});
```

### 2. AI Contracts (`lib/ai/contracts/`)

#### `lib/ai/contracts/examQuestion.ts` — E1
- Uses prompt from PT-E1 (prompt-library.md)
- Model tier: Mid (deepseek-v4-pro)
- Temperature: 0.7
- Input: exam_level, era, court_whims, year, character_erudition, previous_questions
- Output: E1ExamQuestionSchema validated
- Fallback: 10 static questions per era/level combination (hardcoded pool)

#### `lib/ai/contracts/judge.ts` — E2
- Uses prompt from PT-E2
- Model tier: High (thinking mode)
- Temperature: 0.3
- Input: question_text, player_answer, court_whims, exam_level, character_erudition, character_items
- Output: E2JudgeSchema validated
- Post-processing: extract JSON from thinking response via extractJsonObject()
- Fallback: score = character_erudition * 0.5

#### `lib/ai/contracts/narrate.ts` — R1
- Uses prompt from PT-R1
- Model tier: Low (deepseek-v4-flash)
- Temperature: 0.9
- Input: event_type, context, tone
- Output: R1NarrationSchema validated
- Fallback: pre-written narration templates (5 per event_type)

### 3. Exam Server Action (`lib/actions/game.ts` — `submitExamAnswer()`)

Replace the placeholder stub with full implementation:

```
submitExamAnswer(state, examLevel, choiceId?, freeText?):
  1. If choiceId provided (fixed choice):
     - Get choice from E1 question data
     - Score via engine: scoreFixedChoice(base_score, erudition, courtWhimsAlignment)
     - Evaluate risk condition via engine
  2. If freeText provided:
     - Call E2 Judge → get judge_lm_score
     - Score via engine: scoreFreeText(judge_lm_score, erudition)
     - No risk evaluation for free-text
  3. Determine pass/fail: score >= examThreshold(level, era, generation, fortune)
  4. If passed: award title via engine resolveExam()
  5. Call R1 for narration
  6. Apply risk penalty if triggered
  7. Persist state, return result
```

### 4. Auxiliary Tools Server Action (`lib/actions/game.ts` — `useTool()`)

Replace placeholder with:

#### 小抄 (Cheat Sheet) — `cheat_sheet`
- Activation: before exam
- Cost: Fortune -10
- Effect: doubles erudition in score formula (erudition * 0.6 instead of * 0.3)
- Risk: 15% exposure chance → exam ban 1 cycle + drive -20 + fortune -15
- Updates: `world.auxiliary_tools.cheat_sheet_used_this_cycle = true`

#### 榜眼引路 (Insider Tip) — `insider_tip`
- Activation: anytime court_whims partially/fully hidden
- Cost: Wealth -15
- Effect: reveals which choice (A/B/C) has best alignment
- Updates: `world.auxiliary_tools.insider_tip_used_this_cycle = true`

#### 恩师引荐 (Mentor's Plea) — `mentor_plea`
- Activation: after exam failure only
- Requirement: mentor NPC with affinity >= 60
- Cost: mentor.affinity -20
- Effect: re-evaluate with threshold -15
- Updates: `world.auxiliary_tools.mentor_plea_used_this_cycle = true`

### 5. Exam Page (`app/(game)/play/exam/page.tsx`)

Client component with:
- SceneBackground: `examination-hall.png` (opacity 0.6-0.86)
- ScrollFramePanel containing:
  - Exam header: title (calli 38px) + meta (level, year, threshold hint)
  - Question block: border-left vermillion + question text (serif 17px)
  - 3 ExamChoice cards in a grid
  - Free-text textarea (300 char limit) with character count
  - Footer: hint text + submit button (disabled until choice selected) + cancel button
- Entry animation: scrim fade + scroll-unfurl
- State: selectedChoice, freeText, isSubmitting
- On submit: call submitExamAnswer() → show ResultOverlay

### 6. Result Overlay (`components/game/ResultOverlay.tsx`)

Client component:
- Full-screen scrim (z-100)
- 2-column card (max 1100px): image | body
- Left: exam-pass.png or exam-fail.png with gradient fade-right
- Right:
  - Label (mono, vermillion): "EXAM RESULT"
  - Title (calli 88px): "高中" or "落第"
  - Narration text (serif, bone-dim)
  - 4-stat readout grid with deltas
  - Return button → dismiss overlay
- Stamp: seal-blank-red.png with stamp-down animation (Framer Motion)
- Props: `passed`, `title?`, `narration`, `statChanges`, `onDismiss`

### 7. Tools UI in Daily Loop

Update the left panel tools section in play/page.tsx:
- Tools become interactive buttons (not just display)
- Each tool shows: name, cost, status (available/used/locked)
- Click → call useTool() Server Action
- Cheat Sheet: available before exam, shows "已使用" after use
- Insider Tip: available when court_whims hidden, reveals best choice
- Mentor's Plea: available after exam failure only

## Acceptance Criteria

- [ ] E1, E2, R1 Zod schemas added to lib/ai/schema.ts
- [ ] E1 contract generates exam questions with fallback pool
- [ ] E2 contract evaluates free-text with thinking mode + JSON extraction
- [ ] R1 contract generates narration with fallback templates
- [ ] submitExamAnswer() handles both fixed-choice and free-text paths
- [ ] Fixed-choice scoring uses engine formula (no AI call)
- [ ] Free-text scoring uses E2 Judge + engine formula
- [ ] Risk evaluation applies penalties correctly
- [ ] Exam page renders with ScrollFramePanel + 3 choices + textarea
- [ ] ResultOverlay shows pass/fail with stamp animation
- [ ] All 3 auxiliary tools functional with correct costs/effects
- [ ] `tsc --noEmit` passes
- [ ] `next build` succeeds

## Definition of Done

- `tsc --noEmit` passes
- `next build` succeeds
- No lint errors
- Full exam flow: question → answer → pass/fail result with narration

## Technical Approach

- AI contracts use the existing `callLLM()` pattern from lib/ai/client.ts
- Prompts from prompt-library.md injected as system messages
- E2 uses thinking mode with post-process JSON extraction
- Fallback pools are static arrays in each contract file
- Engine functions (scoreFixedChoice, evaluateRiskCondition, etc.) already exist in lib/engine/exam.ts
- Framer Motion for ResultOverlay stamp-down animation

## Out of Scope

- Palace exam (Task 8)
- E3 rival generation (Task 8)
- Random events (Task 6)
- Inheritance (Task 7)

## Spec Sources

- `game-design/ai-contracts.md` — E1, E2, R1 contract specs
- `game-design/prompt-library.md` — PT-E1, PT-E2, PT-R1 templates
- `game-design/balance.md` — exam scoring formulas, auxiliary tools balance
- `frontend/screen-map.md` — exam screen layout
- `frontend/component-catalog.md` — ResultOverlay spec
