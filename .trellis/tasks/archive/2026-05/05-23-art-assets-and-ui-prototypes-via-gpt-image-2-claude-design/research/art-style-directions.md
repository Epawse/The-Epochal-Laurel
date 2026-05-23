# Research: Art Style Directions for 百世流芳 (The Epochal Laurel)

- **Query**: Comprehensive exploration of viable art styles for a text-heavy Chinese historical roguelike
- **Scope**: external (game industry references, AI generation capabilities, cultural aesthetics)
- **Date**: 2026-05-23
- **Method**: 10 rounds of Grok Search covering Chinese game art, AI generation consistency, reference games, hybrid approaches

---

## 1. Reference Game Analysis

### Direct Competitors / Thematic Matches

| Game | Style | Relevance |
|------|-------|-----------|
| 儒林外史·范进 (2024) | Hand-drawn 国风, Ming dynasty detail, narrative realism | Most direct match — same theme (科举), indie scale |
| 青椒模拟器 (2025) | Extreme minimalism, "office system" UI, text-dominant | Closest gameplay parallel (AI-driven text sim), proves minimal art works |
| 中国式家长 (2018) | Q版卡通 + 表情包 meme style, warm tones | Proves humor + simple art = emotional resonance |
| 满庭芳：宋上繁华 | Hand-drawn 国风, warm palette, detailed architecture | City-builder but strong Song dynasty visual reference |
| The Rewinder | Pixel art mimicking ink-wash handscrolls | Proves ink aesthetic works in pixel/low-fi |
| Nine Sols (2024) | "Taopunk" — Taoism + cyberpunk, hand-drawn 2D | Shows cultural fusion can be fresh |

### Roguelike Card Game References (Tone Match)

| Game | Style | Lesson |
|------|-------|--------|
| Slay the Spire | Hand-drawn cartoon, clean card frames, limited palette | Clarity > beauty for card/choice UI |
| Inscryption | "Haunted artifact" — dark table, tactile objects, meta-horror | Dark parchment + physical objects = immersion |
| Sultan's Game (2025) | Narrative card game, moral dilemmas | Text-heavy + card = viable |

### Key Insight from References

**青椒模拟器 proves the floor**: a text-dominant AI sim can succeed with near-zero art investment. Our game can afford to be more ambitious, but the core experience is text + choices, not visual spectacle. Art should enhance atmosphere and emotional moments, not carry the gameplay.

---

## 2. AI Generation Consistency Analysis

### GPT Image 2 Style Consistency Ranking (from research)

| Style | Consistency | Reason |
|-------|-------------|--------|
| Flat illustration / vector | ★★★★★ | Geometric, rule-based, low complexity — AI excels |
| Line art / baimiao (白描) | ★★★★☆ | Clean lines, minimal variables, predictable |
| Woodblock print / 版画 | ★★★★☆ | High contrast, limited tones, structured |
| Dark parchment + textures | ★★★★☆ | Texture generation is stable, limited color palette |
| Guochao flat + traditional motifs | ★★★★☆ | Flat base + decorative elements = manageable |
| Ink wash painting (水墨) | ★★☆☆☆ | Organic brushstrokes, tonal variation, water bleeding — highly variable |

### Critical Finding

> "Flat illustration is the most consistent style... AI models handle structured, low-complexity rules reliably across prompts, sessions, and variations."

> "Ink painting involves organic brushstrokes, tonal variations, water/ink bleeding effects... AI varies significantly in stroke weight, density, and flow between generations."

**Implication**: Pure ink wash is the hardest style to keep consistent with AI. But it's also the most culturally evocative. The solution is a **hybrid approach** — use ink wash where consistency doesn't matter (unique backgrounds, one-off moments) and structured styles where it does (characters, UI, icons).

---

## 3. Six Viable Art Directions

### Direction 1: 国潮扁平 (Guochao Flat)

**Description**: Modern flat design + traditional Chinese motifs (祥云, 飞檐, 印章). Bold color blocks, geometric shapes, high saturation, vector-friendly.

**Visual Reference**: Arknights UI, modern Chinese brand design, 国潮 illustration trend

**Characteristics**:
- Clean lines, solid colors, minimal shadows
- Traditional symbols reinterpreted in bold/youthful ways
- Vibrant reds/golds, deep teals, high contrast
- Dense but balanced patterns

**Pros**:
- AI consistency: ★★★★★ (highest)
- UI readability: excellent
- Production speed: fastest
- Scalable (vector-like outputs)

**Cons**:
- Feels "too modern" — lacks 文人 (literati) atmosphere
- Doesn't match game's "black humor + philosophical" tone
- May feel generic (many games use this now)
- Low emotional depth for dramatic moments

