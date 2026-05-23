# Research: GPT Image 2 for Chinese Ink Painting Style Game Assets

- **Query**: Best practices for generating consistent Chinese historical ink painting (水墨画/彩墨) style game assets using GPT Image 2
- **Scope**: external (API capabilities, prompt engineering techniques)
- **Date**: 2026-05-23

## 1. Prompt Engineering for Consistent Chinese Ink Painting Style

### Style Lock Strategy

The PRD states GPT Image 2 has "strong style consistency via image references" and supports "agentic reasoning" and "multi-turn iterative editing." The recommended approach for style consistency:

**Art Bible Reference Method:**
- Generate 5-10 "anchor" images that define the visual language
- Always include 2-3 of these reference images in every subsequent generation prompt
- The model uses reference images as style constraints, not just inspiration

**Core Style Keywords (Style Lock Vocabulary):**

| Category | Keywords (English) | Keywords (Chinese context) |
|----------|-------------------|---------------------------|
| Medium | Chinese ink painting, ink wash, brush strokes, rice paper texture | 水墨画, 宣纸质感, 毛笔笔触 |
| Technique | wet-dry ink variation, liubai (留白/negative space), splash ink (泼墨), fine line drawing (白描) | 干湿浓淡, 留白, 泼墨, 白描, 工笔 |
| Color mode | Monochrome ink wash (水墨) OR selective color accents (彩墨) | 纯水墨 vs 彩墨 |
| Texture | xuan paper grain, ink bleeding edges, seal red accent | 宣纸纹理, 墨迹晕染, 印章朱红 |
| Composition | asymmetric balance, vertical scroll format, mountain-water perspective | 散点透视, 立轴构图, 计白当黑 |

**Prompt Structure for Consistency:**
```
[Subject description], Chinese historical ink painting style (彩墨/水墨画),
traditional brush strokes with wet-dry ink variation on xuan paper,
[era]-dynasty atmosphere, [mood] tone,
留白 (negative space) composition, ink bleeding edges,
game asset concept art, clean composition,
[aspect ratio specification], high detail on focal subject,
--style reference: [art bible image IDs]
```

**Character Consistency Techniques:**
- Define character "identity anchors": specific costume elements, facial features, accessories
- Use consistent descriptor blocks per character across all prompts
- For age variants: keep costume silhouette + accessories constant, vary face/posture/hair
- Example: Scholar always has "indigo scholar's robe (青衫), folding fan, ink-stained fingers" regardless of age

### Era-Specific Palette Modifiers

| Era | Palette | Mood Keywords | Ink Density |
|-----|---------|---------------|-------------|
| Prosperity (盛世) | Warm gold accents, rich vermillion seals, jade green | Elegant, abundant, confident | Medium-wet, flowing |
| Decline (衰世) | Muted ochre, faded ink, sparse color | Melancholic, restrained, austere | Dry brush, sparse |
| Invasion (乱世) | Charcoal black, blood red accents, smoke grey | Urgent, chaotic, dramatic | Heavy splash ink, aggressive |
| Restoration (中兴) | Fresh blue-green (青绿), new vermillion, dawn gold | Hopeful, determined, renewing | Clean lines, balanced wet-dry |

---

## 2. Resolution and Aspect Ratio Recommendations

### GPT Image 2 Capabilities (verified against current OpenAI docs)

- Custom image sizes are supported up to 4K-class outputs
- Both width and height must be multiples of 16px
- Maximum width or height: 3840px
- Long:short aspect ratio must be <= 3:1
- Total pixels must be between 655,360 and 8,294,400
- `quality` values are `low`, `medium`, `high`, or `auto`
- Transparent background is not currently supported for `gpt-image-2`

### Recommended Settings by Asset Type

| Asset Type | Aspect Ratio | Resolution | Rationale |
|------------|-------------|------------|-----------|
| Character portraits (bust/half-body) | 2:3 or 3:4 | 1024x1536 draft, up to 2160x3840 final | Vertical emphasis for scroll-like framing; high detail for faces |
| Scene backgrounds | 16:9 | 2048x1152 draft, 3840x2160 final | Matches desktop-first game viewport |
| UI borders/frames (horizontal) | 16:9 or 3:2 | 1536x1024 or 2048x1152 | Generate within API ratio limits, then slice/crop if needed |
| UI borders/frames (vertical) | 2:3 or 9:16 | 1024x1536 or 2160x3840 | Side panel decorations |
| Seal/stamp decorations | 1:1 | 1024x1024 | Small elements, square format natural for seals |
| Action icons | 1:1 | 1024x1024 | Small display size, needs clarity not resolution |
| Event key frames | 16:9 | 2048x1152 draft, 3840x2160 final | Full-screen moments, maximum impact |
| Scroll/parchment textures | 3:2 or 4:3 | 1536x1024 or 2048x1536 | Background textures, tileable |

