# Production Queue — ChatGPT Web Image Prompts

> Copy these prompts into ChatGPT web after uploading the approved art-bible reference images. Prompts are English-only and assume the current style anchors are:
>
> - `reference-01-style-board.png`
> - `reference-02-character-scholar.png`
> - `reference-03-scene-exam-hall.png`
> - `reference-04-ui-frame.png`

## How to Use This Queue

1. Upload the four art-bible reference images in the ChatGPT conversation.
2. Send the setup prompt once.
3. Send each asset prompt one at a time.
4. After each acceptable image, save it under the suggested output path.
5. Log the selected image in `public/assets/_prompts/generation-log.jsonl`.

Do not chase perfect 4K if ChatGPT web returns a lower download size. These prompts ask for 4K/highest available resolution, but the practical goal is style consistency and usable composition.

## Claude Design Readiness

You do **not** need every asset before Claude Design.

Minimum for Asset Showcase:
- 4 art-bible references
- 2 scene backgrounds
- 1 character portrait
- 1 UI frame or blank seal

Recommended for Game Prototype:
- `public/assets/scenes/study-room.png`
- `public/assets/scenes/examination-hall.png`
- `public/assets/scenes/imperial-court.png`
- `public/assets/scenes/village.png`
- `public/assets/characters/scholar-young.png`
- `public/assets/characters/scholar-old.png` or `public/assets/characters/mentor.png`
- `public/assets/ui/borders/scroll-frame.png`
- `public/assets/ui/stamps/seal-blank-red.png`
- action icons can be placeholders in the first Claude Design pass

Moments can be generated after the first prototype. They are showcase/demo polish, not a blocker for the UI flow.

---

## 00. Setup Prompt

```text
Use the uploaded four images as strict art bible references for all future generations.

Project: "The Epochal Laurel" / "百世流芳", a Chinese imperial-examination generational roguelike.

Keep these consistent across every output:
- aged xuan paper texture
- visible ink bleeding and natural brush grain
- restrained historical mood
- muted gold and vermillion accents
- dark ink linework
- generous negative space for UI overlays
- Chinese colored ink wash for scenes and key moments
- Chinese historical woodblock-print / lianhuanhua line art for characters
- dark parchment and antique manuscript styling for UI decorations

Do not render readable Chinese text inside the image.
Leave scrolls, banners, seals, plaques, and title areas blank for later HTML/SVG text overlay.
Avoid anime, manga, photorealism, 3D render, modern fantasy UI, neon colors, and glossy mobile-game aesthetics.
Generate at 4K or the highest available resolution.
```

---

## Phase 1 — Scene Backgrounds

### 01. Study Room

Suggested output: `public/assets/scenes/study-room.png`

```text
Using the uploaded art bible references as strict style anchors, create a production scene background for "The Epochal Laurel".

Asset: Study Room / Daily Loop background.

Scene:
A scholar's private study room at night, candlelight illuminating stacked books, an ink stone, brushes, and a wooden desk. Bamboo is visible through a lattice window. A few hanging calligraphy scrolls are present, but all writing must be blank or unreadable decorative texture.

Style:
Chinese colored ink wash painting on aged xuan paper, atmospheric and restrained, visible brush texture, natural ink bleeding, muted gold candlelight, deep ink shadows, small vermillion accents.

Composition:
4K landscape, 16:9, highest available resolution. Leave the upper 25 percent as quiet negative space for future UI overlay. Keep the foreground readable but not cluttered.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 02. Examination Hall

Suggested output: `public/assets/scenes/examination-hall.png`

```text
Using the uploaded art bible references as strict style anchors, create a production scene background for "The Epochal Laurel".

Asset: Examination Hall / Exam phase background.

Scene:
A traditional Chinese imperial examination hall at dawn, with long rows of narrow wooden examination cubicles receding into mist. Paper lanterns glow softly. A few desks show blank papers, ink stones, and brushes. Architecture should feel historically inspired but not archaeologically strict.

Style:
Chinese colored ink wash painting on aged xuan paper, atmospheric mist, visible brush strokes, muted gold lantern light, deep ink linework, restrained vermillion architectural accents.

Composition:
4K landscape, 16:9, highest available resolution. Preserve wide negative space in the upper 25 percent for UI overlays. The cubicle rows should create depth and exam pressure.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 03. Imperial Court

