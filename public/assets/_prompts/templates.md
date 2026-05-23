# Prompt Templates — 百世流芳 (The Epochal Laurel)

> Ready-to-copy prompts for GPT Image 2 and Claude Design.
> Fill in `[bracketed]` variables before use.

## Current GPT Image 2 API Notes

- Model: `gpt-image-2`
- Recommended API path: use the Image API for one-shot generation/editing; use the Responses API image generation tool for multi-turn iteration and reference-image workflows.
- Quality values: `low` for fast drafts, `medium` for review candidates, `high` for final assets, `auto` when unsure.
- Size rules: both edges must be multiples of 16px, max edge <= 3840px, long:short ratio <= 3:1, total pixels between 655,360 and 8,294,400.
- Transparent background: `gpt-image-2` does not currently support `background: "transparent"`. Generate isolated assets on a plain white, matte black, or chroma-green background, then remove the background in post-processing.
- Text in images: do not rely on generated Chinese text for production UI. Generate blank seals/banners/scrolls and add readable text later via frontend, SVG, or manual compositing.

## Recommended ChatGPT Web Workflow

Use English prompts in ChatGPT web. Generate all final assets at 4K or the highest available resolution, while keeping dimensions compatible with the GPT Image 2 constraints above.

For the copy-paste production order, use [`production-queue.md`](./production-queue.md).

1. Start a fresh conversation for the art bible.
2. Send the Style Lock prompt below.
3. Generate three seed references: Character, Scene Background, UI Element.
4. Pick 2-3 successful images as uploaded style anchors.
5. Generate scene backgrounds first.
6. Generate character portraits.
7. Generate UI decorations.
8. Generate key moment illustrations.
9. Log every selected asset in `generation-log.jsonl`.

### Style Lock Prompt

```
I am creating visual assets for a Chinese imperial-examination roguelike game titled "The Epochal Laurel" / "百世流芳".

Please establish a consistent art bible for all future image generations.

Overall art direction:
- Backgrounds: Chinese colored ink wash painting, atmospheric, xuan paper texture, strong use of negative space.
- Characters: Chinese historical woodblock-print / lianhuanhua portrait style, bold ink outlines, light color wash.
- UI decorations: dark aged xuan paper or silk, gold and vermillion accents, antique manuscript feel.
- Key moments: full colored ink wash illustrations with dramatic composition.

Global constraints:
- Do not render readable Chinese text inside the image.
- Leave banners, seals, scrolls, and title areas blank for later text overlay.
- Use vermillion red and muted gold as recurring accents.
- Use visible brush texture, natural ink bleeding, xuan paper grain, and asymmetrical composition.
- Avoid anime, manga, 3D render, photorealism, and modern fantasy game art.
- Generate at 4K or the highest available resolution.
```

### 4K Size Targets for ChatGPT Web

| Asset Type | Prompt Wording |
|-----------|----------------|
| Scene background | `4K landscape, 16:9, 3840x2160, highest available resolution` |
| Key moment illustration | `4K landscape, 16:9, 3840x2160, highest available resolution` |
| Character portrait | `4K portrait, vertical composition, 2160x3840, highest available resolution` |
| Seal / icon | `4K square, maximum available square resolution` |
| Divider source | `4K wide source image, 3:1 ratio, 3840x1280, intended to be cropped into a thin divider` |

---

## 1. Art Bible Seed Prompts

Use these first to establish the visual language. Generate 2-3 of each, pick the best, then use as reference for all subsequent generations.

### Seed: Character

```
A Chinese scholar in his 30s reading by candlelight, woodblock print illustration style (绣像/连环画), bold ink outlines with calligraphic line weight variation, minimal color wash — only indigo robe and warm candlelight glow, wearing traditional scholar's cap (方巾) and flowing robe (青衫), contemplative expression, aged parchment background with subtle paper grain texture, half-body portrait composition, game character concept art, aspect ratio 3:4
```

### Seed: Scene Background

```
A traditional Chinese examination hall at dawn, ink wash landscape painting style (彩墨), atmospheric ink gradients creating depth and mist, rows of wooden examination cubicles receding into fog, paper lanterns casting warm pools of light, Song dynasty architecture with curved eaves, 留白 (negative space) in upper 25% for UI overlay, xuan paper texture throughout, tense and solemn atmosphere, game background art, aspect ratio 16:9, 4K detail
```

### Seed: UI Element

```
Traditional Chinese scroll border frame on dark aged silk background, antiquarian manuscript style, deep warm brown/black base (#2a1f1a), thin gold decorative border lines with subtle cloud motif (云纹) at corners, vermillion red seal stamp in bottom-right corner, center area left blank for content, clean edges suitable for 9-slice scaling, game UI frame element, aspect ratio 16:9
```

---

## 2. Background Layer (彩墨 Ink Wash)

Base template — fill in scene, era, and mood:

```
[Scene description], Chinese ink wash landscape painting style (彩墨),
wide establishing shot, [time of day] lighting,
[era] dynasty architecture and furnishings,
atmospheric ink wash gradients in background, detailed foreground elements,
留白 in upper 20-30% for UI overlay space,
mist and clouds as natural 留白 transitions,
xuan paper texture throughout, visible brush energy in foliage and architecture,
[ERA PALETTE — see Section 6], [mood] atmosphere, [season] seasonal indicators,
game background art, aspect ratio 16:9, 4K detail
```