**Best for**: Games targeting young audience with cultural pride theme. Not ideal for our contemplative/ironic tone.

---

### Direction 2: 彩墨意境 (Ink Wash + Selective Color)

**Description**: Traditional ink wash (水墨) as base, with mineral color accents (朱红 vermillion, 石青 azurite, 赭石 ochre). Heavy use of 留白 (negative space). Visible brush energy.

**Visual Reference**: The Rewinder, Okami, Song/Yuan dynasty landscape painting

**Characteristics**:
- Monochrome ink gradients with 1-2 accent colors
- Organic brushstrokes, ink bleeding, paper texture
- Asymmetric composition, atmospheric perspective
- Era-specific palettes:
  - 盛世: warm gold + vermillion
  - 衰世: muted ochre + faded ink
  - 乱世: charcoal + blood red
  - 中兴: fresh blue-green + dawn gold

**Pros**:
- Cultural recognition: highest (instantly "Chinese")
- Atmospheric immersion: strongest
- Era differentiation via palette: natural
- Emotional range: excellent (from serene to dramatic)

**Cons**:
- AI consistency: ★★☆☆☆ (lowest — organic strokes vary wildly)
- UI readability: challenging (low contrast, soft edges)
- Batch production: difficult (each image unique)
- Text overlay: needs careful contrast management

**Best for**: Key art, backgrounds, one-off moment illustrations. NOT for repeatable elements (characters, icons, UI).

---

### Direction 3: 古籍绣像 / 连环画 (Woodblock Print / Lianhuanhua)

**Description**: Black-and-white line drawing style inspired by Ming/Qing novel illustrations (绣像本). Bold outlines, high contrast, limited color (black + vermillion + parchment). Similar to traditional Chinese woodblock prints or 连环画 (sequential picture books).

**Visual Reference**: Ming dynasty novel illustrations, Lu Xun woodcut movement, traditional 年画

**Characteristics**:
- Strong black outlines, clear silhouettes
- Flat or minimal shading (hatching, not gradients)
- Limited palette: black ink + red accents + aged paper
- Narrative composition (tells a story in each frame)
- Slightly exaggerated proportions for expressiveness

**Pros**:
- AI consistency: ★★★★☆ (structured lines, limited variables)
- Thematic fit: ★★★★★ (literally the art style of the books characters study)
- Black humor tone: natural match (satirical illustration tradition)
- Production cost: low (fewer colors = faster iteration)
- Historical authenticity: high (this IS how these stories were illustrated)

**Cons**:
- Visual richness: limited (may feel "sparse" in demo)
- Color differentiation between eras: harder with limited palette
- Modern audience appeal: may feel "old-fashioned" to some
- Backgrounds: need additional treatment to avoid emptiness

**Best for**: Character portraits, event illustrations, card-style UI elements. The most thematically authentic choice.

---

### Direction 4: 宣纸暗调 (Dark Parchment + Ink Accents)

**Description**: Deep-toned aged paper/silk as base, with gold/vermillion text and decorative elements. Evokes the feeling of reading ancient manuscripts by candlelight. Similar to Inscryption's "tactile object" aesthetic but with Chinese antiquarian flavor.

**Visual Reference**: Inscryption's cabin/table aesthetic, ancient Chinese manuscript collections, 善本 (rare book) aesthetics

**Characteristics**:
- Dark warm base (aged 宣纸, 绢帛 silk, or lacquered wood)
- Gold/vermillion for text and key UI elements
- Subtle texture (paper grain, silk weave, ink stains)
- Seal stamps as decorative punctuation
- Candlelight warmth in color temperature
- Physical object metaphors (scrolls, books, ink stones)

