# Screen Map

> 10 routes covering the full generational cycle. Each maps to an App Router route group. Prototype source: `local/claude-design-prototype/handoff.jsx`.

---

## Route Architecture

```
app/
├── (game)/
│   ├── page.tsx                    → landing
│   ├── create/page.tsx             → character creation
│   ├── play/
│   │   ├── page.tsx                → daily loop
│   │   ├── exam/page.tsx           → exam screen
│   │   └── layout.tsx              → shared TopBar + game shell
│   ├── palace/page.tsx             → palace ranking
│   ├── inherit/page.tsx            → inheritance
│   └── leaderboard/page.tsx        → hall of fame
├── layout.tsx                      → root (fonts, globals.css, metadata)
└── not-found.tsx
```

Overlays (event modal, result, era transition) are **not routes** — they render as portals within the play layout, controlled by Zustand UI state.

---

## Screen Details

### 1. Landing (`/`)

| Aspect | Detail |
|--------|--------|
| Layout | Full-screen, centered content, no TopBar |
| Background | `study-room.png` + 0.78–0.92 ink gradient + vignette |
| Key elements | Brand mark + 百世流芳 title (calli, ink-bloom animation) + tagline + 3 buttons |
| Assets | `study-room.png` |
| Entry animation | Fade-in 0.7s, title ink-bloom (blur 12→0, letter-spacing 0.6→0.32em, 1.2s) |
| Actions | 开创新局 → `/create`, 继续旧梦 → `/play`, 百世流芳榜 → `/leaderboard` |

### 2. Character Creation (`/create`)

| Aspect | Detail |
|--------|--------|
| Layout | TopBar + 2-column grid (360px portrait | 1fr main) |
| Left column | Portrait frame (3:4) + family name input + seal summary |
| Right column | Title + intro + 4-column origin grid + footer (confirm button) |
| Assets | `scholar-young.png` |
| State | `familyName` (input), `selectedOrigin` (poor/farmer/salt/official) |
| Actions | Select origin → highlight card, 入世求名 → Server Action `newGame()` → `/play` |

### 3. Daily Loop (`/play`)

| Aspect | Detail |
|--------|--------|
| Layout | TopBar + 3-column grid (320px | 1fr | 320px) |
| Left panel | StatPanel: portrait + 4 stat rows + counter-fate tools |
| Center | 5 action cards (grid-cols-5) + narrative strip |
| Right panel | Title/exam status + exam CTA button + era + court hints |
| Assets | `scholar-young.png`, `action-*.png` (5) |
| State | Full `GameState` from server, `deltas` (transient), `event` (modal trigger) |
| Danger mode | Spirit ≤ 25: portrait desaturates, spirit bar pulses, warning box appears |
| Actions | Click action → Server Action `advanceTurn()` → may trigger event modal |

### 4. Random Event (overlay on `/play`)

| Aspect | Detail |
|--------|--------|
| Layout | Scrim + centered modal (max 880px) |
| Content | Label + title (calli 44px) + ink-divider + body + 3 choices + free-form |
| Assets | `ink-divider-plum.png` |
| Entry | Scrim fade 0.35s + card scale-in 0.45s |
| Actions | Choose A/B/C → Server Action `applyEventChoice()`, free-text → `submitFreeInput()` |

### 5. Exam (`/play/exam`)

| Aspect | Detail |
|--------|--------|
| Layout | Full-screen, SceneBackground + ScrollFramePanel |
| Background | `examination-hall.png` + 0.6–0.86 ink gradient |
| Content | Exam title + question (border-left vermillion) + 3 choices + free-form + submit |
| Assets | `examination-hall.png`, `scroll-frame.png` |
| Entry | Scrim fade + scroll-unfurl (scaleY 0.6→1, 0.7s) |
| Actions | Select choice + optional free-text → `submitExamAnswer()` → result overlay |

### 6. Exam Result (overlay on `/play`)

| Aspect | Detail |
|--------|--------|
| Layout | Full-screen scrim + 2-column card (max 1100px) |
| Left | Moment illustration (exam-pass or exam-fail) with gradient fade-right |
| Right | Label + title (calli 88px) + narration + 4-stat readout + stamp + return button |
| Assets | `exam-pass.png` or `exam-fail.png`, `seal-blank-red.png` |
| Entry | Scrim fade + card scale-in + stamp-down (delayed 0.4s) |
| Actions | 返回日常 → dismiss overlay, advance season |