Suggested output: `public/assets/scenes/imperial-court.png`

```text
Using the uploaded art bible references as strict style anchors, create a production scene background for "The Epochal Laurel".

Asset: Imperial Court / Palace Exam background.

Scene:
A grand imperial throne hall seen from a distance, vast and intimidating. Vermillion pillars, muted gold beams, dragon-like decorative motifs, and a distant elevated throne silhouette. The floor should feel spacious enough for four final candidates to kneel before the emperor.

Style:
Chinese colored ink wash painting on aged xuan paper, dramatic but restrained, deep ink shadows, muted gold light, vermillion accents, atmospheric haze, visible brush texture.

Composition:
4K landscape, 16:9, highest available resolution. Keep the center and upper area spacious enough for UI panels and ranking overlays. Make the architecture feel powerful without becoming too busy.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 04. Village

Suggested output: `public/assets/scenes/village.png`

```text
Using the uploaded art bible references as strict style anchors, create a production scene background for "The Epochal Laurel".

Asset: Village / Inheritance and home background.

Scene:
A quiet rural Chinese village at sunset, with thatched-roof houses, willow trees, distant mountains fading into mist, and a winding path leading to a modest family compound. The mood is pastoral, bittersweet, and generational.

Style:
Chinese colored ink wash painting on aged xuan paper, warm muted gold sunset, soft ink wash mountains, restrained vermillion details, natural brush texture, calm negative space.

Composition:
4K landscape, 16:9, highest available resolution. Keep the upper 30 percent open and atmospheric for future UI overlay. The village should feel intimate, not crowded.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 05. Study Room — Invasion Era Variant

Suggested output: `public/assets/scenes/study-room--invasion.png`

```text
Using the uploaded art bible references as strict style anchors, create an invasion-era variant of the Study Room scene.

Asset: Study Room / Invasion era variant.

Scene:
The same scholar's private study room, now under wartime pressure. The candle burns low. Books and papers are slightly disordered. Smoke-grey light enters through the lattice window. Bamboo outside bends in harsh wind. The room still feels scholarly, but fragile.

Style:
Chinese colored ink wash painting on aged xuan paper, charcoal black and smoke grey dominant, blood-red or vermillion accents only in small touches, heavier splash ink, dry brush texture, anxious atmosphere.

Composition:
4K landscape, 16:9, highest available resolution. Preserve the upper 25 percent as negative space for UI overlays.

Constraints:
No readable Chinese text. No explicit gore. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 06. Village — Invasion Era Variant

Suggested output: `public/assets/scenes/village--invasion.png`

```text
Using the uploaded art bible references as strict style anchors, create an invasion-era variant of the Village scene.

Asset: Village / Invasion era variant.

Scene:
A rural Chinese village under wartime tension. Some distant smoke, damaged fences, wind-blown trees, and empty paths. The family compound still stands, but the mood is fragile and uncertain.

Style:
Chinese colored ink wash painting on aged xuan paper, charcoal black and smoke grey dominant, restrained blood-red accents, heavy splash ink in the sky and trees, dry brush texture, urgent but not melodramatic.

Composition:
4K landscape, 16:9, highest available resolution. Keep upper 30 percent atmospheric and open for UI overlays. Avoid overcrowding the image with people.

Constraints:
No readable Chinese text. No explicit gore. No modern objects. No anime, manga, 3D render, or photorealism.
```

---

## Phase 2 — Character Portraits

### 07. Scholar — Young

Suggested output: `public/assets/characters/scholar-young.png`

```text
Using the uploaded art bible references as strict style anchors, create a production character portrait for "The Epochal Laurel".

Asset: Young Scholar protagonist.

Character:
A young Chinese scholar, age 18-25, hopeful and determined. He wears an indigo scholar robe with a white inner collar and a traditional scholar cap. Ink-stained fingers, a folded book or scroll, and a modest literati bearing.

Style:
Chinese historical woodblock-print / lianhuanhua portrait style, bold ink outlines, calligraphic line weight variation, light color wash, aged xuan paper texture.

Composition:
4K portrait, vertical composition, highest available resolution. Half-body portrait facing slightly left. Plain aged parchment background suitable for later cropping or masking.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 08. Scholar — Middle-Aged