### Scene-Specific Prompts

**书斋 (Study Room) — Daily Loop Default**
```
A scholar's private study room at night, Chinese ink wash painting style (彩墨), candlelight illuminating stacked books and an ink stone on a wooden desk, bamboo visible through a lattice window, calligraphy scrolls hanging on walls, intimate and contemplative atmosphere, [ERA PALETTE], 留白 in upper 25% for UI overlay, xuan paper texture, game background art, aspect ratio 16:9, 4K detail
```

**考场 (Examination Hall) — Exam Phase**
```
Imperial examination hall interior, Chinese ink wash painting style (彩墨), long rows of narrow wooden cubicles stretching into misty distance, paper lanterns hanging from high beams, a single scholar hunched over his desk in foreground, imposing scale emphasizing isolation, tense and solemn atmosphere, [ERA PALETTE], 留白 in upper 25%, xuan paper texture, game background art, aspect ratio 16:9, 4K detail
```

**朝堂 (Imperial Court) — Palace Exam**
```
Grand imperial throne hall, Chinese ink wash painting style (彩墨), massive vermillion pillars receding toward a distant throne, golden dragon motifs on ceiling beams, morning light streaming through high windows, vast empty floor emphasizing power and distance, awe-inspiring and intimidating atmosphere, [ERA PALETTE], 留白 in upper 20%, xuan paper texture, game background art, aspect ratio 16:9, 4K detail
```

**乡村 (Village) — Inheritance/Home**
```
A rural Chinese village at sunset, Chinese ink wash painting style (彩墨), thatched-roof houses nestled among willow trees, distant mountains fading into mist, a winding path leading to a modest family compound, pastoral calm with undertone of melancholy, [ERA PALETTE], 留白 in upper 30%, xuan paper texture, game background art, aspect ratio 16:9, 4K detail
```

---

## 3. Character Layer (古籍绣像 Line Art)

Base template:

```
[Character role and description], Chinese historical woodblock print illustration style (绣像/连环画),
half-body portrait facing slightly left, [age descriptor] [gender],
bold ink outlines with calligraphic line weight variation,
minimal color wash (淡彩) — [1-2 accent colors only],
wearing [COSTUME ANCHORS — see below],
[expression/mood], [distinctive features],
aged parchment background with subtle paper grain,
game character portrait, aspect ratio 3:4
```

### Character-Specific Prompts

**书生 (Scholar) — Young (16-25)**
```
A young Chinese scholar, woodblock print illustration style (绣像/连环画), half-body portrait facing slightly left, youthful face with bright eager eyes, bold ink outlines with calligraphic line weight variation, minimal color wash — indigo robe and pale skin tones only, wearing scholar's cap (方巾), flowing indigo robe (青衫) with white inner collar, holding a folding fan, ink-stained fingers visible, determined and hopeful expression, aged parchment background, game character portrait, aspect ratio 3:4
```

**书生 (Scholar) — Middle-aged (35-45)**
```
A middle-aged Chinese scholar, woodblock print illustration style (绣像/连环画), half-body portrait facing slightly left, weathered face with tired but resolute eyes, slight stubble, bold ink outlines with calligraphic line weight variation, minimal color wash — faded indigo robe and warm skin tones, wearing scholar's cap (方巾), slightly worn indigo robe (青衫) with patched sleeve, folding fan tucked in belt, ink-stained fingers, weary but determined expression, aged parchment background, game character portrait, aspect ratio 3:4
```

**书生 (Scholar) — Old (55-65)**
```
An elderly Chinese scholar, woodblock print illustration style (绣像/连环画), half-body portrait facing slightly left, deeply lined face with wise gentle eyes, white beard and hair, bold ink outlines with calligraphic line weight variation, minimal color wash — faded grey-blue robe and pale skin tones, wearing simple cloth cap, threadbare robe with many patches, folding fan held loosely, gnarled ink-stained fingers, peaceful resignation in expression, aged parchment background, game character portrait, aspect ratio 3:4
```

**考官 (Examiner) — Strict**
```
A stern imperial examination official, woodblock print illustration style (绣像/连环画), half-body portrait facing slightly right, sharp angular face with piercing judgmental eyes, thin pressed lips, bold ink outlines with calligraphic line weight variation, minimal color wash — dark official robe with subtle purple-black tones, wearing black official hat (乌纱帽), dark formal robe with rank badge visible, holding a writing brush like a weapon, intimidating and unyielding expression, aged parchment background, game character portrait, aspect ratio 3:4
```

**考官 (Examiner) — Corrupt**
```
A corrupt imperial examination official, woodblock print illustration style (绣像/连环画), half-body portrait facing slightly right, round fleshy face with sly half-lidded eyes, knowing smirk, bold ink outlines with calligraphic line weight variation, minimal color wash — dark robe with gold thread accents suggesting wealth, wearing black official hat (乌纱帽) slightly askew, expensive jade ring visible on finger, calculating and amused expression, aged parchment background, game character portrait, aspect ratio 3:4
```

