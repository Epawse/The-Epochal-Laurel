# Research: AI-Generated Game Art Asset Pipeline Organization

- **Query**: Best practices for organizing AI-generated game art assets in a Next.js project (百世流芳 — ink painting roguelike)
- **Scope**: mixed (internal project specs + external best practices)
- **Date**: 2026-05-23

---

## 1. Directory Structure Conventions for Game Assets in Next.js

### Recommendation: `public/assets/` with category subdirectories

Next.js serves files from `public/` as static assets at the root URL path. For a game with many art assets, the structure should mirror the PRD's asset categories (R1-R5):

```
public/
└── assets/
    ├── art-bible/           # R1: Style reference images + style-guide.md
    │   ├── ref-001-ink-wash-landscape.png
    │   └── ref-002-character-brushwork.png
    ├── characters/          # R2: Character portraits
    │   ├── scholar-young.png
    │   ├── scholar-middle.png
    │   ├── scholar-old.png
    │   ├── examiner-strict.png
    │   └── ...
    ├── scenes/              # R3: Scene/background art (16:9)
    │   ├── study-room.png
    │   ├── study-room--invasion.png
    │   ├── examination-hall.png
    │   └── ...
    ├── ui/                  # R4: UI decorative elements
    │   ├── borders/
    │   │   ├── scroll-frame-top.png
    │   │   └── scroll-frame-9slice.png
    │   ├── stamps/
    │   │   ├── seal-pass.png
    │   │   └── seal-era-prosperity.png
    │   ├── dividers/
    │   │   └── ink-brush-divider-01.png
    │   └── icons/
    │       ├── action-study.png
    │       ├── action-socialize.png
    │       ├── action-earn.png
    │       ├── action-rest.png
    │       └── action-scheme.png
    ├── moments/             # R5: Key-frame event illustrations
    │   ├── exam-pass.png
    │   ├── exam-fail.png
    │   ├── inheritance.png
    │   ├── scheme-exposure.png
    │   └── palace-exam.png
    └── _prompts/            # Prompt templates (not served, starts with _)
        └── manifest.json
```

### Why `public/assets/` over `src/assets/`

| Approach | Pros | Cons |
|----------|------|------|
| `public/assets/` | Direct URL access (`/assets/characters/scholar-young.png`), no import needed, works with `next/image` `src` prop, no webpack processing overhead for large images | No content-hash in filename (cache busting via headers), no tree-shaking |
| `src/assets/` (imported) | Webpack processes them, content-hash filenames, can import in components | Build-time overhead for many large images, requires import statements, complicates dynamic paths |

**Verdict**: `public/assets/` is correct for this project. Game art assets are large, numerous, and referenced dynamically (e.g., character portrait based on game state). The `next/image` component handles optimization at request time regardless of source location.

### Integration with existing frontend spec

The frontend directory structure spec (`frontend/directory-structure.md`) defines `components/game/moments/` for animation components. These components would reference assets via path:

```tsx
// components/game/moments/CaptureBanner.tsx
import Image from "next/image";

export function CaptureBanner({ name, rank }: Props) {
  return (
    <div className="relative">
      <Image
        src="/assets/moments/exam-pass.png"
        alt=""
        width={1920}
        height={1080}
        priority
      />
      {/* overlay text */}
    </div>
  );
}
```

---

## 2. Naming Conventions for AI-Generated Assets

### Recommended naming scheme

```
<category>-<subject>[-<variant>][-<version>].ext
```

Components:
- **category**: matches directory (redundant but useful when files are referenced out of context)
- **subject**: kebab-case descriptor of the content
- **variant**: optional modifier (era, mood, age, style variation)
- **version**: optional `v2`, `v3` for iterations on the same concept

### Examples

```
characters/scholar-young.png              # base version
characters/scholar-young-v2.png           # iteration on same concept
characters/scholar-young--prosperity.png  # era variant (double-dash for variant namespace)
scenes/study-room.png                     # base scene
scenes/study-room--invasion.png           # era variant
scenes/village--prosperity.png
scenes/village--invasion.png
ui/icons/action-study.png
ui/stamps/seal-era-prosperity.png
moments/exam-pass.png
moments/exam-pass-v3.png                  # third iteration
```

