# Research: Claude Design for Interactive Game UI Prototypes

- **Query**: Claude Design capabilities for multi-page interactive game prototypes (百世流芳)
- **Scope**: External (product launched April 2026, after training cutoff)
- **Date**: 2026-05-23
- **Source**: https://www.anthropic.com/news/claude-design-anthropic-labs (official blog post, Apr 17 2026)

## Summary

Claude Design is an Anthropic Labs product (research preview) powered by Claude Opus 4.7. It is accessed at claude.ai/design and included with Pro, Max, Team, and Enterprise subscriptions.

---

## Q1: Multi-Page Interactive Prototypes (7+ Screens with State-Like Behavior)

### What the blog confirms

- Claude Design produces "interactive prototypes" — the Brilliant testimonial explicitly mentions "turn static designs into interactive prototypes" and references "most complex pages" being recreated.
- The product is described as handling "designs, prototypes, slides, one-pagers, and more."
- Brilliant's testimonial: "Our most complex pages, which took 20+ prompts to recreate in other tools, only required 2 prompts in Claude Design."
- "Frontier design: Anyone can build code-powered prototypes with voice, video, shaders, 3D and built-in AI."

### Assessment for 7-screen game prototype

- The blog does not specify a hard limit on number of screens/pages per project.
- "Code-powered prototypes" suggests the output is HTML/JS-based, which inherently supports multi-page navigation and state management.
- The Brilliant use case (educational platform with intricate interactivity and animations) is a reasonable analog for a game UI with multiple screens.
- Navigation between screens is likely supported since the product targets "feature flows" (PM use case) and "interactive prototypes" (designer use case).

### Confidence level: MEDIUM-HIGH

The product clearly handles multi-page interactive work. Whether 7 screens with game-state-like behavior (stat tracking across screens, conditional navigation) works smoothly in a single project is not explicitly documented. The "code-powered" nature suggests it's technically possible.

---

## Q2: Design System Ingestion (Uploading Art Assets as Backgrounds/Decorations)

### What the blog confirms

- "During onboarding, Claude builds a design system for your team by reading your codebase and design files."
- "Every project after that uses your colors, typography, and components automatically."
- "You can refine the system over time, and teams can maintain more than one."
- Import methods: "Start from a text prompt, upload images and documents (DOCX, PPTX, XLSX), or point Claude at your codebase."
- "You can also use the web capture tool to grab elements directly from your website."

### Assessment for uploading GPT Image 2 PNGs

- Image upload is explicitly supported as an input method.
- The design system ingestion reads "design files" — this likely includes uploaded image assets.
- The workflow of uploading art bible PNGs and having them applied as backgrounds/decorations aligns with the stated capability of importing images and building a design system from them.
- The blog does not specify whether uploaded PNGs are automatically tiled, positioned, or treated as background assets vs. inline images. This likely requires explicit prompting (e.g., "use this image as the background for the exam screen").

### Confidence level: MEDIUM

Upload is confirmed. Automatic application as backgrounds/decorations likely requires explicit instruction in the prompt rather than being fully automatic. The design system feature focuses on colors/typography/components — custom art assets may need per-project prompting.

---

## Q3: Export Format for Developer Handoff

### What the blog confirms

Export options (explicitly listed):
1. **Internal URL** — shareable within organization
2. **Save as folder** — local file save
3. **Canva** — direct export to Canva
4. **PDF** — static document export
5. **PPTX** — PowerPoint format
6. **Standalone HTML files** — self-contained HTML

Handoff to Claude Code:
- "When a design is ready to build, Claude packages everything into a handoff bundle that you can pass to Claude Code with a single instruction."
- Brilliant testimonial: "Including design intent in Claude Code handoffs has made the jump from prototype to production seamless."

### Assessment for developer reference

- **Standalone HTML** is the most useful export for developer reference — it preserves interactivity, layout, and styling.
- The **handoff bundle** to Claude Code is the premium path: it includes "design intent" (not just code), meaning Claude Code receives both the visual output AND the reasoning/specifications behind it.
- The HTML export likely contains inline CSS/JS that demonstrates the layout structure, which developers can reference for Tailwind class equivalents.
- "Save as folder" may provide a more structured file tree (separate HTML/CSS/JS/assets).

### Recommended export strategy for this project

1. Export **standalone HTML** from the Asset Showcase as the primary visual QA and demo-review artifact
2. Export **standalone HTML** or **save as folder** from the Game Prototype as the developer reference
3. Use **Claude Code handoff** only after the showcase has approved the asset set and the prototype flow is stable
4. Export **PDF** only for offline review/sharing at hackathon demo

### Confidence level: HIGH

Export formats are explicitly documented. The handoff bundle's exact contents (whether it generates React/Next.js code or generic HTML) is not specified in the blog.

---

## Q4: Token/Quota Limitations

### What the blog confirms