**恩师 (Mentor)**
```
A kindly elderly Chinese teacher, woodblock print illustration style (绣像/连环画), half-body portrait facing slightly left, round gentle face with warm crinkled eyes, long white beard, bold ink outlines with calligraphic line weight variation, minimal color wash — warm brown simple robe, wearing plain cloth cap, simple worn robe with ink stains, surrounded by stacked books, one hand resting on an open text, warm and encouraging expression, aged parchment background, game character portrait, aspect ratio 3:4
```

**对手 (Rival) — Arrogant**
```
A young arrogant rival scholar, woodblock print illustration style (绣像/连环画), half-body portrait facing slightly right, handsome sharp face with condescending smirk, raised chin, bold ink outlines with calligraphic line weight variation, minimal color wash — rich blue-green robe suggesting wealth, wearing elaborate scholar's cap with jade ornament, expensive silk robe with embroidered collar, holding a fine brush with casual confidence, dismissive and superior expression, aged parchment background, game character portrait, aspect ratio 3:4
```

**对手 (Rival) — Cunning**
```
A cunning rival scholar, woodblock print illustration style (绣像/连环画), half-body portrait facing slightly right, thin face with calculating narrow eyes, slight knowing smile, bold ink outlines with calligraphic line weight variation, minimal color wash — dark grey-green robe, wearing scholar's cap pulled low, plain but well-made robe hiding his true status, hands hidden in sleeves, watchful and scheming expression, aged parchment background, game character portrait, aspect ratio 3:4
```

**妻子 (Spouse)**
```
A gentle Chinese woman, woodblock print illustration style (绣像/连环画), half-body portrait facing slightly left, soft oval face with kind steady eyes, hair in traditional married woman's style with simple silver hairpin (簪), bold ink outlines with calligraphic line weight variation, minimal color wash — soft green inner garment visible at collar, wearing modest but neat clothing, hands folded or holding a piece of embroidery, supportive and quietly strong expression, aged parchment background, game character portrait, aspect ratio 3:4
```

---

## 4. UI Layer (宣纸暗调 Dark Parchment)

### Scroll/Frame Borders

**Horizontal Frame (for cards, event panels)**
```
Traditional Chinese scroll border frame, dark aged silk texture background (#2a1f1a to #3d2e1f gradient), thin gold decorative border with geometric cloud motif (回纹) at corners, subtle vermillion accent line inside border, center area completely blank (dark) for content overlay, clean crisp edges suitable for 9-slice CSS scaling, no text, game UI frame element, aspect ratio 16:9, high contrast
```

**Vertical Frame (for character panels, side info)**
```
Traditional Chinese vertical scroll border, dark aged xuan paper texture background, thin gold border with bamboo motif at top and bottom, vermillion seal stamp decoration in one corner, center area blank for content, clean edges for 9-slice scaling, game UI element, aspect ratio 3:4
```

### Seal/Stamp Decorations

**Era Seal**
```
Traditional Chinese seal stamp (印章) impression, blank center reserved for frontend text overlay, vermillion red ink on aged paper, slightly imperfect edges showing authentic stamp pressure variation, square format with thin border line, no readable Chinese characters, isolated on plain matte white background for background removal, game UI decoration, aspect ratio 1:1
```

**Result Seal (中举/落第)**
```
Large dramatic Chinese seal stamp texture, blank center reserved for frontend text overlay ([中举 or 落第] will be added later), [vermillion red for pass / grey-black for fail] ink impression, slightly rotated 5-10 degrees for dynamic feel, ink bleeding at edges, no readable Chinese characters, isolated on plain matte white background for background removal, game UI result stamp, aspect ratio 1:1
```

### Ink Brush Dividers

**Simple Horizontal Divider**
```
Single horizontal ink brush stroke, Chinese calligraphy style, natural taper at both ends showing brush lift, wet ink with slight bleeding edges, varying thickness from pressure, simple and elegant, isolated on plain matte white background for background removal, game UI separator, generate at 1536x512 then crop to a thin divider
```

**Decorative Divider (with motif)**
```
Horizontal ink brush stroke divider with small plum blossom silhouette at center, Chinese calligraphy style, natural brush energy with taper at ends, wet ink texture, no readable Chinese characters, isolated on plain matte white background for background removal, game UI section separator, generate at 1536x512 then crop to a thin divider
```

### Action Category Icons

**读书 (Study)**
```
Open book with candle flame above it, Chinese ink painting miniature style, simple iconic composition in circular frame, bold ink brush strokes with warm amber highlight on flame, clear silhouette readable at 64px display size, dark parchment background inside circle, game action icon, aspect ratio 1:1, 512px
```

**交游 (Socialize)**
```
Two wine cups touching in a toast, Chinese ink painting miniature style, simple iconic composition in circular frame, bold ink brush strokes with jade green highlight on cups, clear silhouette readable at 64px, dark parchment background inside circle, game action icon, aspect ratio 1:1, 512px
```

**营生 (Earn)**
```
Traditional Chinese abacus with coins, Chinese ink painting miniature style, simple iconic composition in circular frame, bold ink brush strokes with gold highlight on coins, clear silhouette readable at 64px, dark parchment background inside circle, game action icon, aspect ratio 1:1, 512px
```

**休养 (Rest)**
```
Steaming tea cup with rising steam wisps, Chinese ink painting miniature style, simple iconic composition in circular frame, bold ink brush strokes with soft warm highlight on steam, clear silhouette readable at 64px, dark parchment background inside circle, game action icon, aspect ratio 1:1, 512px
```

