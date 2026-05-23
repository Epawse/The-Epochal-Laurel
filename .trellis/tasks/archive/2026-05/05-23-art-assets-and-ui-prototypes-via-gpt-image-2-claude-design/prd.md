# Art Assets and UI Prototypes via GPT Image 2 + Claude Design

## Goal

Produce all visual assets and interactive UI prototypes for 百世流芳 (The Epochal Laurel) v1 demo. GPT Image 2 generates production-quality art in Chinese historical ink painting style; Claude Design produces interactive page prototypes and an asset showcase. This is a design/asset task — outputs are image files, prompt templates, and prototype URLs, not application code.

## What I already know

* GPT Image 2: custom sizes up to 4K-class outputs, strong visual generation and editing, but production Chinese text and transparent-background output still need manual validation/post-processing
* Claude Design (April 2026): prompt-to-interactive-prototype, exports HTML/ZIP/PDF/PPTX, handoff to Claude Code, design system ingestion from codebase/uploads
* Game has 4 eras (prosperity/decline/invasion/restoration), each needing distinct visual tone
* Core-loop.md defines 8 Key Visual/Animation Moments (P0-P2) that need dedicated art
* Game is text-heavy with seasonal action selection — UI is card/panel based, not action-game
* Demo target: laptop browser, QR code access, responsive but desktop-first

## Requirements

### R1: Art Bible (Style Lock — Hybrid Layered)

* Define the hybrid layered style: 6 visual layers with distinct rendering approaches unified by shared color temperature, texture, and accent colors
* Generate 5-10 reference images covering each layer:
  - 1-2 background references (彩墨 ink wash)
  - 1-2 character references (古籍绣像 line art + light color)
  - 1-2 UI framework references (宣纸暗调 dark parchment)
  - 1-2 decoration references (seals, borders, dividers)
  - 1 icon/button reference (flat with ink texture)
  - 1 key moment reference (full 彩墨 illustration)
* Document: layer definitions, unifying elements, era-specific palettes, prompt templates per layer, anti-patterns
* Output: `public/assets/art-bible/` directory with reference images + `style-guide.md`

### R2: Character Assets (GPT Image 2)

* Core characters (portrait style, bust or half-body):
  - 书生 (Scholar protagonist) — 3 age variants (young/middle/old)
  - 考官 (Examiner) — 2 variants (strict/corrupt)
  - 恩师 (Mentor) — 1 variant
  - 对手 (Rival scholars) — 2 variants
  - 妻子 (Spouse) — 1 variant
* Each portrait: consistent style per art bible; generate on parchment or plain high-contrast background, then remove background in post-processing if alpha is needed
* Output: `public/assets/characters/` as PNG

### R3: Scene/Background Assets (GPT Image 2)

* Key scenes (landscape/environment, 16:9 aspect):
  - 书斋 (Study room) — default daily-loop background
  - 考场 (Examination hall) — exam phase background
  - 朝堂 (Imperial court) — palace exam background
  - 乡村 (Village) — inheritance/home scene
* Era variants: at minimum prosperity vs. invasion tone for 书斋 and 乡村
* Output: `public/assets/scenes/` as PNG

### R4: UI Decorative Elements (GPT Image 2)

* Scroll/parchment frame borders (tileable or 9-slice)
* Seal/stamp decorations (for exam results, era markers)
* Ink brush dividers and section headers
* Icon set: 5 action categories (读书/交游/营生/休养/钻营)
* Output: `public/assets/ui/` as PNG sources; alpha-channel versions are produced by post-processing where needed

### R5: Event Illustration Key Frames (GPT Image 2)

* P0 moments (3 illustrations):
  - 中举 (Exam pass) — celebration scene
  - 落第 (Exam fail) — dejection scene
  - 传承 (Inheritance) — father-to-son moment
* P1 moments (2 illustrations):
  - 东窗事发 (Scheme exposure) — dramatic reveal
  - 殿试 (Palace exam) — emperor's court
* Output: `public/assets/moments/` as PNG

### R6: Asset Showcase (Claude Design)

* Single-page showcase displaying all generated assets organized by category
* Includes art bible references, character gallery, scene gallery, UI elements, moments
* Use generated images as uploaded source assets; Claude Design should organize, label, preview, and filter them rather than regenerate art
* Build this showcase before the game-page prototypes so it becomes the visual QA checkpoint and presentation artifact
* Exportable as HTML for demo presentation
* Output: Claude Design project URL + exported HTML

### R7: Game Page Prototypes (Claude Design)

* Interactive clickable prototypes for all game screens:
  - Landing / New Game (dynasty name input, origin selection)
  - Daily Loop (season display, action cards, stat bars, event trigger)
  - Random Event (event card with choices + free-text input)
  - Exam Screen (question display, A/B/C choices + free-text, submit)
  - Palace Exam (rival display, ranking reveal)
  - Inheritance (heir candidates, blessing spending)
  - Leaderboard (score table, victory tier)
