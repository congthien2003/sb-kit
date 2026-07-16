---
name: sk-create-slide
description: Create HTML presentations from ideas or convert PPT/PPTX files. Always asks user for theme (light/dark), detail level, and layout density before building.
metadata:
  origin: custom
---

# SK Create Slide

Create zero-dependency, animation-rich HTML presentations that run entirely in the browser.

## When to Activate

- Creating a talk deck, pitch deck, workshop deck, or internal presentation
- Converting `.ppt` / `.pptx` files into HTML
- Improving an existing HTML presentation

## Non-Negotiables

1. **Zero dependencies**: single HTML file, CSS + JS inline.
2. **Viewport fit**: every slide must fit inside one viewport with no internal scrolling.
3. **Ask before building**: always ask user for theme + detail level + density — never assume.
4. **Distinctive design**: avoid generic purple-gradient, Inter-on-white templates. Never use Inter, Roboto, Arial, or system fonts as the visual voice.
5. **Atmospheric depth**: no flat solid-color backgrounds — use gradient mesh, noise texture, grain overlay, geometric patterns, layered transparencies.
6. **Readable**: body text large enough, good contrast, no cramming.
7. **Bold creative vision**: every deck has its own personality, never repeat a formula. No generic AI aesthetic.

Before coding, read `STYLE_PRESETS.md` for the viewport-safe CSS base, density limits, preset catalog, and CSS gotchas.

## Design Thinking

Before writing code, commit to a CLEAR aesthetic direction:

- **Purpose**: What is this slide deck for? Pitch, teaching, report, keynote?
- **Tone**: Pick an extreme. There are many flavors:
  - Brutally minimal — stripped-down, nothing extra
  - Maximalist chaos — controlled overload
  - Retro-futuristic — nostalgic yet forward-looking
  - Organic / natural — warm, earthy, human
  - Luxury / refined — premium, elegant, restrained
  - Playful / toy-like — friendly, approachable, fun
  - Editorial / magazine — print-inspired, strong hierarchy
  - Brutalist / raw — unpolished, honest, bold
  - Art deco / geometric — symmetrical, ornate, structured
  - Industrial / utilitarian — functional, pragmatic, raw
  - Glassmorphism / liquid — translucent, soft, layered
  - Neo-brutalism — bold colors, thick black borders, hard shadows
  - Dark academia — classical, intellectual, moody
- **Differentiation**: What makes this deck UNFORGETTABLE? What's the one detail people will remember?
- **Typography**: Always pair a distinctive display font + a refined body font. **Forbidden: Inter, Roboto, Arial, Space Grotesk (overused), system fonts.**
- **Color**: Dominant color at 60-70% + sharp accent at 10-15% — no timid evenly-distributed palettes.
- **Motion**: One big orchestrated moment per slide (staggered reveal) > scattered micro-interactions. Use scroll-triggering and surprising hover states.

**CRITICAL**: Commit to a clear direction and execute it with precision. Bold maximalism and refined minimalism both work — the key is **intentionality**, not intensity.

## Workflow

### 1. Detect Mode

Choose one of three:
- **New presentation**: user has a topic, notes, or draft
- **PPT conversion**: user has a `.ppt` / `.pptx` file
- **Enhancement**: user already has HTML slides and wants improvements

### 2. Discover Content

Ask only the minimum:
- Purpose: pitch, teaching, conference talk, internal report
- Length: short (5-10), medium (10-20), long (20+)
- Content state: finished copy, rough notes, topic only

If the user has content, ask them to paste it before styling.

### 3. Gather Preferences (MANDATORY)

Always ask the user these 3 questions before selecting a style preset:

#### a) Theme (Light / Dark)
Ask: **"Do you want a light or dark theme?"**

| Option | Description |
|--------|-------------|
| **Dark** | Dark background, light text — great for tech, AI, powerful keynotes |
| **Light** | Light background, dark text — great for reports, education, corporate |

Based on the answer, pick a matching preset from `STYLE_PRESETS.md`.

#### b) Detail Level
Ask: **"What level of detail do you want?"**

| Option | Description |
|--------|-------------|
| **Concise** | Key points only, 3-4 bullets/slide, short sentences |
| **Moderate** | Some explanation, 4-5 bullets/slide |
| **Detailed** | Full explanations, examples, sub-text |

#### c) Layout Density (per slide)
Ask: **"How dense should the layout be?"**

| Option | Description |
|--------|-------------|
| **Spacious** | 1 heading + 2-3 items, generous whitespace, 2-3 cards max |
| **Moderate** | 1 heading + 4-5 bullets, 4 cards max |
| **Dense** | 1 heading + 5-6 bullets, 6 cards max |

Combine the 3 choices → determine the density config for slides.

### 4. Explore Style

If the user already knows their preferred preset → use it directly, skip previews.

Otherwise:
1. Based on theme (light/dark) and mood → map to a preset from `STYLE_PRESETS.md`
2. Generate **3 single-slide preview files** in `.ecc-design/slide-previews/`
3. Each preview must be self-contained, clearly show typography/color/motion, and stay under ~100 lines of slide content
4. Ask the user which preview to keep or what elements to mix

### 5. Build the Presentation

Output:
- `presentation.html`
- or `[presentation-name].html`

Use an `assets/` folder only when the deck contains user-supplied images.

Required structure:
- Semantic slide sections
- Viewport-safe CSS base from `viewport-base.css`
- CSS custom properties for theme values (light/dark)
- `--body-size` minimum: `clamp(0.85rem, 1.6vw, 1.2rem)` — **do not go smaller**
- Presentation controller class for keyboard, wheel, and touch navigation
- Intersection Observer for reveal animations
- `prefers-reduced-motion` support