### Tracking prompt versions and iterations

Use a sidecar approach — each asset directory contains a `_prompts.jsonl` (JSON Lines) file that logs generation metadata:

```jsonl
{"file":"scholar-young.png","prompt_id":"char-001","prompt_version":"v3","model":"gpt-image-2","timestamp":"2026-05-23T10:30:00Z","params":{"size":"1024x1536","style":"ink-wash"},"notes":"Selected from 4 candidates","references":["art-bible/ref-001","art-bible/ref-002"]}
{"file":"scholar-young-v2.png","prompt_id":"char-001","prompt_version":"v4","model":"gpt-image-2","timestamp":"2026-05-23T11:00:00Z","params":{"size":"1024x1536","style":"ink-wash"},"notes":"More defined facial features per feedback","references":["art-bible/ref-001","scholar-young.png"]}
```

JSONL is preferred over JSON arrays because:
- Append-only (no parse-modify-write cycle)
- Git-friendly (one line per entry, clean diffs)
- Easy to grep/filter

---

## 3. Image Format Recommendations

### Format comparison for this project's asset types

| Asset Type | Recommended Format | Rationale |
|------------|-------------------|-----------|
| Character portraits (transparency) | **WebP** (primary) + PNG (source/fallback) | WebP supports alpha, 25-35% smaller than PNG at equivalent quality. All modern browsers support it. Keep PNG as archival source. |
| Scene backgrounds (no transparency) | **WebP** (primary), AVIF (progressive enhancement) | Backgrounds are large (1920x1080+). WebP gives good compression. AVIF is 20% smaller but encoding is slow — use if pre-generated. |
| UI elements (transparency, small) | **WebP** or **PNG** | Small UI elements (icons, stamps) compress well in either. PNG is fine for <50KB files where the compression savings are negligible. |
| Icons (simple shapes) | **SVG** if possible, else **WebP** | If icons are simple enough for vector, SVG scales perfectly. AI-generated ink-brush icons likely need raster — use WebP. |
| 9-slice borders (tileable) | **PNG** | Tiling/slicing operations work most reliably with PNG. Size is small. |

### Practical recommendation for hackathon timeline

**Generate everything as PNG (lossless source), serve as WebP via next/image.**

Next.js `<Image>` component automatically converts and serves WebP/AVIF based on browser `Accept` header when using the built-in image optimizer. This means:

1. Store source PNGs in `public/assets/` (maximum quality, no generation-time format decisions)
2. `next/image` serves optimized WebP/AVIF automatically at request time
3. No manual format conversion pipeline needed

```tsx
// Next.js automatically serves WebP/AVIF based on browser support
<Image src="/assets/scenes/study-room.png" ... />
// Browser receives: /_next/image?url=%2Fassets%2Fscenes%2Fstudy-room.png&w=1920&q=80
// Content-Type: image/webp (or image/avif if supported)
```

### next/image configuration for this project

```js
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'], // prefer AVIF, fallback WebP
    deviceSizes: [640, 750, 828, 1080, 1200, 1920], // responsive breakpoints
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384], // icon/thumbnail sizes
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days — assets don't change often
  },
};
```

---

## 4. Asset Manifest / Catalog Approach

### Recommendation: Yes, maintain a typed asset manifest

A manifest provides:
- Programmatic access to assets by semantic ID (not file path)
- Type safety — TypeScript catches missing/renamed assets at build time
- Metadata for the game engine (which portrait to show based on character state)
- Single source of truth for asset availability

### Proposed structure: `lib/assets/manifest.ts`