Suggested output: `public/assets/characters/scholar-middle.png`

```text
Using the uploaded art bible references as strict style anchors, create a production character portrait for "The Epochal Laurel".

Asset: Middle-aged Scholar protagonist.

Character:
A middle-aged Chinese scholar, age 35-45, tired but resolute. He wears a slightly worn indigo scholar robe with patched sleeve, white inner collar, and scholar cap. Ink-stained fingers, slight stubble, weary eyes, and restrained dignity.

Style:
Chinese historical woodblock-print / lianhuanhua portrait style, bold ink outlines, calligraphic line weight variation, light color wash, aged xuan paper texture.

Composition:
4K portrait, vertical composition, highest available resolution. Half-body portrait facing slightly left. Plain aged parchment background suitable for later cropping or masking.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 09. Scholar — Old

Suggested output: `public/assets/characters/scholar-old.png`

```text
Using the uploaded art bible references as strict style anchors, create a production character portrait for "The Epochal Laurel".

Asset: Elderly Scholar protagonist.

Character:
An elderly Chinese scholar, age 55-65, white beard and hair, wise but tired eyes, peaceful resignation. He wears a threadbare grey-blue scholar robe with many patches and a simple cloth cap. His hands are old and ink-stained.

Style:
Chinese historical woodblock-print / lianhuanhua portrait style, bold ink outlines, calligraphic line weight variation, light color wash, aged xuan paper texture.

Composition:
4K portrait, vertical composition, highest available resolution. Half-body portrait facing slightly left. Plain aged parchment background suitable for later cropping or masking.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 10. Examiner — Strict

Suggested output: `public/assets/characters/examiner-strict.png`

```text
Using the uploaded art bible references as strict style anchors, create a production character portrait for "The Epochal Laurel".

Asset: Strict imperial examination official.

Character:
A stern Chinese examination official with sharp angular features, piercing judgmental eyes, thin pressed lips, and an intimidating posture. He wears a dark official robe and black official hat, holding a writing brush like an instrument of judgment.

Style:
Chinese historical woodblock-print / lianhuanhua portrait style, bold ink outlines, calligraphic line weight variation, restrained dark color wash, aged xuan paper texture.

Composition:
4K portrait, vertical composition, highest available resolution. Half-body portrait facing slightly right. Plain aged parchment background suitable for later cropping or masking.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 11. Examiner — Corrupt

Suggested output: `public/assets/characters/examiner-corrupt.png`

```text
Using the uploaded art bible references as strict style anchors, create a production character portrait for "The Epochal Laurel".

Asset: Corrupt imperial examination official.

Character:
A corrupt Chinese examination official with a round fleshy face, sly half-lidded eyes, and a knowing smirk. He wears a dark official robe with subtle gold-thread accents and a black official hat slightly askew. A jade ring or small luxury detail hints at hidden wealth.

Style:
Chinese historical woodblock-print / lianhuanhua portrait style, bold ink outlines, calligraphic line weight variation, restrained dark color wash, aged xuan paper texture.

Composition:
4K portrait, vertical composition, highest available resolution. Half-body portrait facing slightly right. Plain aged parchment background suitable for later cropping or masking.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 12. Mentor

Suggested output: `public/assets/characters/mentor.png`

```text
Using the uploaded art bible references as strict style anchors, create a production character portrait for "The Epochal Laurel".

Asset: Kindly elderly mentor.

Character:
A kindly elderly Chinese teacher with warm crinkled eyes, long white beard, simple worn robe, and stacks of books nearby. He rests one hand on an open blank text and looks encouraging but realistic.

Style:
Chinese historical woodblock-print / lianhuanhua portrait style, bold ink outlines, calligraphic line weight variation, warm brown light color wash, aged xuan paper texture.

Composition:
4K portrait, vertical composition, highest available resolution. Half-body portrait facing slightly left. Plain aged parchment background suitable for later cropping or masking.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 13. Rival — Arrogant

Suggested output: `public/assets/characters/rival-arrogant.png`

```text
Using the uploaded art bible references as strict style anchors, create a production character portrait for "The Epochal Laurel".

Asset: Arrogant rival scholar.