### 7. Palace Ranking (`/palace`)

| Aspect | Detail |
|--------|--------|
| Layout | Full-screen, SceneBackground + 2-column (ranking list | emperor panel) |
| Background | `imperial-court.png` + 0.78–0.92 ink gradient |
| Content | 4 ranking rows (stagger-animated) + emperor commentary panel |
| Assets | `imperial-court.png` |
| Entry | Scrim fade + rows stagger (0.05/0.25/0.45/0.65s delays) |
| Player row | Gold-glow border + vermillion left marker + "本家 · You" tag |
| Actions | 衣锦还乡 → `/leaderboard`, 传之后世 → `/inherit` |

### 8. Inheritance (`/inherit`)

| Aspect | Detail |
|--------|--------|
| Layout | Full-screen overlay, single-column (max 1320px), scrollable |
| Sections | Header → ancestor card + legacy tokens → heir candidates (3-col) → blessings (4-col) → footer |
| Assets | `inheritance.png`, `seal-blank-red.png` |
| State | `selectedHeir`, `purchasedBlessings` |
| Actions | Select heir + buy blessings → `chooseHeir()` → era transition |

### 9. Era Transition (overlay)

| Aspect | Detail |
|--------|--------|
| Layout | Full-screen, two stacked scene images + centered text |
| Background | Old era image (faded) + new era image (ink-wipe from left, 2.4s) |
| Content | Label + 世道更替 title (calli, clamp 56–132px) + from→to + quote + continue button |
| Assets | `village.png` (old), `village--invasion.png` (new) — varies by era pair |
| Entry | Old image fade-in 1.4s → wipe reveals new image 2.4s → text fades in at 1.2s |
| Actions | 承之 → `/play` (new generation) |

### 10. Leaderboard (`/leaderboard`)

| Aspect | Detail |
|--------|--------|
| Layout | TopBar + single-column flex |
| Content | Header + dynasty summary card (seal + stats) + 12-row table + footer |
| Assets | `seal-blank-red.png` |
| Table | Rank + family + tier (S/A/B/C/D/F badge) + title + generations + score |
| Top-3 | Stamp-style rank numbers instead of "No. X" |
| Player row | Vermillion left border highlight |
| Actions | 再开一世 → `/create`, 回到日常 → `/play` |

---

## Asset Dependency Map

| Asset | Used by screens |
|-------|----------------|
| `study-room.png` | Landing |
| `scholar-young.png` | Creation, Daily (portrait) |
| `scholar-middle.png` | Daily (age 35+) |
| `scholar-old.png` | Daily (age 55+) |
| `action-study.png` | Daily |
| `action-socialize.png` | Daily |
| `action-earn.png` | Daily |
| `action-rest.png` | Daily |
| `action-scheme.png` | Daily |
| `ink-divider-plum.png` | Event modal, Landing |
| `examination-hall.png` | Exam |
| `scroll-frame.png` | Exam |
| `exam-pass.png` | Result (pass) |
| `exam-fail.png` | Result (fail) |
| `seal-blank-red.png` | Result, Leaderboard, Inheritance |
| `imperial-court.png` | Palace |
| `inheritance.png` | Inheritance |
| `village.png` | Era transition (from prosperity/decline) |
| `village--invasion.png` | Era transition (to invasion) |
| `study-room--invasion.png` | Daily (invasion era background variant) |

---

## Server vs Client Rendering

| Screen | Rendering | Reason |
|--------|-----------|--------|
| Landing | RSC | Static content, no game state |
| Creation | Client | Interactive origin selection, input |
| Daily | Client | Frequent state updates, animations |
| Event modal | Client | Interactive choices, textarea |
| Exam | Client | Choice selection, free-text, timer |
| Result | Client | Entry animation, stamp |
| Palace | Client | Stagger animation, interactive |
| Inheritance | Client | Heir/blessing selection |
| Era transition | Client | Clip-path animation |
| Leaderboard | RSC + Client hydration | Table is server-rendered, player highlight is client |