```typescript
// lib/assets/manifest.ts

export const ASSET_BASE = "/assets";

export type AssetCategory = "characters" | "scenes" | "ui" | "moments" | "art-bible";

export interface AssetEntry {
  id: string;
  path: string;           // relative to public/assets/
  category: AssetCategory;
  width: number;
  height: number;
  variants?: Record<string, string>; // variant name -> path
  tags?: string[];
}

export const characters = {
  scholar: {
    young: { id: "scholar-young", path: "characters/scholar-young.png", category: "characters", width: 1024, height: 1536 },
    middle: { id: "scholar-middle", path: "characters/scholar-middle.png", category: "characters", width: 1024, height: 1536 },
    old: { id: "scholar-old", path: "characters/scholar-old.png", category: "characters", width: 1024, height: 1536 },
  },
  examiner: {
    strict: { id: "examiner-strict", path: "characters/examiner-strict.png", category: "characters", width: 1024, height: 1536 },
    corrupt: { id: "examiner-corrupt", path: "characters/examiner-corrupt.png", category: "characters", width: 1024, height: 1536 },
  },
  // ...
} as const satisfies Record<string, Record<string, AssetEntry>>;

export const scenes = {
  studyRoom: {
    default: { id: "study-room", path: "scenes/study-room.png", category: "scenes", width: 1920, height: 1080 },
    invasion: { id: "study-room-invasion", path: "scenes/study-room--invasion.png", category: "scenes", width: 1920, height: 1080 },
  },
  // ...
} as const satisfies Record<string, Record<string, AssetEntry>>;

// Helper to get full URL
export function assetUrl(entry: AssetEntry): string {
  return `${ASSET_BASE}/${entry.path}`;
}

// Helper to get portrait by game state
export function getCharacterPortrait(role: string, variant: string): AssetEntry | undefined {
  return (characters as any)[role]?.[variant];
}
```

### Why TypeScript manifest over JSON

- Type inference and autocompletion in components
- Build-time validation (missing asset = type error)
- Can include helper functions
- Imported directly — no fetch/parse overhead
- Still easy to generate from a script if needed

### Alternative: JSON manifest for tooling

If external tools (asset pipeline scripts, CI checks) need to read the manifest, maintain a parallel `public/assets/manifest.json` generated from the TypeScript source:

```json
{
  "version": "1.0.0",
  "generated": "2026-05-23T12:00:00Z",
  "assets": [
    {
      "id": "scholar-young",
      "path": "characters/scholar-young.png",
      "category": "characters",
      "width": 1024,
      "height": 1536
    }
  ]
}
```

---

## 5. Resolution Strategy

### Base generation resolutions

| Asset Type | Generation Resolution | Rationale |
|------------|----------------------|-----------|
| Character portraits | **1024x1536** (2:3 portrait) | GPT Image 2 supports up to 4K. 1024x1536 is sufficient for half-body portraits displayed at ~300-500px width on screen. Provides 2-3x density for retina. |
| Scene backgrounds | **1920x1080** (16:9) | Matches target display (laptop). Provides 1x at full-screen, adequate for desktop-first. Generate at **2560x1440** if budget allows for retina. |
| UI elements (icons) | **256x256** or **512x512** | Icons display at 32-64px. 256px source gives 4-8x density — more than enough. |
| UI elements (borders/frames) | **Variable, tileable dimension** | Generate at the repeat-unit size needed. For 9-slice, generate the full frame at ~800x600 then slice. |
| Moment illustrations | **1920x1080** (16:9) | Full-screen dramatic moments. Same as backgrounds. |
| Stamps/seals | **512x512** | Display at ~64-128px. 512px source is ample. |

### Responsive serving via next/image

Next.js `<Image>` with `sizes` prop generates `srcset` automatically:

```tsx
// Full-width background
<Image
  src="/assets/scenes/study-room.png"
  alt=""
  fill
  sizes="100vw"
  quality={80}
  priority // above-the-fold backgrounds
/>

// Character portrait in a sidebar (max 400px wide)
<Image
  src="/assets/characters/scholar-young.png"
  alt="Scholar portrait"
  width={1024}
  height={1536}
  sizes="(max-width: 768px) 50vw, 400px"
  quality={85}
/>

// Small icon
<Image
  src="/assets/ui/icons/action-study.png"
  alt="Study"
  width={64}
  height={64}
  sizes="64px"
/>
```