**钻营 (Scheme)**
```
A shadowed figure whispering behind a fan, Chinese ink painting miniature style, simple iconic composition in circular frame, bold ink brush strokes with deep purple-red highlight on fan, mysterious silhouette readable at 64px, dark parchment background inside circle, game action icon, aspect ratio 1:1, 512px
```

---

## 5. Key Moment Layer (Full 彩墨 Illustrations)

### P0 Moments

**中举 (Exam Pass — Celebration)**
```
A joyous celebration scene: a messenger on horseback arriving at a humble village home, waving a red banner announcing exam success, Chinese ink wash painting style (彩墨) with rich vermillion and gold accents, family members rushing out in disbelief and joy, firecrackers exploding in red and gold, neighbors gathering, dramatic diagonal composition with energy flowing from messenger to family, triumphant and emotional atmosphere, full rich color treatment, xuan paper texture, game event illustration, aspect ratio 16:9, 4K detail
```

**落第 (Exam Fail — Dejection)**
```
A solitary scholar walking away from the examination hall in rain, Chinese ink wash painting style (彩墨) with muted grey-blue palette, hunched shoulders, dropped umbrella, the grand hall fading into grey mist behind him, other successful candidates celebrating in distant background (blurred), heavy rain streaks as bold ink strokes, overwhelming loneliness and despair, desaturated with only the scholar's faded blue robe as color accent, xuan paper texture, game event illustration, aspect ratio 16:9, 4K detail
```

**传承 (Inheritance — Father to Son)**
```
An elderly scholar on his deathbed passing a worn book to his young son, Chinese ink wash painting style (彩墨) with warm amber candlelight against deep shadows, intimate close composition, the father's weathered hand reaching out with the book, the son's small hands receiving it with reverence, a single candle as the only light source creating dramatic chiaroscuro, bittersweet and solemn atmosphere, warm gold and deep ink tones, xuan paper texture, game event illustration, aspect ratio 16:9, 4K detail
```

### P1 Moments

**东窗事发 (Scheme Exposure)**
```
A dramatic confrontation: an official pointing accusingly at a scholar whose hidden cheat notes are scattered on the floor, Chinese ink wash painting style (彩墨) with harsh red and black contrast, other scholars recoiling in shock, the exposed scholar frozen in terror, bold aggressive brush strokes suggesting chaos, a large blank red seal-stamp shape overlaid semi-transparently with no readable Chinese text, dramatic and shameful atmosphere, xuan paper texture, game event illustration, aspect ratio 16:9, 4K detail
```