### Transparency Considerations

- `gpt-image-2` does not currently support transparent-background output.
- Character portraits: request "isolated on plain parchment" or "isolated on matte white background for background removal."
- UI elements: request "isolated on plain matte white/chroma-green background, clean edges for background removal."
- Seals/stamps: generate blank seal/stamp textures without readable characters; add production text later via frontend/SVG/manual compositing.
- Post-processing is required for alpha-channel assets. Recommended tools: Photoshop/Figma masking for finals; automated background removal for drafts.

---

## 3. Batch Generation: API vs ChatGPT Conversational

### API Approach (`gpt-image-2` image generation/editing)

**Advantages for hackathon:**
- Scriptable: can run 20+ generations in parallel
- Structured prompts from templates with variable substitution
- Reproducible: prompt templates and generation logs make outputs auditable, but exact determinism depends on API support at generation time
- No manual copy-paste of images
- Can integrate reference images through edit/reference workflows where available; use Responses API multi-turn image generation for iterative art direction

**Disadvantages:**
- One-shot Image API calls are less convenient for iterative art direction than ChatGPT/Responses conversations
- Reference image workflows require checking the current API shape at generation time
- Higher setup time (need script infrastructure)
- Cost per generation (no free tier for image generation)

**API Template Pattern:**
```typescript
const basePrompt = (subject: string, era: string, mood: string, aspect: string) => `
${subject}, Chinese historical ink painting style (彩墨),
traditional brush strokes with wet-dry ink variation on xuan paper,
${era} dynasty atmosphere, ${mood} tone,
留白 composition, ink bleeding edges,
game asset concept art, clean composition,
aspect ratio ${aspect}, high detail on focal subject
`;

// Batch generation
const assets = [
  { subject: "young scholar reading by candlelight", era: "Song", mood: "contemplative", aspect: "3:4" },
  { subject: "examination hall with rows of cubicles", era: "Ming", mood: "tense", aspect: "16:9" },
  // ...
];

for (const asset of assets) {
  const result = await openai.images.generate({
    model: "gpt-image-2",
    prompt: basePrompt(asset.subject, asset.era, asset.mood, asset.aspect),
    size: "1024x1536",
    quality: "medium", // use "low" for drafts, "high" for finals
  });
}
```

### ChatGPT Conversational Approach

**Advantages for hackathon:**
- Multi-turn iterative refinement ("make the ink darker", "add more 留白")
- Visual feedback loop — see result immediately, adjust
- Can upload art bible images as conversation context
- No code setup required
- GPT Image 2's "agentic reasoning" works best in conversation
- Better for establishing the art bible (exploratory phase)

**Disadvantages:**
- Manual: one image at a time
- Hard to maintain exact prompt consistency across 30+ assets
- No programmatic access to generated images (manual download)
- Session context can drift over long conversations

### Recommended Hybrid Strategy for Hackathon

| Phase | Method | Why |
|-------|--------|-----|
| Art Bible creation (5-10 images) | ChatGPT conversational | Exploratory, needs iteration, establishes style |
| Character portraits (10+) | ChatGPT with template | Semi-manual, needs per-character refinement |
| Scene backgrounds (4-8) | ChatGPT conversational | Each scene is unique, benefits from iteration |
| UI elements (batch of 15+) | API scripted | Repetitive, template-driven, parallelizable |
| Event key frames (5) | ChatGPT conversational | High-impact, needs artistic direction |

**Time estimate (hackathon):**
- Art Bible: 30-45 min (conversational, 5-10 iterations)
- Characters: 60-90 min (10+ portraits, ~5 min each with refinement)
- Scenes: 30-45 min (4-8 scenes, some need 2-3 iterations)
- UI elements: 20-30 min (batch via API or rapid ChatGPT)
- Key frames: 30-45 min (5 illustrations, high iteration)
- **Total: ~3-4 hours** for full asset set

---

## 4. Known Limitations

### CJK Text Generation