### 6. Enforce Viewport Fit

Treat this as a hard gate — check carefully:

- Every `.slide` must use `height: 100vh; height: 100dvh; overflow: hidden;`
- All type and spacing must scale with `clamp()`
- When content doesn't fit, split into multiple slides
- Never solve overflow by shrinking text below readable sizes
- Never allow scrollbars inside a slide

### 7. Validate

Check the finished deck at these sizes:
- 1920×1080
- 1280×720
- 768×1024
- 375×667
- 667×375

### 8. Deliver

At handoff:
- Delete temporary preview files unless the user wants to keep them
- Open the deck with the platform-appropriate command
- Summarize: file path, preset used, slide count, and easy theme customization points

Open the file per OS:
- macOS: `open file.html`
- Linux: `xdg-open file.html`
- Windows: `start "" file.html`

## PPT / PPTX Conversion

1. Use `python3` + `python-pptx` to extract text, images, and notes
2. If `python-pptx` is unavailable, ask whether to install it or fall back to a manual export
3. Preserve slide order, speaker notes, and extracted assets
4. After extraction, run the same style-selection workflow as a new presentation

Cross-platform. Don't rely on macOS-only tools when Python can do the job.

## Implementation Requirements

### HTML / CSS

- CSS + JS inline in a single file. Only split into separate files if the user asks.
- Fonts: Google Fonts or Fontshare. **Always pair a distinctive display font + a refined body font.** Never use Inter, Roboto, Arial, Space Grotesk, or system fonts.
- Backgrounds with depth: gradient mesh (multiple layered radial gradients), noise texture (inline SVG), grain overlay, geometric patterns (grid, dot, diagonal), layered transparencies.
- **No solid color background** — always add at least 1 layer of texture/gradient/noise.
- Clear type hierarchy, use strong font-size contrast between heading and body.
- Spatial composition: asymmetry, overlap, diagonal flow, grid-breaking elements. Generous negative space OR controlled density — no middle ground.
- Use abstract shapes, decorative borders, custom dividers — no illustrations.

### Color & Theme

- Use CSS variables for the entire color system.
- **Dominant color 60-70%** (backgrounds, large surfaces) + **sharp accent 10-15%** (CTAs, highlights, borders). No timid evenly-distributed palettes.
- 1-2 accent colors maximum. Each accent gets a glow/shadow variant.
- Light theme: warm off-white background (never pure white), dark text, saturated accent.
- Dark theme: deep off-black background (never pure black), light text, neon/saturated accent.
- `--text-secondary` must meet contrast ratio ≥ 4.5:1 against background.

### Motion & Animation

- **One big orchestrated moment per slide** (staggered reveal on scroll-into-view) > many scattered micro-interactions.
- Use `animation-delay` stagger for `.reveal:nth-child(n)` — creates a professionally choreographed feel.
- Scroll-triggered reveals (Intersection Observer) are the primary animation. Surprising hover states: scale, glow, border-color shift.
- CSS-only animations preferred. No external libraries needed.
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) for reveals. `cubic-bezier(0.34, 1.56, 0.64, 1)` (back-out) for subtle bounce.
- Transition duration: 0.4–0.8s. Never too slow (annoying), never too fast (loses dramatic effect).
- Particles, glow pulse, floating orbs for background ambient motion — subtle, not distracting.

### Typography — Readability First

**`--body-size` minimum: `clamp(0.85rem, 1.6vw, 1.2rem)`**

- Body text must not drop below 0.85rem on mobile
- `--text-secondary` must have contrast ratio ≥ 4.5:1 against background
- Body line-height: 1.5–1.6
- Card descriptions must be large enough to read comfortably — no "footnote" feel

### JavaScript

Required:
- Keyboard navigation
- Touch / swipe navigation
- Mouse wheel navigation
- Progress indicator or slide index
- Reveal-on-enter animation triggers

### Accessibility

- Semantic structure (`main`, `section`, `nav`)
- Readable contrast (WCAG AA minimum)
- Keyboard-only navigation fully functional
- Respect `prefers-reduced-motion`

## Density Limits (Per User Preference)

Apply based on the user's choice from step 3:

| Slide type | Spacious | Moderate | Dense |
|------------|----------|----------|-------|
| Title | 1 heading + 1 subtitle | + optional tagline | + date/author line |
| Content | 2-3 bullets | 4-5 bullets | 5-6 bullets |
| Feature grid | 2-3 cards | 4 cards | 6 cards max |
| Code | 5-7 lines | 8-10 lines | 10-12 lines |
| Quote | 1 quote + attribution | + context line | 2 quotes |

## Anti-Patterns

- Generic startup gradient, no identity
- Solid color background — every slide needs at least 1 layer of texture/gradient/noise
- System font deck (Inter, Roboto, Arial, Space Grotesk as the visual voice)
- Timid color palette — evenly distributed colors, no dominant
- Bullet walls
- Code blocks that need scrolling
- Fixed-height boxes that break on short screens
- Invalid CSS like `-clamp(...)`
- **Body text too small** — the most common mistake
- Scattered micro-interactions instead of one orchestrated reveal moment
- Boring font pairs (two similar sans-serifs, or display + body too safe)

## Deliverable Checklist

- [ ] Presentation runs from a local file in a browser
- [ ] Every slide fits the viewport without scrolling
- [ ] Style is distinctive and intentional
- [ ] Animation is meaningful, not noisy
- [ ] Reduced motion is respected
- [ ] Body text is large enough and easy to read
- [ ] User was asked for theme + detail + density before building
- [ ] File paths and customization points are documented at handoff