- "Access is included with your plan and uses your subscription limits, with the option to continue beyond those limits by enabling extra usage."
- Available for: Pro, Max, Team, Enterprise
- Max plan offers "5x or 20x more usage than Pro" (from pricing page)
- Enterprise: off by default, admins enable in Organization settings

### What is NOT documented

- Specific token counts or message limits per design session
- Whether complex multi-screen prototypes consume more quota than simple single-page designs
- Whether the Opus 4.7 model usage in Design counts differently from chat usage
- Rate limits or cooldown periods

### Assessment for complex 7-screen game prototype

- On Pro plan: likely feasible but may hit usage limits during heavy iteration
- On Max 5x/20x: should be comfortable for extensive prototyping sessions
- The "extra usage" option provides overflow capacity
- Brilliant's testimonial ("2 prompts" for complex pages) suggests the tool is efficient — a 7-screen prototype might require 7-15 prompts total for initial generation, plus iteration

### Confidence level: LOW

No specific numbers are published. The blog only confirms it uses subscription limits.

---

## Q5: Direct UI Asset Generation (Buttons, Cards, Stat Bars, Borders)

### What the blog confirms

- Claude Design creates "polished visual work like designs, prototypes, slides, one-pagers"
- "Frontier design: code-powered prototypes with voice, video, shaders, 3D and built-in AI"
- The product generates complete interactive designs, which inherently include UI components (buttons, cards, navigation elements)

### Assessment

- Claude Design generates UI components as part of prototypes — these are rendered via HTML/CSS/SVG, not raster images.
- For simple UI elements (buttons, stat bars, progress indicators, card layouts), Claude Design can generate them directly as styled HTML/CSS components.
- For decorative elements with artistic quality (ink brush borders, seal stamps, calligraphic headers), GPT Image 2 remains the better tool since these require raster art, not vector/CSS.
- Claude Design's output components can supplement GPT Image 2 by providing the structural UI (layout, spacing, interactive states) while GPT Image 2 provides the artistic textures and illustrations.

### Division of labor recommendation

| Element | Tool | Rationale |
|---------|------|-----------|
| Buttons (with ink-style borders) | Claude Design + GPT Image 2 border asset | Structure from Design, texture from Image |
| Stat bars | Claude Design | Pure CSS/SVG, no art needed |
| Card layouts | Claude Design | Structural component |
| Decorative borders (ink brush) | GPT Image 2 | Requires artistic raster quality |
| Seal stamps | GPT Image 2 | Artistic element |
| Action icons | GPT Image 2 | Artistic element |
| Navigation elements | Claude Design | Interactive component |

### Confidence level: MEDIUM-HIGH

The product clearly generates UI components. Whether it can produce aesthetically complex Chinese-style decorative elements (vs. clean modern UI) depends on prompting quality.

### How Claude Design should handle uploaded GPT Image assets

Claude Design should treat generated images as a curated asset library:

| Asset Type | Claude Design Usage | Notes |
|------------|---------------------|-------|
| Art bible references | Display in the Asset Showcase only | These are style anchors, not production UI elements |
| Scene backgrounds | Full-screen or dimmed background images in game screens | Preserve composition; avoid cropping away the negative-space area intended for overlays |
| Character portraits | Fixed-ratio portrait panels and event/inheritance cards | Keep 3:4 or 2:3 containers stable across all variants |
| UI borders/frames | Decorative panel frames or CSS background images | Use CSS/SVG fallbacks when a raster frame does not slice cleanly |
| Blank seals/stamps | Result/status decorations behind HTML text | Do not rely on text baked into seal images |
| Dividers | Section separators on parchment panels | Crop or mask from the source image if needed |
| Action icons | Action card icons, shown at final size and preview size | Validate readability at 64px |
| Key moments | Full-width preview cards and modal scenes | Use as dramatic illustrations, not busy backgrounds behind long text |

If an uploaded image is missing, Design should create a tasteful placeholder box with the same aspect ratio. The placeholder should not appear as visible explanatory copy in the final UI; it is only a layout stand-in during design.

---

## Q6: Workflow — One Project vs. Separate Projects, Iteration Model

### What the blog confirms

- Refinement methods: "conversation, inline comments, direct edits, or custom sliders (made by Claude)"
- "Comment inline on specific elements, edit text directly, or use adjustment knobs to tweak spacing, color, and layout live."
- "Then ask Claude to apply your changes across the full design."
- Design system persists across projects: "Every project after that uses your colors, typography, and components automatically."
- Collaboration: group conversations, shared editing

### Assessment for game prototype workflow

**Option A: Single project with all 7 screens**
- Pros: Consistent styling, cross-screen navigation works natively, "apply changes across the full design" feature useful
- Cons: May become complex to manage, harder to iterate on individual screens
- Best for: Final integrated prototype with working navigation

**Option B: Separate projects per screen**
- Pros: Focused iteration, easier to experiment with alternatives
- Cons: No cross-screen navigation, may drift in style consistency
- Best for: Early exploration phase

