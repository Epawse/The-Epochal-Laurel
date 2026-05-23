# Design Tokens

> Extracted from the vertical-slice prototype (`local/claude-design-prototype/styles.css`). These tokens define the visual identity of 百世流芳 and must be registered as Tailwind v4 theme extensions.

---

## Implementation Strategy

**Tailwind v4 as primary** + a `globals.css` (~100 lines) for effects that can't be expressed as utilities:
- SVG `feTurbulence` paper-grain texture overlay (`mix-blend-mode: overlay`)
- `clip-path: polygon()` ink-wipe transition (era change)
- `background-image` scroll-frame positioning with `clamp()` padding

Everything else maps to Tailwind theme tokens or utilities.

---

## Color Palette

Register in `tailwind.config.ts` under `theme.extend.colors`:

| Token | Hex | Usage |
|-------|-----|-------|
| `ink` | `#0f0c08` | Deepest black — image backgrounds, text shadow base |
| `paper-0` | `#1a1410` | Page background |
| `paper-1` | `#221a13` | Card/panel surface |
| `paper-2` | `#2c2218` | Raised/elevated surface |
| `paper-3` | `#3a2d20` | Hovered surface |
| `paper-bone` | `#ece3cf` | Light parchment (action icon bg) |
| `paper-bone-dim` | `#d8caa6` | Dimmed parchment |
| `hairline` | `#4a3a28` | Primary border color |
| `hairline-soft` | `#322517` | Subtle separator |
| `gold` | `#c9a55a` | Primary accent — titles, stat values, selected states |
| `gold-dim` | `#8a7140` | Muted gold — borders, secondary accent |
| `gold-glow` | `#e8c879` | Bright gold — hero titles, selected highlights |
| `vermillion` | `#c4392c` | Action/danger — CTA buttons, risk indicators, stamps |
| `vermillion-deep` | `#8b2820` | Dark vermillion — button gradient end, deep accents |
| `jade` | `#6b8e6f` | Positive delta — stat gains, success states |
| `smoke` | `#8a8276` | Neutral muted |
| `bone` | `#ece3cf` | Primary text color (on dark backgrounds) |
| `bone-dim` | `#b8ad95` | Secondary text |
| `bone-mute` | `#847a66` | Tertiary/disabled text |

### Semantic Aliases

```ts
// tailwind.config.ts theme.extend.colors
background: "var(--paper-0)",
foreground: "var(--bone)",
card: "var(--paper-1)",
"card-hover": "var(--paper-3)",
border: "var(--hairline)",
accent: "var(--gold)",
destructive: "var(--vermillion)",
positive: "var(--jade)",
muted: "var(--bone-mute)",
```

---

## Typography

### Font Stacks

| Token | Stack | Usage |
|-------|-------|-------|
| `--font-serif` | `"Noto Serif SC", "Cormorant Garamond", "Songti SC", serif` | Panel titles, body text, stat labels, dialogue |
| `--font-sans` | `"Noto Sans SC", -apple-system, "PingFang SC", "Helvetica Neue", sans-serif` | Base body font |
| `--font-mono` | `"JetBrains Mono", ui-monospace, monospace` | Labels, metadata, timestamps, stat values |
| `--font-latin-serif` | `"Cormorant Garamond", "Noto Serif SC", serif` | English subtitles, italic annotations |
| `--font-calli` | `"Ma Shan Zheng", "ZCOOL XiaoWei", "Noto Serif SC", serif` | Hero titles (百世流芳, 殿试放榜), character names, calligraphic stamps |

### Font Loading

Load via Google Fonts in `app/layout.tsx`:
```
Noto Serif SC (400, 500, 600, 700)
Noto Sans SC (300, 400, 500, 600)
Ma Shan Zheng (400)
ZCOOL XiaoWei (400)
Cormorant Garamond (400, 500, 600, italic)
JetBrains Mono (400, 500)
```

### Type Scale Conventions

| Context | Size | Font | Letter-spacing |
|---------|------|------|----------------|
| Hero title (landing, era) | `clamp(64px, 9.5vw, 128px)` | calli | `0.28–0.42em` |
| Screen title (殿试放榜) | `38–52px` | calli | `0.32–0.36em` |
| Panel title (才学, 局势) | `16–17px` | serif | `0.18em` |
| Body text | `14–16px` | serif | `0.04–0.06em` |
| Metadata/labels | `10–11px` | mono | `0.18–0.32em` |
| English subtitle | `11–16px` | latin-serif italic | `0.04–0.06em` |

---

## Spacing & Layout

### Grid Patterns

| Screen | Layout |
|--------|--------|
| Daily loop | `grid-cols-[320px_1fr_320px]` gap-6 |
| Character creation | `grid-cols-[360px_1fr]` gap-7 |
| Palace ranking | `grid-cols-[1fr_360px]` gap-6 |
| Inheritance | single column, nested grids |

### Panel Pattern

All panels share:
- `background: paper-1`, `border: 1px solid hairline`
- Corner brackets (decorative `<i>` elements, 14×14px, gold-dim border)
- Header: marker (4×16px vermillion bar) + CN title + EN subtitle

### Max Widths

| Context | Max width |
|---------|-----------|
| App shell | `1440px` centered |
| Modals (event, exam result) | `880px` |
| Scroll panel (exam) | `1080px` |
| Palace ranking | `1180px` |
| Inheritance | `1320px` |
| Landing inner | `900px` |

---

## Decorative Elements

### Paper Grain Texture (globals.css)

```css
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='320'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='2' seed='5'/><feColorMatrix values='0 0 0 0 0.85   0 0 0 0 0.78   0 0 0 0 0.62   0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
  mix-blend-mode: overlay;
  opacity: 0.55;
}
```

### Vignette

```css
body::after {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 2;
  background: radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.55) 100%);
}
```

### Vermillion Seal Stamp

- Asset: `seal-blank-red.png` (130×130px)
- Overlay text in `--font-calli`, vermillion color
- Rotation: `-4° to -8°`
- Used in: result overlay, leaderboard, inheritance

---

## Design Decision: Tailwind + globals.css Hybrid

**Context**: The prototype uses 3200 lines of custom CSS. Migrating 100% to Tailwind utilities is possible for ~95% of it, but three effects require raw CSS.

**Decision**: Tailwind v4 theme tokens + utilities for all layout/color/typography. A `globals.css` file (~100 lines) handles:
1. Paper grain SVG texture overlay
2. Vignette radial gradient
3. Era-transition clip-path ink wipe animation
4. Scroll-frame `background-image` + `clamp()` padding
5. `@keyframes` for stamp-down, scroll-unfurl, era-wipe (Framer Motion handles the rest)

**Why**: Tailwind gives component-level co-location, tree-shaking, and responsive utilities. The exceptions are genuinely inexpressible as utilities (SVG data URIs, multi-stop fixed overlays, clip-path animations).