The `sizes` prop tells the browser which `srcset` candidate to pick. Next.js generates resized variants at the `deviceSizes` and `imageSizes` breakpoints configured in `next.config.js`.

### Key point: Do NOT pre-generate multiple resolutions

With `next/image`, you store ONE high-resolution source. The framework generates and caches resized variants on-demand. This eliminates the need for a manual responsive asset pipeline.

---

## 6. Prompt Template Documentation for Reproducibility

### Approach: Colocated prompt registry

Store prompt templates in a dedicated file that lives alongside the assets, enabling anyone to regenerate or iterate on any asset.

### File: `public/assets/_prompts/templates.md`

Human-readable prompt documentation:

```markdown
# Asset Prompt Templates

## Base Style Lock (all assets)

All prompts include these style anchors:
- "Chinese historical ink painting style (水墨画/彩墨)"
- "traditional brush strokes with wet-dry ink variation"
- "selective color accents on monochrome ink wash base"
- "liubai (留白) negative space"
- "game asset concept art, clean composition"

## Character Portrait Template (CHAR-TPL-01)

```
[Character role and description], Chinese historical ink painting style (水墨画),
half-body portrait, facing slightly left, [age] years old,
traditional brush strokes with wet-dry ink variation,
[era] dynasty clothing and accessories,
[mood/personality] expression,
isolated on plain matte white background for background removal, high detail on face and hands,
1024x1536, game character portrait
--reference: [art-bible ref IDs]
```

Variables:
- Character role: 书生/考官/恩师/对手/妻子
- Age: young (20s) / middle (40s) / old (60s)
- Era: prosperity / decline / invasion / restoration
- Mood: determined / weary / corrupt / wise / fierce

## Scene Background Template (SCENE-TPL-01)

```
[Location name and description], Chinese historical ink painting landscape,
16:9 wide composition, [time of day] lighting,
[era] dynasty architecture and environment details,
[mood] atmosphere, ink wash with selective [palette] color accents,
liubai negative space in [position],
game background art, layered depth,
1920x1080
--reference: [art-bible ref IDs]
```
```

### File: `public/assets/_prompts/generation-log.jsonl`

Machine-readable generation history (append-only):

```jsonl
{"id":"gen-001","template":"CHAR-TPL-01","file":"characters/scholar-young.png","timestamp":"2026-05-23T10:30:00Z","model":"gpt-image-2","variables":{"role":"书生","age":"young","era":"prosperity","mood":"determined"},"full_prompt":"...","iterations":3,"selected_iteration":2,"notes":"Iteration 2 had best brush texture on robes"}
```

### Traceability chain

```
Template ID (CHAR-TPL-01)
  → Generation Log entry (gen-001)
    → Output file (characters/scholar-young.png)
      → Manifest entry (scholar-young)
        → Component usage (components/game/...)
```

This chain allows:
- Regenerating any asset by replaying its log entry
- Iterating on a template and regenerating all assets that use it
- Auditing which assets need refresh when style direction changes

---

## 7. Storage Considerations for Hackathon Demo on Vercel

### Options analysis

| Storage | Pros | Cons | Verdict |
|---------|------|------|---------|
| **Git repo (`public/`)** | Simple, versioned, no external deps, instant deploys | Repo bloat (git stores full binary history), slow clones, GitHub 100MB file limit | **Use for hackathon** |
| **Supabase Storage** | Scalable, CDN-backed, no repo bloat, access control | Extra setup, CORS config, separate deploy pipeline, latency for first load | Overkill for demo |
| **External CDN (Cloudinary, imgix)** | Best performance, on-the-fly transforms, no repo bloat | Cost, vendor lock-in, setup time, another service to manage | Overkill for demo |
| **Vercel Blob Storage** | Native Vercel integration, edge-cached, no repo bloat | Relatively new, extra API calls, costs money beyond free tier | Good future option |
| **Git LFS** | Keeps repo lean, stores binaries externally | Setup complexity, Vercel doesn't natively support LFS in builds, extra config | Avoid for hackathon |