Character:
A young arrogant Chinese rival scholar with a handsome sharp face, raised chin, condescending smirk, and expensive robe. He wears a more ornate scholar cap with a small jade ornament and holds a fine brush with casual confidence.

Style:
Chinese historical woodblock-print / lianhuanhua portrait style, bold ink outlines, calligraphic line weight variation, rich blue-green light color wash, aged xuan paper texture.

Composition:
4K portrait, vertical composition, highest available resolution. Half-body portrait facing slightly right. Plain aged parchment background suitable for later cropping or masking.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 14. Rival — Cunning

Suggested output: `public/assets/characters/rival-cunning.png`

```text
Using the uploaded art bible references as strict style anchors, create a production character portrait for "The Epochal Laurel".

Asset: Cunning rival scholar.

Character:
A cunning Chinese rival scholar with a thin face, narrow calculating eyes, slight knowing smile, and hands hidden in sleeves. His robe is plain but well-made, dark grey-green, suggesting careful concealment of status and ambition.

Style:
Chinese historical woodblock-print / lianhuanhua portrait style, bold ink outlines, calligraphic line weight variation, restrained grey-green color wash, aged xuan paper texture.

Composition:
4K portrait, vertical composition, highest available resolution. Half-body portrait facing slightly right. Plain aged parchment background suitable for later cropping or masking.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 15. Spouse

Suggested output: `public/assets/characters/spouse.png`

```text
Using the uploaded art bible references as strict style anchors, create a production character portrait for "The Epochal Laurel".

Asset: Spouse character portrait.

Character:
A gentle Chinese woman with a soft oval face, kind steady eyes, married woman's hairstyle with a simple silver hairpin, modest neat clothing, and quiet strength. She may hold embroidery or fold her hands calmly.

Style:
Chinese historical woodblock-print / lianhuanhua portrait style, bold ink outlines, calligraphic line weight variation, soft green light color wash, aged xuan paper texture.

Composition:
4K portrait, vertical composition, highest available resolution. Half-body portrait facing slightly left. Plain aged parchment background suitable for later cropping or masking.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

---

## Phase 3 — UI Decorations

### 16. Scroll Frame

Suggested output: `public/assets/ui/borders/scroll-frame.png`

```text
Using the uploaded art bible references as strict style anchors, create a production UI decoration for "The Epochal Laurel".

Asset: Scroll frame / parchment panel border.

Design:
A traditional Chinese scroll-frame panel on dark aged xuan paper or silk. Thin muted-gold decorative border lines, cloud motif corners, subtle vermillion accent marks, blank dark center area for content overlay.

Style:
Antique manuscript UI, dark parchment base, visible paper grain, restrained gold and vermillion accents, clean decorative linework.

Composition:
4K landscape, 16:9, highest available resolution. The center must remain blank and dark enough for readable cream/gold HTML text overlays. Edges should be clean enough for slicing or CSS masking.

Constraints:
No readable Chinese text. No ornate clutter in the content area. No modern UI gloss, neon, 3D, or mobile-game style.
```

### 17. Blank Red Seal

Suggested output: `public/assets/ui/stamps/seal-blank-red.png`

```text
Using the uploaded art bible references as strict style anchors, create a production UI decoration for "The Epochal Laurel".

Asset: Blank vermillion seal stamp.

Design:
A traditional Chinese seal-stamp ink impression in vermillion red, square format, authentic uneven pressure, ink bleeding at the edges, slightly imperfect stamp texture. The center should remain blank or abstract so readable text can be added later.

Style:
Antique seal impression on plain matte white background for background removal. Strong silhouette, clean enough for UI use.

Composition:
4K square, maximum available square resolution.

Constraints:
No readable Chinese text. No actual characters. No modern logo style. No 3D embossing.
```

### 18. Blank Grey Seal

Suggested output: `public/assets/ui/stamps/seal-blank-grey.png`

```text
Using the uploaded art bible references as strict style anchors, create a production UI decoration for "The Epochal Laurel".

Asset: Blank grey-black failure seal stamp.

Design:
A traditional Chinese seal-stamp ink impression in grey-black ink, square format, authentic uneven pressure, dry ink texture, slightly faded and somber. The center should remain blank or abstract so readable text can be added later.

Style:
Antique seal impression on plain matte white background for background removal. Strong silhouette, clean enough for UI use.

Composition:
4K square, maximum available square resolution.

Constraints:
No readable Chinese text. No actual characters. No modern logo style. No 3D embossing.
```

