# Component Catalog

> 17 reusable components extracted from the vertical-slice prototype. Each maps to a TSX file under `components/game/` or `components/ui/`. Prototype source: `local/claude-design-prototype/handoff.jsx`.

---

## Layout Components

### AppShell

Outer page wrapper. Contains `TopBar` + route content + overlay portals.

- Max width: 1440px centered
- Padding: `0 32px 32px`
- Flex column, min-height 100vh

### TopBar

Sticky header shared by daily/creation/leaderboard screens.

- Grid: `auto 1fr auto`
- Content: Brand seal + 百世流芳 | Season · Year · Era | Character name + title pill
- Background: semi-transparent paper-0 with `backdrop-filter: blur(10px)`
- Border-bottom: hairline

### SceneBackground

Fixed full-bleed image + ink gradient + vignette. Used by landing/exam/palace/era.

- Props: `src`, `opacity` (gradient strength 0.6–0.92)
- Layers: image → linear-gradient → radial-gradient vignette
- `::after` pseudo for vignette

### ScrollFramePanel

Scroll-frame PNG as `background-image: 100% 100%`. Used by exam screen.

- Padding: `clamp(58px, 7.5%, 88px) clamp(96px, 10.5%, 132px)`
- Animation: `scroll-unfurl` (scaleY 0.6→1, 0.7s)
- Inner content is flex-column

---

## Data Display Components

### StatPanel

Portrait + 4 stat rows + optional tools sub-stack.

- Portrait: aspect-ratio 3/4, gradient overlay at bottom
- Character name overlaid at bottom-left (calli font, gold-glow)
- Contains 4 `StatRow` instances

### StatRow

Single stat with label + gradient bar + numeric value + transient delta.

- Props: `slot` (talent/fortune/spirit/wealth), `label`, `value`, `max`, `delta`
- Bar: 5px height, slotted gradient (gold/vermillion/jade/bone-dim)
- Delta chip: slides in from left, jade for positive, vermillion for negative, clears after 1.4s
- Danger state: spirit ≤ 25 → pulse shadow + vermillion label

### StatusBadge

Tier pill (S/A/B/C/D/F) + title chip + court-hint tag.

- Three sizes, six tier colors
- Used in leaderboard, palace ranking, topbar

---

## Interactive Components

### ActionCard

Seasonal action selection (5 per turn + locked slots).

- States: default, hover (translateY -3px + gold border), disabled, locked
- Content: icon medallion (96px circle) + title (serif 20px) + flavor + stat preview
- Locked variant: grayscale icon + ✕ overlay + lock-note at bottom
- Preview row: jade for gains, vermillion for losses

### EventChoice

Choice card within the random event modal.

- States: default, hover (gold border + translateY -2px)
- Content: key label (其一/A) + title (serif 17px) + stat preview
- Grid: 3 columns within event modal

### ExamChoice

Answer option in the exam scroll panel.

- States: default, hover, selected (gold-glow border + corner triangle)
- Content: letter (latin-serif italic 18px) + answer text
- Grid: 3 columns

### HeirCard

Heir candidate in inheritance screen.

- States: default, hover, selected (gold border + 嗣 stamp)
- Content: name + birth-order + trait pills + flavor + 4-stat tendency grid
- Grid: 3 columns

### BlessingCard

Ancestral blessing purchase in inheritance.

- States: default, hover, purchased (gold border + ✓ + jade cost)
- Content: title + effect description + cost
- Grid: 4 columns

---

## Overlay Components

### EventModal

Random event popup during daily loop.

- Scrim: fixed, rgba(8,6,4,0.78), backdrop-blur 6px
- Card: max 880px, paper-1 bg, gold-dim border
- Content: label + title (calli 44px) + ink-divider image + body + 3 choices + free-form textarea
- Animation: fade scrim + scale-in card (0.45s)

### ResultOverlay

Exam pass/fail result with dramatic presentation.

- Full-screen scrim, z-100
- Card: 2-column grid (image | body), max 1100px
- Left: moment illustration with gradient fade-right
- Right: label + title (calli 88px) + narration + 4-stat readout + return button
- Stamp: seal-blank-red.png + calligraphic text, stamp-down animation (scale 2.4→1)

### PalaceRanking

Competitive 殿试 ranking reveal.

- Full-screen with imperial-court.png background
- 2-column: ranking list (4 rows) | emperor commentary panel
- Rows stagger-animate (0.05s/0.25s/0.45s/0.65s delay)
- Player row: gold-glow border + vermillion left marker
- Emperor panel: 御 watermark + quote + seal signature

### EraTransition

Full-screen interstitial between eras.

- Two scene images: old era (faded) + new era (clip-path wipe from left)
- Wipe: `polygon(0 0, 0 0, 0 100%, 0 100%)` → `polygon(0 0, 110% 0, 110% 100%, 0 100%)`, 2.4s
- Content fades in at 1.2s: label + title (calli, clamp 56–132px) + from→to + quote

### LeaderboardTable

Hall of Fame with dynasty summary + 12-row table.

- Dynasty card: seal graphic (left) + stats + note (right)
- Table: rank + family + tier + title + generations + score
- Top-3 rows use stamp-style rank numbers
- Player row: vermillion-led highlight

---

## Primitive Components

### Panel

Decorative container with corner brackets.

- Props: `title` (CN), `en` (English subtitle), `children`
- Corner brackets: 4 × `<i>` elements (14×14px, gold-dim border, positioned absolute)
- Header: vermillion marker bar + title + en subtitle

### NarrativeStrip

Single-line story beat at bottom of daily loop.

- Content: 叙 seal marker + narrative text + timestamp
- Background: subtle gradient (paper-2 → paper-1)
- Border: hairline

### SealStamp

Reusable vermillion seal with text overlay.

- Props: `text`, `size`, `rotation`
- Background: seal-blank-red.png or CSS-only (vermillion square)
- Text: calli font, centered
- Used in: TopBar brand, ResultOverlay, Leaderboard top-3

---

## Component → File Mapping

```
components/
├── game/
│   ├── TopBar.tsx
│   ├── StatPanel.tsx
│   ├── StatRow.tsx
│   ├── ActionCard.tsx
│   ├── EventModal.tsx
│   ├── ExamPanel.tsx
│   ├── ResultOverlay.tsx
│   ├── PalaceRanking.tsx
│   ├── InheritanceScreen.tsx
│   ├── EraTransition.tsx
│   ├── LeaderboardTable.tsx
│   └── NarrativeStrip.tsx
└── ui/
    ├── Panel.tsx
    ├── SealStamp.tsx
    ├── StatusBadge.tsx
    ├── SceneBackground.tsx
    └── ScrollFramePanel.tsx
```