* Use GPT Image 2 assets as backgrounds/decorations where ready
* Simple UI elements (buttons, cards, stat bars) generated directly by Claude Design
* Use only showcase-approved assets; keep readable Chinese UI text as HTML/CSS text overlays, not baked into uploaded images
* Export as HTML for developer reference during implementation
* Output: Claude Design project URL + exported HTML/ZIP

## Current Progress (2026-05-23)

### Completed

* Art bible references generated and renamed:
  - `public/assets/art-bible/reference-01-style-board.png`
  - `public/assets/art-bible/reference-02-character-scholar.png`
  - `public/assets/art-bible/reference-03-scene-exam-hall.png`
  - `public/assets/art-bible/reference-04-ui-frame.png`
* Full production queue generated and checked:
  - 6 scene backgrounds in `public/assets/scenes/`
  - 9 character portraits in `public/assets/characters/`
  - 10 UI decoration assets in `public/assets/ui/`
  - 5 key moment illustrations in `public/assets/moments/`
* Asset inventory matches `public/assets/_prompts/production-queue.md`: 30 expected production assets, 30 present, no extra production PNGs.
* `public/assets/_prompts/generation-log.jsonl` records all 34 image files (4 art bible + 30 production assets).
* Local visual QA via contact sheets passed: style is consistent; no major missing/corrupt assets found.
* Claude Design Asset Showcase v1 was created with Phase 1/2 uploads (art bible, scenes, characters) and visually approved by the user.
* Claude Design Asset Showcase final export has been saved locally at `local/claude-design-showcase/` with all art bible, scene, character, UI decoration, and key moment assets included.

### Known Notes

* ChatGPT web outputs are below true 4K for some images, accepted as usable for this phase.
* All current PNGs are RGB/no-alpha sources. Claude Design should use them as backgrounds, panel art, icons, and preview images; transparent UI variants can be post-processed later if implementation requires it.
* `public/assets/scenes/study-room--invasion.png` includes a visible character, so it is better as a story/event scene than as a neutral UI background.
* Readable Chinese UI copy remains HTML/CSS text in Claude Design or frontend code; do not bake text into generated images.

### Next Actions

1. Start the Claude Design Game Prototype project with the core flow first: Daily Loop, Random Event, Exam.
2. Verify visual fit, asset use, navigation, and modal behavior before asking for all seven screens.
3. Expand to Landing / Character Creation, Palace Exam, Inheritance, and Leaderboard after the core flow is stable.
4. Export or save the completed game prototype artifact for frontend implementation reference.

## Acceptance Criteria

* [x] Art bible established with reference images and documented style keywords
* [x] Character portraits generated with consistent style
* [x] Scene backgrounds covering key game phases generated
* [x] UI element set (borders, stamps, icons) sufficient for prototype decoration generated
* [x] 5 key-frame illustrations for P0/P1 animation moments generated
* [x] Asset showcase page viewable in browser/exported locally
* [ ] 7 game page prototypes with clickable navigation between screens
* [x] All assets organized in `public/assets/` with clear naming

## Definition of Done

* All image assets are production-quality enough for prototype use (no obvious corrupt files, consistent style)
* Prototypes accurately reflect the game-design spec (core-loop.md screens and flows)
* Assets are named and organized for easy reference during frontend implementation
* Prompt templates documented for reproducibility and future iteration

## Out of Scope

* Application code (this task produces assets and prototypes only)
* Animation implementation (only static key frames for animated moments)
* Sound/audio assets
* Final pixel-perfect UI (prototypes are for flow validation, not production fidelity)
* Mobile-specific layouts (desktop-first prototypes only)

## Technical Notes

* GPT Image 2 accessed via ChatGPT/Responses multi-turn workflows or Image API (`gpt-image-2` model)
* ChatGPT web workflow uses English prompts, art-bible style anchors, and 4K/highest-available generation targets
* Claude Design accessed via claude.ai/design (Pro/Max subscription)
* Style consistency strategy: include 2-3 art bible references in ChatGPT/Responses/editing workflows where possible; otherwise prepend the locked style block and log exact prompts
* For batch generation: use structured prompt templates with variable slots (era, character, mood), `quality: low|medium|high`, and sizes that satisfy current `gpt-image-2` constraints
* Claude Design workflow: first create an Asset Showcase project from uploaded final assets; then create the Game Prototype project using selected showcase-approved assets
* Export format: HTML from Claude Design can serve as implementation reference for T6 (Frontend Core task)

## Open Questions

(none — all resolved)

## Decision (ADR-lite)

**Context**: Need to choose an art style that balances AI generation consistency, cultural identity, text-heavy UI readability, and hackathon demo impact.

