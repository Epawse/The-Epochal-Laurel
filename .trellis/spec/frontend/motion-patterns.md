# Motion Patterns

> 7 animation patterns extracted from the vertical-slice prototype. Implement with Framer Motion for component-level animations; use CSS `@keyframes` in `globals.css` only for the three effects that require `clip-path` or fixed-position pseudo-elements.

---

## Implementation Split

| Pattern | Tool | Reason |
|---------|------|--------|
| Fade / Scale | Framer Motion `motion.div` | Component lifecycle, `AnimatePresence` exit |
| Scroll-unfurl | Framer Motion | `scaleY` on mount, single element |
| Stamp-down | Framer Motion | `scale` + `rotate`, delayed entry |
| Bar fill | CSS `transition` on width | Always mounted, value-driven |
| Delta chip | Framer Motion | Conditional render + exit animation |
| Danger pulse | CSS `@keyframes` | Infinite loop, no JS trigger |
| Ink-wipe | CSS `@keyframes` in globals.css | `clip-path` animation (Framer can't interpolate polygon) |

---

## 1. Fade / Scale

**Used by**: All modals, overlays, screen transitions.

```tsx
// Framer Motion variant
const fadeScale = {
  initial: { opacity: 0, y: 14, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 0.98 },
  transition: { duration: 0.45, ease: [0.2, 0.7, 0.2, 1] },
};
```

**Scrim** (backdrop): fade only, 0.35s ease.

**Stagger children**: Use `staggerChildren: 0.1` on parent for lists (event choices, action cards).

---

## 2. Scroll-unfurl

**Used by**: Exam scroll panel.

```tsx
const scrollUnfurl = {
  initial: { opacity: 0, scaleY: 0.6 },
  animate: { opacity: 1, scaleY: 1 },
  transition: { duration: 0.7, ease: [0.2, 0.7, 0.2, 1] },
};
// Apply with style={{ transformOrigin: "top center" }}
```

---

## 3. Ink-wipe (globals.css)

**Used by**: Era transition — reveals new era scene image from left.

```css
.era-wipe {
  clip-path: polygon(0 0, 0 0, 0 100%, 0 100%);
  animation: era-wipe 2.4s cubic-bezier(0.7, 0, 0.3, 1) 0.6s both;
}

@keyframes era-wipe {
  to { clip-path: polygon(0 0, 110% 0, 110% 100%, 0 100%); }
}
```

**Why CSS**: Framer Motion cannot interpolate `clip-path: polygon()` values.

---

## 4. Stamp-down

**Used by**: Result overlay seal stamp, leaderboard rank stamps.

```tsx
const stampDown = {
  initial: { opacity: 0, scale: 2.4, rotate: -8 },
  animate: { opacity: 1, scale: 1, rotate: -8 },
  transition: { duration: 0.6, ease: [0.5, 1.6, 0.6, 1], delay: 0.4 },
};
```

The spring-like ease (`[0.5, 1.6, 0.6, 1]`) creates a slight overshoot — the stamp "impacts" then settles.

---

## 5. Bar fill

**Used by**: StatRow bars (talent, fortune, spirit, wealth).

```css
/* Applied via Tailwind: transition-[width] duration-600 ease-[cubic-bezier(0.4,0,0.2,1)] */
```

No Framer Motion needed — the bar is always mounted, only its `width` style changes. Use inline `style={{ width: `${pct}%` }}` with a CSS transition.

---

## 6. Delta chip

**Used by**: StatRow +/- indicators after actions.

```tsx
const deltaChip = {
  initial: { opacity: 0, x: -4 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 4 },
  transition: { duration: 0.3 },
};
```

- Color: `jade` for positive, `vermillion` for negative
- Auto-dismiss: parent clears the delta value after 1.4s (via `setTimeout` or Zustand transient state)
- Wrap in `<AnimatePresence>` keyed on the delta value

---

## 7. Danger pulse

**Used by**: Spirit stat bar when value ≤ 25.

```css
/* globals.css */
@keyframes danger-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(196, 57, 44, 0); }
  50%      { box-shadow: 0 0 0 2px rgba(196, 57, 44, 0.32); }
}

.stat-spirit-danger .bar {
  border-color: var(--vermillion);
  animation: danger-pulse 1.6s ease-in-out infinite;
}
```

Also applies: spirit label turns vermillion, portrait desaturates 60%.

---

## Palace Row Stagger

**Used by**: PalaceRanking — 4 candidate rows reveal sequentially.

```tsx
const palaceRow = {
  initial: { opacity: 0, y: -8, scaleY: 0.85 },
  animate: { opacity: 1, y: 0, scaleY: 1 },
  transition: { duration: 0.55, ease: [0.2, 0.7, 0.2, 1] },
};

// Delays per row: 0.05s, 0.25s, 0.45s, 0.65s
// Use custom delay per item, not staggerChildren (uneven spacing is intentional)
```

---

## Reduced Motion

All animations must respect `prefers-reduced-motion`:

```tsx
// In Framer Motion: use useReducedMotion() hook
// Fallback: instant transitions (duration: 0.01), no scale/translate
```

CSS animations in globals.css:
```css
@media (prefers-reduced-motion: reduce) {
  .era-wipe { animation: none; clip-path: none; }
  .stat-spirit-danger .bar { animation: none; }
}
```

---

## Easing Reference

| Name | Value | Usage |
|------|-------|-------|
| `ease-out-expo` | `[0.2, 0.7, 0.2, 1]` | Primary — modals, panels, rows |
| `ease-in-out-smooth` | `[0.7, 0, 0.3, 1]` | Ink-wipe (slow start, slow end) |
| `spring-impact` | `[0.5, 1.6, 0.6, 1]` | Stamp-down (overshoot) |
| `ease-standard` | `[0.4, 0, 0.2, 1]` | Bar fills, subtle transitions |

---

## Common Mistake: Animating Layout Shifts

Don't animate `height`, `grid-template-columns`, or `padding` — these trigger layout recalc. Animate `transform` (scale, translate) and `opacity` only. The scroll-unfurl uses `scaleY` not `height` for this reason.