### 19. Simple Ink Divider

Suggested output: `public/assets/ui/dividers/ink-divider-simple.png`

```text
Using the uploaded art bible references as strict style anchors, create a production UI decoration for "The Epochal Laurel".

Asset: Simple horizontal ink divider.

Design:
A single expressive horizontal black ink brush stroke, natural taper at both ends, wet ink bleeding, visible dry-brush texture, elegant and restrained.

Style:
Chinese calligraphy brush texture on plain matte white background for background removal.

Composition:
4K wide source image, 3:1 ratio, highest available resolution, intended to be cropped into a thin divider.

Constraints:
No readable Chinese text. No symbols. No frame. No modern vector perfection.
```

### 20. Decorative Ink Divider

Suggested output: `public/assets/ui/dividers/ink-divider-plum.png`

```text
Using the uploaded art bible references as strict style anchors, create a production UI decoration for "The Epochal Laurel".

Asset: Decorative horizontal ink divider.

Design:
A horizontal black ink brush stroke divider with a small plum blossom silhouette at the center, natural taper at both ends, wet ink bleeding, visible dry-brush texture, subtle vermillion accent on one or two petals.

Style:
Chinese calligraphy brush texture on plain matte white background for background removal.

Composition:
4K wide source image, 3:1 ratio, highest available resolution, intended to be cropped into a thin divider.

Constraints:
No readable Chinese text. No symbols beyond the small plum blossom motif. No modern vector perfection.
```

### 21. Action Icon — Study

Suggested output: `public/assets/ui/icons/action-study.png`

```text
Using the uploaded art bible references as strict style anchors, create a production game action icon.

Asset: Study action icon.

Design:
An open book with a candle flame above it, simple iconic composition, bold ink brush strokes, warm amber highlight on the flame, circular dark parchment inner field.

Style:
Chinese ink painting miniature icon, readable at 64px, clear silhouette, aged paper texture.

Composition:
4K square, maximum available square resolution.

Constraints:
No readable Chinese text. No modern flat app icon style. No glossy 3D.
```

### 22. Action Icon — Socialize

Suggested output: `public/assets/ui/icons/action-socialize.png`

```text
Using the uploaded art bible references as strict style anchors, create a production game action icon.

Asset: Socialize action icon.

Design:
Two wine cups touching in a toast, simple iconic composition, bold ink brush strokes, small jade-green highlight on the cups, circular dark parchment inner field.

Style:
Chinese ink painting miniature icon, readable at 64px, clear silhouette, aged paper texture.

Composition:
4K square, maximum available square resolution.

Constraints:
No readable Chinese text. No modern flat app icon style. No glossy 3D.
```

### 23. Action Icon — Earn

Suggested output: `public/assets/ui/icons/action-earn.png`

```text
Using the uploaded art bible references as strict style anchors, create a production game action icon.

Asset: Earn action icon.

Design:
A traditional Chinese abacus with a few coins, simple iconic composition, bold ink brush strokes, muted gold highlight on the coins, circular dark parchment inner field.

Style:
Chinese ink painting miniature icon, readable at 64px, clear silhouette, aged paper texture.

Composition:
4K square, maximum available square resolution.

Constraints:
No readable Chinese text. No modern flat app icon style. No glossy 3D.
```

### 24. Action Icon — Rest

Suggested output: `public/assets/ui/icons/action-rest.png`

```text
Using the uploaded art bible references as strict style anchors, create a production game action icon.

Asset: Rest action icon.

Design:
A steaming tea cup with rising steam wisps, simple iconic composition, bold ink brush strokes, soft warm highlight on the steam, circular dark parchment inner field.

Style:
Chinese ink painting miniature icon, readable at 64px, clear silhouette, aged paper texture.

Composition:
4K square, maximum available square resolution.

Constraints:
No readable Chinese text. No modern flat app icon style. No glossy 3D.
```

### 25. Action Icon — Scheme

Suggested output: `public/assets/ui/icons/action-scheme.png`