**Recommended approach:**
1. Create an **Asset Showcase project** first. Upload the final selected images and verify consistency, naming, categories, and preview behavior.
2. Start with separate exploration screens for 2-3 key game screens (Daily Loop, Exam, Inheritance) only if the showcase reveals layout questions.
3. Once style and asset usage are locked, create a single integrated **Game Prototype project** with all 7 screens.
4. Use inline comments for targeted fixes, conversation for structural changes.
5. Use "apply across full design" to propagate style updates.

### Iteration model:
- **Inline comments**: point at specific element, request change (like Figma comments)
- **Conversation**: describe broader changes ("make all buttons more ink-brush styled")
- **Direct edits**: modify text content directly in the canvas
- **Custom sliders**: Claude creates adjustment controls for parameters you frequently tweak

### Confidence level: MEDIUM

The iteration mechanisms are documented. The single-vs-multiple project tradeoff is inferred from the feature descriptions, not from explicit guidance.

---

## Q7: Handoff to Claude Code (Next.js + Tailwind Stack)

### What the blog confirms

- "When a design is ready to build, Claude packages everything into a handoff bundle that you can pass to Claude Code with a single instruction."
- Brilliant: "Including design intent in Claude Code handoffs has made the jump from prototype to production seamless."
- The design system is built by "reading your codebase" — implying it understands your tech stack.

### Assessment for Next.js + Tailwind

- If the design system is built from the project's codebase (which uses Next.js + Tailwind), the handoff bundle likely respects those conventions.
- "Design intent" in the handoff suggests Claude Code receives not just visual specs but semantic information (what each component does, interaction logic, state requirements).
- The handoff is described as a "single instruction" workflow — likely a command or file you pass to Claude Code that contains the full context.

### Practical workflow for this project:

1. Upload final GPT Image assets into an Asset Showcase project.
2. Export standalone HTML for review and use it as the asset QA checkpoint.
3. Create a Game Prototype project using only showcase-approved assets.
4. Point Claude Design at the hackathon-game codebase during onboarding once a Next.js/Tailwind app exists.
5. When the prototype is ready, use "Handoff to Claude Code" if available.
6. Claude Code receives the bundle and generates implementation scaffolding or references.
7. Treat generated code as a starting point, not production-ready output.

### What's uncertain:
- Whether the handoff generates React/Next.js components specifically or generic HTML
- Whether Tailwind classes are used in the output or if it generates custom CSS
- Whether the handoff preserves image asset references correctly
- The exact format of the "handoff bundle" (file? URL? clipboard?)

### Confidence level: MEDIUM

The feature exists and is praised by users. The specific output format for a Next.js + Tailwind project is not documented in the blog post.

---

## Additional Findings

### Technical Architecture (Inferred)

- Powered by Claude Opus 4.7 (most capable vision model)
- Outputs are code-based (HTML/CSS/JS) — not image renders
- Supports real-time collaboration (group conversations, shared editing)
- Organization-scoped access control

### Comparison to Alternatives

| Feature | Claude Design | v0 (Vercel) | Figma |
|---------|--------------|-------------|-------|
| Interactive prototypes | Yes | Yes (code) | Limited |
| Design system ingestion | From codebase | No | Manual |
| Multi-page navigation | Yes (inferred) | Per-component | Yes |
| Art asset upload | Yes | No | Yes |
| Code handoff | Native (Claude Code) | Copy code | Dev mode |
| Export HTML | Yes | Yes | No |
| Chinese text support | Via Opus 4.7 | Limited | Yes |

### Limitations / Risks for This Project

1. **Chinese text rendering**: The blog doesn't specifically mention CJK support in Design output. Opus 4.7 handles Chinese well in text, but CSS font rendering in exported HTML may need manual font-family configuration.
2. **Ink painting aesthetic**: Claude Design likely excels at modern/clean UI. Achieving a traditional Chinese ink painting aesthetic in the structural UI (beyond background images) may require extensive prompting.
3. **Game state simulation**: Interactive prototypes may not support complex state logic (e.g., stat changes affecting available actions). Navigation between screens is likely supported; conditional logic may not be.
4. **Research preview status**: As an Anthropic Labs product in research preview, features may change and stability is not guaranteed.

---

## Sources

- [Official blog post](https://www.anthropic.com/news/claude-design-anthropic-labs) — Apr 17, 2026
- [Anthropic pricing page](https://www.anthropic.com/pricing) — plan comparison
- Support documentation: Not yet publicly indexed (articles return 404)

## Caveats / Not Found

- No detailed support documentation found (support.claude.com articles return "page doesn't exist")
- No engineering blog post about Claude Design internals found
- Specific token/quota numbers not published
- Handoff bundle format not documented
- No information on whether the tool has been tested with game UI specifically
- All "assessment" sections contain inference based on the blog post language and testimonials, not direct documentation