- GPT Image 2 has improved text rendering, but production Chinese text still needs manual validation
- For game assets, this means:
  - Short text (2-4 characters) like 中举, 落第, 传承: may be usable for exploration but should still be checked manually
  - Longer text or classical Chinese: may have stroke errors
  - Seal script (篆书) or cursive (草书): higher error rate due to complexity
  - **Recommendation**: Generate text elements separately and composite in post-processing, OR use the model for decorative/atmospheric pseudo-text where minor errors are acceptable
  - For critical UI text: render programmatically in the frontend, SVG, or manual compositing; do not bake it into generated images

### Traditional Chinese Decorative Elements

- Geometric patterns (回纹, 云纹, 如意纹): generally well-reproduced as they're common in training data
- Complex lattice patterns (窗棂): may lose regularity/symmetry
- Calligraphy integration: works for decorative effect, not for readable text
- Seal carving (篆刻) style: good for visual impression, may not be real characters
- **Recommendation**: Use generated decorative elements as atmospheric/background; critical patterns should be vector assets

### Historical Costume Accuracy

- General silhouettes (scholar robes, official hats) are well-known and usually correct
- Specific dynasty details may be anachronistic:
  - Tang vs Song vs Ming collar styles may blend
  - Official rank badges (补子) may not match correct dynasty
  - Headwear (乌纱帽 vs 幞头 vs 方巾) may be mixed
- **For this game**: PRD explicitly states "NOT historically accurate simulation" — stylistic consistency matters more than archaeological precision
- **Recommendation**: Pick one "reference dynasty" aesthetic (suggest Song/Ming blend) and lock it across all prompts rather than trying to differentiate 4 eras by costume

### Other Limitations

- Hands/fingers: still occasionally problematic in complex poses
- Multiple characters in one scene: consistency between them may vary
- Architectural details: traditional Chinese architecture (斗拱, 飞檐) may be approximate
- Ink wash gradients: sometimes too uniform/digital-looking; may need "imperfect brush strokes, natural ink pooling" in prompt

---

## 5. Art Bible Workflow

### Recommended Sequence

```
Step 1: Define Style Anchors (text)
  → Write 3-5 "style sentences" that describe the target look
  → Example: "Song dynasty literati painting meets modern game concept art,
     彩墨 with selective vermillion and jade accents on aged xuan paper,
     留白-heavy composition, visible brush texture, atmospheric ink wash backgrounds"

Step 2: Generate Seed Images (ChatGPT conversational)
  → Start with 2-3 prompts covering different subject types:
     - One character portrait
     - One landscape/scene
     - One decorative element
  → Iterate until all 3 feel cohesive

Step 3: Expand to Full Art Bible (5-10 images)
  → Generate remaining reference images using seed images as style anchors
  → Cover: character close-up, full scene, UI element, text treatment, color palette sample
  → Each new generation references previous successful outputs

Step 4: Document Style Guide
  → Extract the exact prompts that produced the best results
  → Note which keywords had the most impact
  → Create a "style block" that gets prepended to every future prompt
  → Document what NOT to include (anti-patterns that broke the style)

Step 5: Validate Consistency
  → Generate 3 test images (one of each type) using only the style guide + new subjects
  → If they match the art bible without reference images, the style guide is strong enough
  → If not, add more specific constraints or always include reference images
```

### Art Bible Directory Structure

```
assets/art-bible/
├── style-guide.md          # Keywords, anti-patterns, prompt templates
├── reference-01-character.png   # Character style anchor
├── reference-02-scene.png       # Scene/landscape style anchor
├── reference-03-ui.png          # UI element style anchor
├── reference-04-palette.png     # Color palette reference
├── reference-05-texture.png     # Paper/ink texture reference
├── prompts.md              # Exact prompts that generated each reference
└── anti-patterns.md        # What to avoid (with failed examples if useful)
```

---

## 6. Prompt Patterns by Asset Type

### Character Portraits

```
[Character name/role], Chinese historical ink painting portrait (彩墨工笔),
half-body composition facing slightly left, [age] [gender],
wearing [specific costume: e.g., indigo scholar's robe (青衫) with white inner collar],
[expression/mood], [distinctive feature: e.g., ink-stained fingers, folding fan],
soft ink wash background with subtle 留白,
xuan paper texture, visible brush strokes on fabric folds,
warm parchment border, game character portrait style,
aspect ratio 3:4, high detail on face and hands
```