**Pros**:
- Text readability: ★★★★★ (light text on dark = optimal for text-heavy game)
- Roguelike tone: excellent (dark, contemplative, slightly ominous)
- AI consistency: ★★★★☆ (textures are stable, limited palette)
- Immersion: strong "tactile" feeling (you're handling ancient documents)
- UI integration: natural (UI IS the aesthetic, not overlaid on it)

**Cons**:
- Overall dark: needs bright moments to break monotony
- Character art: needs separate style definition (dark bg doesn't define character style)
- May feel "heavy" for the game's lighter humor moments
- Less visually distinctive at first glance (dark UIs are common)

**Best for**: UI framework, card backgrounds, text presentation, overall game "shell." Pairs well with another style for characters/illustrations.

---

### Direction 5: 白描极简 (Baimiao Minimalist Line Art)

**Description**: Pure line drawing (白描) with no or minimal fill. Elegant, sparse, maximum negative space. Like an unfinished 工笔 painting — only the essential lines remain.

**Visual Reference**: Traditional 白描 technique, modern minimalist Chinese illustration, architectural line drawings

**Characteristics**:
- Single-weight or calligraphic-weight black lines
- No fill color (or very sparse wash accents)
- Maximum 留白 (white/empty space)
- Elegant, restrained, "less is more"
- Focus on gesture and expression over detail

**Pros**:
- AI consistency: ★★★★☆ (simple = predictable)
- Elegance: highest (refined 文人 aesthetic)
- Production speed: fastest (least complex)
- Pairs well with any background treatment
- "Unfinished" quality matches roguelike impermanence theme

**Cons**:
- Demo impact: ★★☆☆☆ (may look "unfinished" to non-art audience)
- Era differentiation: very difficult with no color
- Emotional range: limited (hard to convey drama without tone/color)
- Backgrounds: essentially empty — needs something else to fill space
- May read as "placeholder art" rather than intentional choice

**Best for**: A deliberate artistic statement, but risky for a hackathon demo where visual impact matters.

---

### Direction 6: 混合分层 (Hybrid Layered) ⭐ RECOMMENDED

**Description**: Different art styles for different visual layers, each chosen for optimal AI consistency and functional purpose. The layers blend into a cohesive whole through shared color temperature and texture language.

**Layer Breakdown**:

| Layer | Style | Why This Style |
|-------|-------|---------------|
| Backgrounds | 彩墨 ink wash (Direction 2) | Each is unique — no consistency needed across images. Maximum atmosphere. |
| UI framework | 宣纸暗调 dark parchment (Direction 4) | Text readability, stable AI generation, immersive "document" feel |
| Characters | 古籍绣像 line art + light color (Direction 3) | Consistency across portraits, thematic authenticity |
| Decorations | Seals, borders, dividers | GPT Image 2 handles these reliably |
| Key moments | Full 彩墨 illustrations (Direction 2) | One-off pieces, maximum emotional impact |
| Icons/buttons | Flat with ink texture (Direction 1 lite) | Readability at small size, batch-producible |

**Unifying Elements** (what makes it feel cohesive, not random):
- Shared color temperature: warm (盛世/中兴) or cool (衰世/乱世)
- Consistent paper/silk texture underlying everything
- Vermillion red as universal accent color (seals, highlights, alerts)
- Ink black as primary text/line color across all layers
- 留白 philosophy applied to layout (generous spacing, breathing room)

**Pros**:
- Each layer uses the style AI handles best for that purpose
- Backgrounds don't need cross-image consistency (each scene is unique)
- Characters maintain consistency via structured line-art approach
- UI is optimized for readability (the #1 priority for text-heavy game)
- Key moments get full artistic treatment without consistency burden
- Era shifts can be expressed through background palette + UI color accents

**Cons**:
- Requires clear art bible defining how layers interact
- Risk of feeling "inconsistent" if not carefully unified
- More complex prompt engineering (different templates per layer)
- Needs explicit rules for what goes in which layer

**Mitigation**: The art bible (Phase 1) explicitly defines the unifying elements. As long as color temperature, texture, and accent colors are consistent, the eye accepts different rendering styles across layers (this is how most professional games work — UI style ≠ character style ≠ environment style).

---

## 4. Comparison Matrix

| Criterion | 国潮扁平 | 彩墨意境 | 古籍绣像 | 宣纸暗调 | 白描极简 | 混合分层 |
|-----------|---------|---------|---------|---------|---------|---------|
| AI consistency | ★★★★★ | ★★☆☆☆ | ★★★★☆ | ★★★★☆ | ★★★★☆ | ★★★★☆ |
| Cultural identity | ★★★☆☆ | ★★★★★ | ★★★★★ | ★★★★☆ | ★★★★☆ | ★★★★★ |
| UI readability | ★★★★★ | ★★☆☆☆ | ★★★☆☆ | ★★★★★ | ★★★★☆ | ★★★★★ |
| Tone match (黑色幽默+哲学) | ★★☆☆☆ | ★★★☆☆ | ★★★★★ | ★★★★☆ | ★★★☆☆ | ★★★★★ |
| Demo visual impact | ★★★☆☆ | ★★★★★ | ★★★☆☆ | ★★★★☆ | ★★☆☆☆ | ★★★★★ |
| Production efficiency | ★★★★★ | ★★☆☆☆ | ★★★★☆ | ★★★★☆ | ★★★★★ | ★★★★☆ |
| Text-heavy game fit | ★★★★☆ | ★★☆☆☆ | ★★★☆☆ | ★★★★★ | ★★★★☆ | ★★★★★ |
| Hackathon feasibility | ★★★★★ | ★★☆☆☆ | ★★★★☆ | ★★★★☆ | ★★★★★ | ★★★★☆ |

---

## 5. Recommendation

### Primary: Direction 6 (混合分层 Hybrid Layered)

**Rationale**:
1. **Text-heavy game demands readable UI** → dark parchment layer solves this
2. **Cultural identity is core to the fantasy** → ink wash backgrounds + woodblock characters deliver it
3. **AI consistency varies by style** → use each style where it's strongest
4. **Hackathon demo needs visual impact** → full ink wash backgrounds + dramatic moment illustrations provide it
5. **Game tone is ironic/philosophical** → woodblock print character style has a natural satirical quality (连环画 tradition)

### Fallback: Direction 4 (宣纸暗调) if time-constrained

If the hybrid approach proves too complex to coordinate in hackathon time, fall back to pure dark parchment with minimal ink accents. This gives:
- Excellent text readability
- Consistent AI generation
- Atmospheric immersion
- Can be enhanced later with richer character/background art

### What NOT to choose

- **Pure ink wash (Direction 2)**: Too inconsistent for AI batch generation, too hard to read text over
- **Pure flat/Guochao (Direction 1)**: Wrong tone — feels like a mobile gacha game, not a contemplative roguelike
- **Pure baimiao (Direction 5)**: Too sparse for demo impact, risks looking like placeholder art

---

## 6. Era-Specific Visual Treatment (for Hybrid Approach)

| Era | Background Palette | UI Accent Color | Ink Density | Mood Keywords |
|-----|-------------------|-----------------|-------------|---------------|
| 盛世 (Prosperity) | Warm gold, rich vermillion, jade green | Gold | Medium-wet, flowing | Elegant, abundant, confident |
| 衰世 (Decline) | Muted ochre, faded ink, sparse color | Faded copper | Dry brush, sparse | Melancholic, restrained, austere |
| 乱世 (Invasion) | Charcoal black, blood red, smoke grey | Crimson red | Heavy splash ink, aggressive | Urgent, chaotic, dramatic |
| 中兴 (Restoration) | Fresh blue-green (青绿), dawn gold | Jade green | Clean lines, balanced | Hopeful, determined, renewing |

---

## 7. Production Implications

### Time Estimate (Hybrid Approach, Hackathon)

| Phase | Time | Output |
|-------|------|--------|
| Art Bible (style lock) | 30-45 min | 5-10 reference images + style-guide.md |
| Backgrounds (ink wash) | 30-45 min | 4-6 scene backgrounds |
| Characters (line art) | 60-90 min | 8-12 portraits |
| UI elements (parchment + decorations) | 20-30 min | Borders, seals, icons, dividers |
| Key moment illustrations | 30-45 min | 3-5 dramatic scenes |
| **Total** | **3-4 hours** | **Full asset set** |

### Minimum Viable Set (2-hour budget)

- 3 art bible references (1 character, 1 scene, 1 UI)
- 2 scene backgrounds (书斋 + 考场)
- 4 character portraits (scholar young/old, examiner, mentor)
- 1 scroll border + 1 seal stamp
- 1 key moment illustration (中举)

---

## 8. Sources and Search Coverage

Research conducted via 10 rounds of Grok Search:
1. 中国风游戏美术风格 独立游戏 科举 古风 视觉设计 成功案例
2. Chinese historical game art styles 2024-2026 successful indie games
3. GPT Image 2 best art styles consistency comparison
4. Text-heavy card game visual novel UI art style Chinese aesthetic
5. 青椒模拟器 中国式家长 游戏美术风格 UI设计 视觉分析
6. Chinese woodblock print / paper cut / silhouette aesthetic
7. Flat vector illustration Chinese traditional motif modern game UI
8. Paper texture parchment aesthetic game UI ancient scroll
9. GPT Image 2 Chinese ink wash vs flat vector comparison
10. 国潮 guochao illustration style game design modern Chinese fusion
11. 敦煌壁画风格 游戏美术 Dunhuang mural style
12. Roguelike card game art style minimalist dark humor (Slay the Spire / Inscryption)
13. Okami art style sumi-e cel shading consistency
14. Ink wash + flat design hybrid style illustration
15. GPT image dark parchment aged paper texture game card UI
16. 极简线描 白描 baimiao line drawing style game art

Additional sub-agent research (persisted separately):
- `gpt-image-2-ink-painting.md` — prompt engineering, resolution, batch workflow
- `asset-pipeline-organization.md` — directory structure, naming, formats, storage
- `claude-design-prototyping.md` — prototype capabilities, export, limitations