### Recommendation for this project: Git repo (`public/assets/`)

**Rationale for hackathon context:**

1. **Simplicity**: `git push` deploys everything. No separate asset upload step.
2. **Vercel free tier**: Serves static assets from `public/` via their edge CDN automatically. No config needed.
3. **Size estimate**: ~50 assets at 1-3MB each = 50-150MB total. Within GitHub's soft limit (1GB repo) and Vercel's deployment size limit (no individual file >50MB for serverless, but static assets in `public/` have no such limit on Vercel's edge).
4. **Cache headers**: Vercel automatically sets long cache headers for static assets in `public/`.
5. **No auth needed**: Assets are public game art — no access control required.

### Mitigations for repo bloat

- Add `*.psd`, `*.ai`, `*.sketch` to `.gitignore` (source files stay local)
- Keep only final selected versions in git (iterations/rejects stay local or in a separate archive)
- If repo exceeds ~500MB, migrate to Vercel Blob Storage post-hackathon

### Vercel-specific considerations

- **Build output limit**: Vercel has a 250MB compressed deployment limit for serverless functions, but static assets in `public/` are deployed separately to the edge network with no practical size limit for this scale.
- **Image optimization**: Vercel's built-in image optimizer (backing `next/image`) has a free tier of 1000 optimizations/month on Hobby plan. For a hackathon demo this is sufficient.
- **Cold start**: Static assets from `public/` have no cold start — they're served directly from the edge CDN.

### `.gitignore` additions for asset workflow

```gitignore
# Asset generation workspace (not deployed)
public/assets/_workspace/
public/assets/_rejected/
*.psd
*.ai

# Keep prompt logs and manifests
!public/assets/_prompts/
```

---

## Summary: Recommended Asset Pipeline for 百世流芳

```
Generation (GPT Image 2)
  ↓ PNG at target resolution
  ↓ Log to _prompts/generation-log.jsonl
  
Storage (public/assets/)
  ↓ Organized by category (characters/, scenes/, ui/, moments/)
  ↓ Named: <subject>[-<variant>][-<version>].png
  
Registry (lib/assets/manifest.ts)
  ↓ Typed entries with dimensions and semantic IDs
  ↓ Helper functions for game-state → asset lookup
  
Serving (next/image)
  ↓ Automatic WebP/AVIF conversion
  ↓ Automatic responsive srcset generation
  ↓ Edge-cached by Vercel CDN
  
Display (components/game/*)
  ↓ Import from manifest, use <Image> component
  ↓ sizes prop for responsive hints
```

---

## Related Internal Specs

| Spec | Relevance |
|------|-----------|
| `.trellis/spec/frontend/directory-structure.md` | Defines component structure that will consume assets |
| `.trellis/spec/frontend/component-guidelines.md` | Moment components pattern — where assets are used |
| `.trellis/spec/frontend/index.md` | Stack decisions (Next.js App Router, Tailwind, Framer Motion) |
| `.trellis/spec/backend/index.md` | Confirms Vercel deployment, Supabase for data (not assets) |
| `.trellis/spec/game-design/core-loop.md` | Key Visual/Animation Moments table — defines which assets are P0/P1/P2 |

## Caveats

- No application code exists yet in this repo — all recommendations are forward-looking based on the spec conventions.
- The `public/` directory does not yet exist in the project.
- Vercel image optimization limits (1000/month on Hobby) may need monitoring during demo day if traffic spikes. Upgrade to Pro or pre-optimize critical assets if needed.
- GPT Image 2's actual output quality for ink-wash style at these resolutions should be validated with the art bible before batch generation.
- AVIF encoding is slow — if generating AVIF manually (not via next/image), budget extra time. The recommendation is to let next/image handle it at request time.