**Consistency anchors per character:**
- Scholar (书生): 青衫, folding fan, ink-stained fingers, scholarly cap (方巾)
- Examiner (考官): dark official robe, stern expression, official hat (乌纱帽), writing brush
- Mentor (恩师): grey/white beard, warm expression, worn books, simple robe
- Rival (对手): similar age to scholar, slightly more ornate clothing, confident posture
- Spouse (妻子): hair ornaments (簪/钗), inner domestic setting cues, gentle expression

### Scene Backgrounds with Ink Wash Atmosphere

```
[Scene description], Chinese ink wash landscape painting style (水墨山水/彩墨),
wide establishing shot, [time of day] lighting,
[era] dynasty architecture and furnishings,
atmospheric ink wash gradients in background, detailed foreground elements,
留白 in upper portion for UI overlay space,
mist/clouds as natural 留白 transitions,
xuan paper texture throughout, visible brush energy in foliage/architecture,
[mood] atmosphere, [season] seasonal indicators,
game background art, aspect ratio 16:9, 4K detail
```

**Scene-specific additions:**
- 书斋 (Study): candlelight glow, stacked books, ink stone, window with bamboo outside
- 考场 (Exam hall): rows of wooden cubicles, paper lanterns, imposing architecture
- 朝堂 (Court): vermillion pillars, dragon motifs, vast scale, gold accents
- 乡村 (Village): thatched roofs, willow trees, distant mountains, pastoral calm

**Key technique — UI overlay space:**
Always request 留白 or atmospheric fade in the upper 20-30% of scene backgrounds. This provides natural space for UI elements (stat bars, season indicator, action cards) without obscuring the art.

### UI Decorative Elements

**Scroll/Frame Borders:**
```
Traditional Chinese scroll border frame, ink painting style,
aged parchment/xuan paper center (blank for content),
decorative ink brush border with [pattern: cloud motifs/geometric 回纹/bamboo],
subtle gold or vermillion accent lines,
clean edges suitable for 9-slice scaling,
plain matte white or chroma-green background outside frame for background removal, game UI element,
aspect ratio [varies], flat design compatible
```

**Seal/Stamp Decorations:**
```
Traditional Chinese seal stamp (印章/篆刻),
[text or symbol] carved in seal script style,
vermillion red ink impression on paper,
slightly imperfect edges (authentic stamp feel),
isolated on plain matte white background for background removal,
square format, game UI decoration element
```

**Ink Brush Dividers:**
```
Horizontal ink brush stroke divider, Chinese calligraphy style,
single expressive brush stroke with natural taper at ends,
wet ink with slight bleeding edges,
[optional: small decorative element at center — plum blossom/bamboo leaf],
plain matte white background for background removal, game UI separator element,
wide aspect ratio (8:1 or similar), minimal height
```

**Action Category Icons:**
```
[Action concept] icon, Chinese ink painting miniature style,
simple iconic composition in circular frame,
ink brush strokes with [accent color] highlight,
clear silhouette readable at small size (64x64px display),
plain matte white background for background removal, game action icon,
aspect ratio 1:1, clean and bold
```

Icon concepts:
- 读书 (Study): open book + candle
- 交游 (Socialize): two figures or wine cup
- 营生 (Earn): coins or abacus
- 休养 (Rest): sleeping figure or tea cup
- 钻营 (Scheme): shadowed figure or whispered conversation

---

## 7. API Integration Notes

### OpenAI Image Generation API (gpt-image-2)

Current recommended usage:

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Basic generation
const response = await openai.images.generate({
  model: "gpt-image-2",
  prompt: "...",
  n: 1,
  size: "1024x1536",  // draft portrait; both edges are multiples of 16
  quality: "medium",  // "low" draft, "medium" review, "high" final, "auto" fallback
});

