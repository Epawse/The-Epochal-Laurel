# Animation + Responsive + Edge Cases

## Goal

Final polish pass: add dramatic P0 animations for key moments, ensure the game is usable at 375px width, handle error states gracefully, and prepare for Vercel deployment with QR code demo.

## Requirements

### 1. P0 Animation Polish

#### Exam Pass — "捷报" Banner
- Full-screen overlay with "捷报" text (calli, gold-glow, scale animation)
- Screen shake effect (CSS transform jitter, 0.3s)
- Confetti particles (CSS-only or lightweight library)
- Integrate into ResultOverlay when `passed === true`

#### Exam Fail
- Screen dims (opacity overlay fades in)
- Text fades to grey tones
- Subtle rain/drip CSS effect (optional, degrade gracefully)

#### Inheritance
- Slow fade to black before inheritance page loads
- Ancestor portrait fades with sepia filter

### 2. P1 Animation (lighter touch)

#### Scheme Exposure
- Red flash overlay (0.2s)
- "东窗事发" stamp (stamp-down animation, vermillion)
- Applied when scheme exposure triggers in advanceTurn

#### Drive Reaches 0
- Gradual desaturation over last 3 turns (track in UI state)
- Final collapse: screen fades to grey, text overlay

### 3. Framer Motion Reduced Motion

- All Framer Motion animations check `useReducedMotion()` hook
- When reduced motion preferred: instant transitions (duration: 0.01), no scale/translate
- Already partially implemented — audit all animated components for compliance

### 4. Responsive (375px minimum)

- Daily loop: stack columns vertically on narrow screens
- Action cards: 2-column grid instead of 5 on mobile
- Panels: full-width, reduced padding
- Modals: full-screen on mobile (no max-width constraint)
- Text: minimum 14px body, reduce letter-spacing on mobile
- Not mobile-first — desktop is primary, mobile is "usable"

### 5. Error States

- AI fallback display: when AI call fails, show static pool content with subtle "AI unavailable" indicator
- Network disconnect: toast notification "网络连接中断" with retry button
- Loading states: skeleton/shimmer for AI-generated content (exam questions, events, narration)
- Empty states: leaderboard empty, no save exists

### 6. Vercel Deployment

- `vercel.json` or Next.js config for deployment
- Environment variables documentation (.env.example)
- Build verification: `next build` must succeed without Supabase connection (graceful degradation)

### 7. Accessibility Pass

- aria-labels on all interactive elements (buttons, cards, inputs)
- Focus management: trap focus in modals, return focus on dismiss
- Keyboard navigation: all actions reachable via Tab + Enter
- Screen reader: meaningful alt text on images, aria-live for dynamic content

## Acceptance Criteria

- [ ] Exam pass shows "捷报" banner with animation
- [ ] Scheme exposure shows red flash + stamp
- [ ] All animations respect prefers-reduced-motion
- [ ] Game usable at 375px width (no horizontal scroll, text readable)
- [ ] AI failure shows fallback content gracefully
- [ ] Loading states for AI-generated content
- [ ] `tsc --noEmit` passes
- [ ] `next build` succeeds
- [ ] Vercel deployment config present

## Definition of Done

- `tsc --noEmit` passes
- `next build` succeeds
- No lint errors
- Animations work and degrade gracefully
- 375px viewport is usable

## Spec Sources

- `frontend/motion-patterns.md` — animation specs and reduced motion
- `frontend/design-tokens.md` — responsive breakpoints
- `game-design/core-loop.md` — P0/P1 moment definitions