```text
Using the uploaded art bible references as strict style anchors, create a production game action icon.

Asset: Scheme action icon.

Design:
A shadowed figure whispering behind a folding fan, simple iconic composition, bold ink brush strokes, deep muted vermillion highlight on the fan, circular dark parchment inner field.

Style:
Chinese ink painting miniature icon, readable at 64px, clear silhouette, aged paper texture.

Composition:
4K square, maximum available square resolution.

Constraints:
No readable Chinese text. No modern flat app icon style. No glossy 3D.
```

---

## Phase 4 — Key Moment Illustrations

### 26. Exam Pass

Suggested output: `public/assets/moments/exam-pass.png`

```text
Using the uploaded art bible references as strict style anchors, create a dramatic key moment illustration for "The Epochal Laurel".

Asset: Exam pass / celebration moment.

Scene:
A messenger on horseback arrives at a humble village home, waving a blank red banner announcing success. Family members rush out in disbelief and joy. Firecrackers explode in muted vermillion and gold. Neighbors gather around the path.

Style:
Full Chinese colored ink wash illustration on aged xuan paper, expressive brush strokes, dramatic diagonal composition, rich but restrained vermillion and muted gold accents.

Composition:
4K landscape, 16:9, highest available resolution. Leave a blank banner or scroll area for later text overlay.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 27. Exam Fail

Suggested output: `public/assets/moments/exam-fail.png`

```text
Using the uploaded art bible references as strict style anchors, create a dramatic key moment illustration for "The Epochal Laurel".

Asset: Exam fail / dejection moment.

Scene:
A solitary scholar walks away from the examination hall in rain, shoulders hunched, umbrella lowered or dropped. The grand hall fades into grey mist behind him. Distant successful candidates are only vague silhouettes.

Style:
Full Chinese colored ink wash illustration on aged xuan paper, muted grey-blue palette, heavy rain as bold ink strokes, deep melancholy, restrained color.

Composition:
4K landscape, 16:9, highest available resolution. Keep enough negative space for later UI text overlay.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 28. Inheritance

Suggested output: `public/assets/moments/inheritance.png`

```text
Using the uploaded art bible references as strict style anchors, create a dramatic key moment illustration for "The Epochal Laurel".

Asset: Inheritance / father-to-son moment.

Scene:
An elderly scholar on his deathbed passes a worn blank book to his young son. Candlelight is the main illumination. The father's weathered hand reaches out; the son's small hands receive the book with reverence. The mood is solemn and bittersweet.

Style:
Full Chinese colored ink wash illustration on aged xuan paper, warm amber candlelight against deep ink shadows, intimate composition, visible brush texture.

Composition:
4K landscape, 16:9, highest available resolution. Keep a quiet dark area for later UI overlay if needed.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 29. Scheme Exposure

Suggested output: `public/assets/moments/scheme-exposure.png`

```text
Using the uploaded art bible references as strict style anchors, create a dramatic key moment illustration for "The Epochal Laurel".

Asset: Scheme exposure / scandal moment.

Scene:
An official points accusingly at a scholar whose hidden cheat notes are scattered on the floor. Other scholars recoil in shock. The exposed scholar freezes in terror. A large blank red seal-stamp shape overlays the scene semi-transparently, with no readable characters.

Style:
Full Chinese colored ink wash illustration on aged xuan paper, harsh red and black contrast, aggressive brush strokes, dramatic shameful atmosphere.

Composition:
4K landscape, 16:9, highest available resolution. Leave the seal blank for later text overlay.

Constraints:
No readable Chinese text. No explicit gore. No modern objects. No anime, manga, 3D render, or photorealism.
```

### 30. Palace Exam

Suggested output: `public/assets/moments/palace-exam.png`

```text
Using the uploaded art bible references as strict style anchors, create a dramatic key moment illustration for "The Epochal Laurel".

Asset: Palace Exam / emperor's court moment.

Scene:
Four scholars kneel before a distant emperor's throne in a vast palace hall. The candidates look small against massive vermillion pillars and muted gold architecture. The emperor is a distant silhouette of power.

Style:
Full Chinese colored ink wash illustration on aged xuan paper, imperial vermillion and muted gold palette, atmospheric haze, awe and pressure, visible brush texture.

Composition:
4K landscape, 16:9, highest available resolution. Keep enough open space for ranking UI overlay.

Constraints:
No readable Chinese text. No modern objects. No anime, manga, 3D render, or photorealism.
```