**Decision**: Direction 6 — 混合分层 (Hybrid Layered). Different art styles for different visual layers, each chosen for optimal AI consistency and functional purpose.

**Layer Breakdown**:

| Layer | Style | Rationale |
|-------|-------|-----------|
| Backgrounds | 彩墨 ink wash + selective color | Each is unique — no cross-image consistency needed. Maximum atmosphere. |
| UI framework | 宣纸暗调 dark parchment + gold/vermillion | Text readability (light on dark), stable AI generation, immersive "document" feel |
| Characters | 古籍绣像 line art + light color wash | Consistency across portraits, thematic authenticity (绣像本 tradition) |
| Decorations | Seals, borders, dividers | GPT Image 2 handles these reliably |
| Key moments | Full 彩墨 illustrations | One-off pieces, maximum emotional impact |
| Icons/buttons | Flat with ink texture | Readability at small size, batch-producible |

**Unifying Elements** (cohesion across layers):
- Shared color temperature per era (warm for 盛世/中兴, cool for 衰世/乱世)
- Consistent paper/silk texture underlying everything
- Vermillion red (朱红) as universal accent color
- Ink black as primary text/line color
- 留白 philosophy applied to layout (generous spacing)

**Era-Specific Palettes**:

| Era | Background Palette | UI Accent | Ink Density |
|-----|-------------------|-----------|-------------|
| 盛世 (Prosperity) | Warm gold, rich vermillion, jade green | Gold | Medium-wet, flowing |
| 衰世 (Decline) | Muted ochre, faded ink, sparse color | Faded copper | Dry brush, sparse |
| 乱世 (Invasion) | Charcoal black, blood red, smoke grey | Crimson red | Heavy splash ink |
| 中兴 (Restoration) | Fresh blue-green (青绿), dawn gold | Jade green | Clean lines, balanced |

**Consequences**:
- Requires clear art bible defining how layers interact
- Each layer uses the style AI handles best for that purpose
- More complex prompt engineering (different templates per layer)
- Mitigated by: art bible Phase 1 explicitly defines unifying elements

## Research References

* [`research/art-style-directions.md`](research/art-style-directions.md) — 6 viable styles analyzed; hybrid layered recommended for best balance of consistency + impact
* [`research/gpt-image-2-ink-painting.md`](research/gpt-image-2-ink-painting.md) — prompt engineering, resolution, batch workflow, era palettes
* [`research/asset-pipeline-organization.md`](research/asset-pipeline-organization.md) — directory structure, naming, formats, storage strategy
* [`research/claude-design-prototyping.md`](research/claude-design-prototyping.md) — prototype capabilities, export formats, limitations

## Prompt Templates

### Background Layer (彩墨 Ink Wash)
```
[Scene description], Chinese ink wash landscape painting style (彩墨),
wide establishing shot, [time of day] lighting,
[era] dynasty architecture and furnishings,
atmospheric ink wash gradients in background, detailed foreground elements,
留白 in upper 20-30% for UI overlay space,
mist/clouds as natural transitions,
xuan paper texture, visible brush energy,
[era palette keywords], [mood] atmosphere,
game background art, aspect ratio 16:9, 4K detail
```

### Character Layer (古籍绣像 Line Art)
```
[Character role], Chinese historical woodblock print illustration style (绣像/连环画),
half-body portrait, [age] [gender],
bold ink outlines with calligraphic line weight variation,
minimal color wash (淡彩) — [1-2 accent colors only],
wearing [specific costume anchors],
[expression/mood], [distinctive features],
aged parchment background,
game character portrait, aspect ratio 3:4
```

### UI Layer (宣纸暗调 Dark Parchment)
```
[UI element type], traditional Chinese antiquarian style,
dark aged xuan paper/silk texture base,
gold/vermillion decorative accents,
[specific element: scroll border / seal stamp / ink divider],
clean edges suitable for 9-slice or tiling,
plain high-contrast background outside element for background removal,
game UI decoration, [aspect ratio]
```

### Key Moment Layer (Full 彩墨)
```
[Moment description], Chinese historical ink painting (彩墨) full illustration,
dramatic composition, [emotion] atmosphere,
rich ink wash with [era palette] color accents,
expressive brush strokes, dynamic energy,
xuan paper texture, visible artistic intent,
game event illustration, aspect ratio 16:9, 4K detail
```

### Claude Design Prototype Template
```
Create an interactive game UI prototype for [screen name].
Context: Chinese imperial examination roguelike game (百世流芳).
Visual direction: Dark parchment/silk base, gold and vermillion accents,
ink painting backgrounds (uploaded), woodblock-print style character portraits.
Layout: [description from spec]
Interactions: [clickable elements, navigation targets]
Typography: Modern Chinese sans-serif for readability, decorative calligraphy for headers only.
Color scheme: Dark warm base (#2a1f1a), gold text (#c9a96e), vermillion highlights (#c23b22).
```