**殿试 (Palace Exam — Emperor's Court)**
```
Four scholars kneeling before the emperor's throne in the vast palace hall, Chinese ink wash painting style (彩墨) with gold and vermillion imperial palette, the emperor as a distant silhouette of power on an elevated throne, the four candidates small against the massive architecture, tension visible in their postures, golden morning light streaming through high windows, awe and pressure atmosphere, xuan paper texture, game event illustration, aspect ratio 16:9, 4K detail
```

---

## 6. Era Palette Modifiers

Copy-paste the appropriate block into any prompt's `[ERA PALETTE]` slot:

### 盛世 (Prosperity)
```
warm golden light, rich vermillion red accents, jade green foliage, confident flowing ink strokes with medium-wet density, abundant detail suggesting wealth and culture, elegant and prosperous atmosphere
```

### 衰世 (Decline)
```
muted ochre and faded sepia tones, sparse desaturated color, dry brush strokes with visible paper grain showing through, bare branches and withered elements, melancholic and austere atmosphere, restrained and fading
```

### 乱世 (Invasion)
```
charcoal black and smoke grey dominant, blood red as sole accent color, heavy aggressive splash ink strokes, broken or burning architectural elements, urgent and chaotic atmosphere, dramatic harsh contrast
```

### 中兴 (Restoration)
```
fresh blue-green (青绿) and dawn gold tones, clean precise ink lines with balanced wet-dry variation, new growth and rebuilding visible, hopeful morning light, determined and renewing atmosphere, clarity emerging from former chaos
```

---

## 7. Claude Design Prototype Prompts

### Claude Design Workflow

Use Claude Design after the core image assets exist. Treat uploaded images as a design-system asset library, not as something Claude Design should regenerate.

Recommended project order:
1. **Asset Showcase project** — review and present generated assets in one browsable page.
2. **Game Prototype project** — use selected assets as backgrounds, portraits, icons, frames, and stamps inside the playable UI flow.

Current status as of 2026-05-23:
- Asset Showcase is complete and exported locally under `local/claude-design-showcase/`.
- `local/` is intentionally ignored by git because Claude Design exports are local review artifacts, not production app source.
- Next Claude Design step: create the Game Prototype project, starting with the Daily Loop + Random Event + Exam core flow before expanding to all seven screens.

Asset handling rules:
- Upload final selected images, not rejected iterations.
- Use scene images as full-screen or dimmed backgrounds.
- Use character portraits inside fixed-size portrait panels.
- Use borders, blank seals, dividers, and icons as decoration only.
- Keep readable Chinese labels as real HTML text, not baked into images.
- If an uploaded asset is missing, create a CSS/SVG placeholder with the same layout box.

### Asset Showcase Prompt

```
Create a single-page asset showcase for the Chinese imperial-examination roguelike game "The Epochal Laurel" / "百世流芳".

Purpose:
This page is for reviewing and presenting generated art assets before implementation. It should feel like an internal art bible and asset gallery, not a marketing landing page.

Use the uploaded images as the actual content. Do not generate new art. Do not crop important visual details.

Visual style:
- Dark aged xuan paper / silk background
- Gold section headers
- Vermillion accent lines and seal-like markers
- Off-white body text
- Modern Chinese sans-serif for readable labels
- Generous spacing and calm gallery layout
- No large hero section
- No visible instructional text about how to use the page

Page structure:
1. Header
   - Title: "百世流芳 · Art Bible"
   - Subtitle: "The Epochal Laurel Asset Showcase"

2. Art Bible References
   - Display the uploaded style reference images in a responsive grid
   - Each card shows: asset name, layer type, notes

3. Scene Backgrounds
   - Large 16:9 thumbnails
   - Group by scene: Study Room, Examination Hall, Imperial Court, Village
   - Show era variant labels if available: Prosperity, Decline, Invasion, Restoration
   - Preserve full composition and negative-space areas

4. Character Portraits
   - Portrait grid with consistent 3:4 cards
   - Group by role: Scholar, Examiner, Mentor, Rival, Spouse
   - Show variant labels: young, middle, old, strict, corrupt, etc.

5. UI Decorations
   - Compact gallery for borders, blank seals, dividers, icons
   - Icons should be shown at both full size and 64px preview size
   - Stamps and dividers should be shown on dark parchment panels

6. Key Moment Illustrations
   - Large 16:9 cards
   - Group: Exam Pass, Exam Fail, Inheritance, Scheme Exposure, Palace Exam
   - Use dramatic spacing, but keep the gallery practical and scannable

7. Palette and Texture Strip
   - Show the recurring colors: ink black, parchment brown, muted gold, vermillion, jade green, smoke grey
   - Include short labels only

Interactions:
- Clicking an asset opens a modal preview
- Modal shows the full image, filename, category, intended usage, and notes
- Add simple category filters: All, Art Bible, Scenes, Characters, UI, Moments
- Keep all interactions local and mock-only

Export target:
Standalone HTML or saved folder for demo review.
```

### Core Game Prototype Prompt (Daily Loop + Random Event + Exam)

Use this as the first prompt after the completed Asset Showcase has been approved. Upload the showcase-approved assets first.

```
Create a code-powered interactive game UI prototype for the Chinese imperial-examination roguelike game "The Epochal Laurel" / "百世流芳".

Purpose:
This is the first playable UI-flow prototype after the completed art asset showcase. Focus on the core loop only: Daily Loop → Random Event → Exam → Exam Result → back to Daily Loop.

Use the uploaded images as actual assets. Do not generate new art. Do not crop important visual details. Do not bake readable Chinese text into images. All readable Chinese UI text must be real HTML text.

Target:
- Desktop-first at 1440x900 and 1920x1080.
- Keep the layout usable at 375px width, but do not design a mobile-native app.
- Export target: standalone HTML or saved folder for demo/developer review.

Uploaded assets to use:
- study-room.png as the Daily Loop background.
- examination-hall.png as the Exam background.
- scholar-young.png as the player portrait.
- examiner-strict.png or examiner-corrupt.png as exam/event NPC portraits when useful.
- scroll-frame.png for large dialogue, event, and exam panels.
- seal-blank-red.png for pass/fail/result stamps with HTML text overlaid.
- seal-blank-grey.png for inactive/locked/status stamps with HTML text overlaid.
- ink-divider-simple.png and ink-divider-plum.png as section dividers.
- action-study.png, action-socialize.png, action-earn.png, action-rest.png, action-scheme.png as action-card icons.
- exam-pass.png and exam-fail.png as result illustration options after exam submission.

Visual direction:
- Dark aged xuan paper / silk base background.
- Ink wash scene backgrounds, dimmed enough for UI readability.
- Gold section headers, vermillion interactive accents, off-white body text.
- Modern Chinese sans-serif for readable labels.
- Decorative calligraphy-style font only for major screen titles.
- Dense, usable game UI, not a landing page.
- Calm gallery-approved art direction from the Asset Showcase.
- No visible instructional text about how to use the page.

Mock state:
- Family name: 陈
- Character: 陈怀瑾, age 24, generation 1, title 秀才
- Season/year: 秋 · 景和十二年
- Stats: 才学 62, 运势 34, 心气 71, 家财 18
- Next exam: 乡试 · 2 季后
- Current era: 盛世
- Court hints: 文风偏正雅, 圣心未明

Screens and flow:

1. Daily Loop screen
- Top bar: season/year, character name, age, generation, current title.
- Left panel: character portrait and four stat bars:
  - 才学 62
  - 运势 34
  - 心气 71
  - 家财 18
- Center: five action cards:
  - 读书, using action-study.png
  - 交游, using action-socialize.png
  - 营生, using action-earn.png
  - 休养, using action-rest.png
  - 钻营, using action-scheme.png
- Each action card shows a short Chinese description and small stat-change preview.
- Right panel: current title, next exam countdown, current era, and a "参加乡试" button.
- Bottom: short narrative result strip.
- Clicking any action advances one mocked season and shows the Random Event modal.
- Clicking "参加乡试" opens the Exam screen.

2. Random Event modal
- Appears over a dimmed Daily Loop screen.
- Use scroll-frame.png or a matching CSS frame.
- Event title: "书斋失火"
- Event body: 2-3 sentences of vivid Simplified Chinese narrative.
- Use ink-divider-simple.png as divider.
- Show 3 choice cards with stat previews:
  - 抢救藏书
  - 先护家人
  - 借机求助乡绅
- Include a small optional free-text response area labeled "自由发挥".
- Selecting a choice closes the modal and updates the Daily Loop narrative strip.
- Do not implement real scoring; use mock visual feedback only.

3. Exam screen
- Use examination-hall.png as dimmed background.
- Main scroll-framed exam panel.
- Header: "乡试"
- Question text in Simplified Chinese, classical but readable:
  "民有饥色而仓廪未开，县令称待上谕。若为幕僚，当如何劝之？"
- Show three answer cards A/B/C:
  - A: 先陈民困，再引祖制，请其开仓赈济
  - B: 以灾异为名，上书弹劾县令
  - C: 暂缓赈济，以免扰乱粮价
- Include an expandable "自由作答" text area with character count.
- Selecting an answer highlights it.
- Clicking "提交答案" opens an Exam Result overlay.

4. Exam Result overlay
- Use seal-blank-red.png as a result stamp with HTML text overlaid.
- Show either pass or fail state; default to pass for the first prototype:
  - Result title: "中举"
  - Short result narration.
  - Use exam-pass.png as the illustration.
- Include a "返回日常" button that returns to the Daily Loop screen.

Interactions:
- All navigation must work locally in the prototype.
- Action cards, event choices, exam choices, and buttons need hover/selected/disabled states.
- Modal open/close states should feel polished.
- Use mock state only; no API calls, no persistence, no authentication, no real random generation.

Quality bar:
- Keep text legible over all image backgrounds.
- Preserve the full composition of uploaded scene and moment images.
- Do not stretch character portraits.
- Do not use placeholder UI for assets that were uploaded.
- Avoid marketing hero composition; this should feel like the actual game interface.
```

### Global Project Brief (start every Claude Design session with this)

```
Project: 百世流芳 (The Epochal Laurel), a Chinese imperial examination generational roguelike.

Build code-powered interactive prototypes, not production game logic.
Target viewport: desktop first at 1440x900 and 1920x1080. Keep the layout usable at 375px width, but do not design a mobile-native app.

Uploaded assets to use when available:
- /assets/scenes/study-room.png for Daily Loop and Character Creation
- /assets/scenes/examination-hall.png for Exam
- /assets/scenes/imperial-court.png for Palace Exam
- /assets/scenes/village.png for Inheritance
- /assets/characters/scholar-young.png and scholar-old.png for character panels
- /assets/ui/borders/scroll-frame.png for framed panels
- /assets/ui/stamps/seal-blank-red.png and seal-blank-grey.png for result stamps
- /assets/ui/icons/action-study.png, action-socialize.png, action-earn.png, action-rest.png, action-scheme.png for action cards
If an uploaded asset is missing, create a tasteful CSS/SVG placeholder that preserves the same layout box and label it only in layer names, not visible UI text.

Mock state for all screens:
- Family name: 陈
- Character: 陈怀瑾, age 24, generation 1, title 秀才
- Season/year: 秋 · 景和十二年
- Stats: 才学 62, 运势 34, 心气 71, 家财 18
- Next exam: 乡试 · 2 季后
- Current era: 盛世
- Court hints: 文风偏正雅, 圣心未明

Interaction expectations:
- Use clickable navigation between screens with mock state only.
- Do not implement real scoring, persistence, authentication, API calls, or random generation.
- Show hover/selected/disabled states for cards and buttons.
- Export target: standalone HTML plus any available handoff bundle or saved folder.
```

### Global Style Instruction (prepend to all screens)

```
Visual direction for all screens:
- Dark parchment/silk base background (color: #2a1f1a to #3d2e1f)
- Gold text for headers and important labels (#c9a96e)
- Off-white/cream text for body content (#e8dcc8)
- Vermillion red for highlights, alerts, and interactive elements (#c23b22)
- Subtle paper grain texture overlay on backgrounds
- Traditional Chinese decorative borders (thin gold lines with cloud motifs at corners)
- Modern Chinese sans-serif font for readability (Noto Sans SC or similar)
- Decorative calligraphy-style font for screen titles only
- Generous spacing and padding (留白 philosophy)
- Cards and panels use slightly lighter dark backgrounds with gold border
- Stat bars use horizontal ink-brush-stroke style fills
- All game text in Simplified Chinese
- Do not explain features or shortcuts in visible UI text; let the interface speak through labels, states, and layout
- Use the uploaded raster assets as atmosphere and decoration, but keep readable labels as real HTML text
```

### Screen: Landing / New Game

```
Create an interactive game landing page for 百世流芳 (The Epochal Laurel).

[Start with the global project brief above]
[Prepend global style instruction above]

Layout:
- Full-screen dark parchment background with subtle ink wash mountain silhouette at bottom
- Game title "百世流芳" in large decorative calligraphy at top center, with subtitle "The Epochal Laurel" smaller below
- Tagline: "你的家族能否在科举中出人头地？" in gold
- Center: "开始新游戏" button (vermillion with gold text, scroll-shaped)
- Below: "继续游戏" button (gold outline, only shown if save exists)
- Bottom: "排行榜" link in subtle gold

Interactions:
- "开始新游戏" → navigates to character creation screen
- "继续游戏" → navigates to daily loop screen
- "排行榜" → navigates to leaderboard screen
```

### Screen: Character Creation (sub-screen of New Game)

```
Create a character creation screen for a Chinese imperial examination roguelike.

[Start with the global project brief above]
[Prepend global style instruction above]

Layout:
- Header: "开创家业" in decorative calligraphy
- Input field: "家族姓氏" (family name input, gold-bordered text field on dark background)
- Origin selection: 4 cards in a 2x2 grid, each showing:
  - Origin name in gold (寒门孤儿 / 耕读之家 / 盐商庶子 / 没落官宦)
  - Brief description in cream text (2 lines)
  - Stat modifiers shown as +/- indicators
  - Selected card has vermillion border glow
- Bottom: "开始" button (vermillion, large)
- Subtle ink wash background with study room scene

Interactions:
- Clicking an origin card selects it (vermillion border)
- "开始" button → navigates to daily loop screen
- Each card shows a tooltip on hover with full stat details
```

### Screen: Daily Loop (Season Actions)

```
Create the main gameplay screen for a seasonal action-selection game.

[Start with the global project brief above]
[Prepend global style instruction above]

Layout:
- Top bar: Season indicator (春/夏/秋/冬 with year), character name and age
- Left panel (30% width): Character stats as horizontal ink-brush bars
  - 才学 (Erudition): blue-green fill
  - 运势 (Fortune): gold fill
  - 心气 (Drive): vermillion fill
  - 家财 (Wealth): amber fill
  - Each bar shows numeric value
- Center (50% width): Action cards (3-5 visible), each card shows:
  - Action name in gold (读书/交游/营生/休养/钻营)
  - Icon (circular, ink-brush style)
  - Brief description
  - Expected stat changes as +/- indicators
  - Some cards greyed out with lock icon (requirements not met)
- Right panel (20% width): 
  - Current title (秀才/举人/etc) with seal stamp decoration
  - Next exam countdown
  - "参加科举" button (if eligible, vermillion pulse)
  - "改命道具" section (3 tool slots)
- Bottom: Narrative text area (last event result, 2-3 lines in cream text)

Interactions:
- Clicking an action card triggers the season advance
- Hovering a card shows detailed stat change preview
- "参加科举" → navigates to exam screen
- Greyed cards show requirement tooltip on hover
```

### Screen: Random Event

```
Create a random event popup/modal for a Chinese historical simulation game.

[Start with the global project brief above]
[Prepend global style instruction above]

Layout:
- Modal overlay (80% width, centered) with scroll-border frame
- Event title in gold calligraphy at top (e.g., "书斋失火")
- Event description in cream text (2-3 sentences, vivid narrative)
- Divider: ink brush stroke
- Choice buttons (2-3 options), each as a horizontal card:
  - Choice text on left
  - Stat change preview on right (small +/- indicators)
  - Hover highlights with gold border
- Below choices: "自由发挥" text input area (optional creative solution)
  - Placeholder text: "写下你的应对之策..."
  - Submit button next to input
- Background: slightly dimmed daily loop screen visible behind modal

Interactions:
- Clicking a choice selects it and closes modal (shows result)
- Typing in free input and submitting sends creative solution
- Cannot close modal without making a choice
```

### Screen: Exam

```
Create an imperial examination screen for a Chinese historical game.

[Start with the global project brief above]
[Prepend global style instruction above]

Layout:
- Full screen with examination hall background (ink wash, dimmed)
- Top: Exam level badge (童试/乡试/会试/殿试) as seal stamp
- Center panel (scroll-framed):
  - Exam question in elegant cream text (2-3 sentences, classical Chinese style)
  - Topic category tag (governance/ethics/military/economics/philosophy)
- Below question: 3 answer choice cards (A/B/C):
  - Each shows choice text
  - Risk indicator (if present): small warning icon + text in amber
  - Base score hint shown as subtle dots (more dots = higher base)
- Below choices: "自由作答" expandable text area
  - Hint text in subtle gold italic
  - Character count indicator
  - Submit button
- Bottom bar: Character erudition stat, court whims info (if revealed), timer feeling

Interactions:
- Selecting A/B/C highlights the choice
- "提交答案" button submits selected choice or free text
- After submission → shows result narration with pass/fail stamp
```

### Screen: Palace Exam (殿试)

```
Create a palace examination competitive ranking screen.

[Start with the global project brief above]
[Prepend global style instruction above]

Layout:
- Imperial court background (gold and vermillion tones, dimmed)
- Top: "殿试" in large gold calligraphy with dragon motifs
- After player submits answer, show ranking reveal:
  - A vertical scroll unrolling animation (static mockup: scroll partially unrolled)
  - 4 names listed top to bottom:
    - Rank 1 (状元): largest text, gold with glow
    - Rank 2 (榜眼): medium text, silver
    - Rank 3 (探花): medium text, bronze
    - Rank 4 (进士): smaller text, cream
  - Player's name highlighted with vermillion underline wherever they rank
  - Each rival shows: name + one-line answer summary + score
- Below scroll: Emperor's comment (御评) in special gold italic frame
- Bottom: "继续" button

Interactions:
- Scroll reveals names one by one (top to bottom) with dramatic pause
- Player's entry has special highlight treatment
- "继续" → returns to daily loop or triggers inheritance if generation ends
```

### Screen: Inheritance

```
Create an inheritance/heir selection screen for a generational roguelike.

[Start with the global project brief above]
[Prepend global style instruction above]

Layout:
- Background: slow fade from previous scene to dark
- Top: "传承" in solemn gold calligraphy
- Departed ancestor summary panel:
  - Name, years lived, highest title (as seal stamp)
  - Notable achievement (1 line)
  - Legacy tokens earned (books/land/reputation as icons with numbers)
- Divider: ink brush stroke
- Heir selection: 1-3 candidate cards side by side:
  - Each shows: name, traits (as ink-brush tags), personality hint (1 sentence)
  - Starting bonus indicator (which stat gets +N)
  - Selected heir has gold border
- Below heirs: "祖宗保佑" (Ancestral Blessings) panel:
  - Available blessings as purchasable cards
  - Each shows: name, cost (blessing points), effect
  - Purchased blessings glow gold
- Bottom: "开启新篇" button (vermillion)

Interactions:
- Click heir card to select
- Click blessing cards to purchase (if enough points)
- "开启新篇" → starts next generation (navigates to daily loop)
```

### Screen: Leaderboard

```
Create a leaderboard/high scores screen for a Chinese historical roguelike.

[Start with the global project brief above]
[Prepend global style instruction above]

Layout:
- Background: dark parchment with faint ink wash mountains
- Top: "百世流芳榜" in gold calligraphy (Hall of Fame)
- Victory tier legend: S/A/B/C/D/F tiers with color coding
  - S: gold glow, A: gold, B: silver, C: cream, D: grey, F: faded
- Leaderboard table (scroll-framed):
  - Columns: Rank | Family Name | Tier | Score | Generations | Date
  - Top 3 entries have special decoration (gold/silver/bronze seal stamps)
  - Player's own entries highlighted with vermillion
- Bottom: "返回" button (gold outline)

Interactions:
- Scrollable table if many entries
- Hover on entry shows dynasty summary tooltip
- "返回" → navigates to landing screen
```

---

## 8. Anti-Patterns (What NOT to Do)

### GPT Image 2 — Avoid These

| Don't | Why | Do Instead |
|-------|-----|-----------|
| "Chinese painting" alone | Too vague, produces random styles | "Chinese ink wash painting (水墨画) on xuan paper with visible brush strokes" |
| Too many elements in one scene | Breaks ink painting aesthetic | Embrace 留白; fewer elements, more atmosphere |
| "Realistic" + "ink painting" | Contradictory, produces uncanny results | Choose one: stylized ink OR realistic |
| Mix dynasty costumes | Anachronistic, breaks immersion | Lock to Song/Ming blend for all prompts |
| "Perfect" or "symmetrical" | Ink painting is inherently asymmetric | "Natural asymmetry, organic brush energy" |
| Request specific readable Chinese text | May produce incorrect characters | Leave blank space; add text later with frontend/SVG/manual compositing |
| Over-specify colors (5+ colors) | Ink painting is primarily monochrome + accents | Limit to 1-2 accent colors per prompt |
| "Digital art" or "3D render" | Pulls away from traditional medium | Always anchor with "traditional brush strokes, xuan paper texture" |
| "Anime" or "manga" style | Wrong aesthetic entirely | "Woodblock print (绣像)" for characters |
| Forget aspect ratio | Gets random crops | Always specify: 16:9 for scenes, 3:4 for portraits, 1:1 for icons |

### Claude Design — Avoid These

| Don't | Why | Do Instead |
|-------|-----|-----------|
| Request all 7 screens in one prompt | Token overload, quality drops | One screen per prompt, iterate |
| Skip the global style instruction | Each screen looks different | Always prepend the style block |
| Ask for complex game logic | Claude Design is front-end only | Mock the data, focus on visual flow |
| Use English placeholder text | Breaks immersion in prototype | All visible text in Simplified Chinese |
| Request mobile layout | Desktop-first per spec | Design for 1920x1080 viewport |
| Forget to specify interactions | Gets static mockup | Always list clickable elements and navigation targets |

---

## Quick Reference: Resolution Cheat Sheet

| Asset Type | Aspect Ratio | Size | Format |
|-----------|-------------|------|--------|
| Scene background | 16:9 | 2048x1152 draft, 3840x2160 final if budget allows | PNG |
| Character portrait | 2:3 | 1024x1536 draft, 2160x3840 final if needed | PNG |
| Key moment illustration | 16:9 | 2048x1152 draft, 3840x2160 final if budget allows | PNG |
| Seal/stamp | 1:1 | 1024x1024 | PNG source; alpha via post-processing if needed |
| Action icon | 1:1 | 1024x1024 | PNG source; alpha via post-processing if needed |
| Border frame | 16:9 or 3:2 | 1536x1024 or 2048x1152 | PNG source |
| Divider | generate within 3:1, crop after | 1536x512 source, crop to final strip | PNG source; alpha via post-processing if needed |
| Art bible reference | varies | highest available | PNG |