// For style/reference-image workflows, use image editing/reference-image
// flows where available, or the Responses API image generation tool for
// multi-turn iteration with uploaded art bible images.
```

### Size Options (within current gpt-image-2 constraints)

| Use Case | Size Parameter | Aspect |
|----------|---------------|--------|
| Portrait | `1024x1536` or `2160x3840` | 2:3 / 9:16 |
| Background | `2048x1152` or `3840x2160` | 16:9 |
| Square icon | `1024x1024` | 1:1 |
| Wide banner/divider source | `1536x512` | 3:1, crop thinner after generation |

### Cost Considerations for Hackathon

- Image generation API calls are not free (unlike text models with free tiers)
- Budget for ~50-80 generations (including iterations/rejects)
- `high` quality costs more but is worth it for final assets
- `low` quality is acceptable for throwaway composition tests
- `medium` quality is the default recommendation for review candidates
- Consider: generate at `low`/`medium` during exploration, regenerate finals at `high`

---

## 8. Comparison with Gemini Image Generation (from tiktok_hackathon reference)

The project's prior hackathon (tiktok_hackathon) used Gemini 3.1 Flash Image for ink painting style generation. Key learnings applicable here:

| Dimension | GPT Image 2 (per PRD) | Gemini 3.1 Flash Image (tested) |
|-----------|----------------------|--------------------------------|
| Resolution | Custom sizes up to 4K-class constraints | Up to 4K (imageSize: "4K") |
| CJK text | Improved but still not production-safe | Not documented |
| Style consistency | Reference image support | Multi-turn conversation |
| Speed | Not documented | ~15-40s per image |
| Multi-turn editing | Yes (agentic reasoning) | Yes (pass conversation history) |
| Aspect ratios | Standard sizes | 14 options including 16:9, 9:16, 1:1 |
| Cost | Paid per generation | Preview pricing (cheaper) |
| Ink painting quality | Expected strong (trained on large dataset) | Tested: produces "古风水墨背景" in ~15s |

**Recommendation**: Use GPT Image 2 as primary (higher quality, better CJK), keep Gemini as fallback if budget is a concern or for rapid iteration during exploration phase.

---

## 9. Anti-Patterns to Avoid

| Anti-Pattern | Why It Fails | Fix |
|--------------|-------------|-----|
| "Chinese painting" alone | Too vague, may produce modern Chinese art or oil painting | Specify: "Chinese ink wash painting (水墨画) on xuan paper with visible brush strokes" |
| Requesting too many elements | Cluttered composition breaks ink painting aesthetic | Embrace 留白; fewer elements, more atmosphere |
| "Realistic" + "ink painting" | Contradictory styles produce uncanny results | Choose one: either stylized ink painting OR realistic |
| Mixing dynasty aesthetics | Anachronistic costumes break immersion | Lock to one reference dynasty per prompt |
| "Perfect" or "symmetrical" | Ink painting is inherently asymmetric and imperfect | Use "natural asymmetry, organic brush energy" |
| Requesting specific Chinese text | May produce incorrect characters | Leave blank space; add text later with frontend/SVG/manual compositing |
| Over-specifying colors | Ink painting is primarily monochrome with accents | Limit color mentions to 1-2 accent colors max |
| "Digital art" or "3D render" | Pulls away from traditional medium feel | Always anchor with "traditional brush strokes, xuan paper texture" |

---

## 10. Hackathon Execution Plan

### Priority Order (if time-constrained)

1. **Art Bible** (30 min) — establishes everything else; do first
2. **Scene backgrounds** (30 min) — biggest visual impact for demo
3. **Character portraits** (60 min) — core emotional connection
4. **UI elements** (20 min) — can use simple CSS fallbacks if skipped
5. **Event key frames** (30 min) — nice-to-have for demo wow factor

### Minimum Viable Asset Set (2-hour budget)

- 3 art bible references
- 4 scene backgrounds (one per game phase)
- 3 character portraits (scholar young/old + examiner)
- 1 scroll frame border
- 1 seal stamp

### Full Asset Set (4-hour budget)

- 5-10 art bible references
- 4-8 scene backgrounds with era variants
- 10+ character portraits
- Full UI element set (borders, stamps, icons, dividers)
- 5 event key frame illustrations

---

## Caveats / Uncertainties

1. **GPT Image 2 exact API interface**: The API surface can change. Verify exact request shape against current OpenAI API docs at generation time, especially reference-image/editing workflows.

2. **Reference image support path**: Style references may be easiest in ChatGPT or Responses multi-turn workflows. If the one-shot Image API path is awkward, use ChatGPT/Responses for style-locked generation and keep prompt logs for reproducibility.

3. **Transparency/alpha channel**: `gpt-image-2` does not currently support transparent backgrounds. Post-processing is required for character portraits and UI elements that need alpha.

4. **Cost**: No free tier for image generation. Budget ~$5-15 for a full hackathon asset generation session (50-80 images at HD quality).

5. **Rate limits**: OpenAI image generation has rate limits (typically 5-7 images/minute for paid accounts). Plan batch generation accordingly.

6. **Style drift in long sessions**: Even with reference images, style may drift over 30+ generations. Periodically compare new outputs against art bible anchors and re-anchor if needed.
