# Style Presets Reference

Curated visual styles for `sk-create-slide`.

Use this file for:
- the mandatory viewport-fitting CSS base
- preset selection and mood mapping
- CSS gotchas and validation rules

Abstract shapes only. Avoid illustrations unless the user explicitly asks for them.

## Viewport Fit Is Non-Negotiable

Every slide must fully fit in one viewport.

### Golden Rule

```text
Each slide = exactly one viewport height.
Too much content = split into more slides.
Never scroll inside a slide.
```

### Density Limits (Configurable)

Pick based on user preference. Default = Moderate if user doesn't specify.

| Slide type | Spacious | Moderate | Dense |
|------------|--------|-----------|-------|
| Title slide | 1 heading + 1 subtitle | + optional tagline | + date/author line |
| Content slide | 2-3 bullets | 4-5 bullets | 5-6 bullets |
| Feature grid | 2-3 cards | 4 cards | 6 cards max |
| Code slide | 5-7 lines | 8-10 lines | 10-12 lines |
| Quote slide | 1 quote + attribution | + context line | 2 quotes |

## Mandatory Base CSS

Copy this block into every generated presentation and then theme on top of it.

```css
/* ===========================================
   VIEWPORT FITTING: MANDATORY BASE STYLES
   =========================================== */

html, body {
    height: 100%;
    overflow-x: hidden;
}

html {
    scroll-snap-type: y mandatory;
    scroll-behavior: smooth;
}

.slide {
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    overflow: hidden;
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    position: relative;
}

.slide-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    max-height: 100%;
    overflow: hidden;
    padding: var(--slide-padding);
}

:root {
    --title-size: clamp(1.5rem, 5vw, 4rem);
    --h2-size: clamp(1.25rem, 3.5vw, 2.5rem);
    --h3-size: clamp(1rem, 2.5vw, 1.75rem);
    --body-size: clamp(0.85rem, 1.6vw, 1.2rem);
    --small-size: clamp(0.75rem, 1.1vw, 0.9rem);

    --slide-padding: clamp(1rem, 4vw, 4rem);
    --content-gap: clamp(0.5rem, 2vw, 2rem);
    --element-gap: clamp(0.25rem, 1vw, 1rem);
}

.card, .container, .content-box {
    max-width: min(90vw, 1000px);
    max-height: min(80vh, 700px);
}

.feature-list, .bullet-list {
    gap: clamp(0.4rem, 1vh, 1rem);
}

.feature-list li, .bullet-list li {
    font-size: var(--body-size);
    line-height: 1.4;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
    gap: clamp(0.5rem, 1.5vw, 1rem);
}

img, .image-container {
    max-width: 100%;
    max-height: min(50vh, 400px);
    object-fit: contain;
}

@media (max-height: 700px) {
    :root {
        --slide-padding: clamp(0.75rem, 3vw, 2rem);
        --content-gap: clamp(0.4rem, 1.5vw, 1rem);
        --title-size: clamp(1.25rem, 4.5vw, 2.5rem);
        --h2-size: clamp(1rem, 3vw, 1.75rem);
    }
}

@media (max-height: 600px) {
    :root {
        --slide-padding: clamp(0.5rem, 2.5vw, 1.5rem);
        --content-gap: clamp(0.3rem, 1vw, 0.75rem);
        --title-size: clamp(1.1rem, 4vw, 2rem);
        --body-size: clamp(0.75rem, 1.2vw, 0.95rem);
    }

    .nav-dots, .keyboard-hint, .decorative {
        display: none;
    }
}

@media (max-height: 500px) {
    :root {
        --slide-padding: clamp(0.4rem, 2vw, 1rem);
        --title-size: clamp(1rem, 3.5vw, 1.5rem);
        --h2-size: clamp(0.9rem, 2.5vw, 1.25rem);
        --body-size: clamp(0.7rem, 1vw, 0.85rem);
    }
}

@media (max-width: 600px) {
    :root {
        --title-size: clamp(1.25rem, 7vw, 2.5rem);
    }

    .grid {
        grid-template-columns: 1fr;
    }
}

@media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
        animation-duration: 0.01ms !important;
        transition-duration: 0.2s !important;
    }

    html {
        scroll-behavior: auto;
    }
}
```

## Viewport Checklist

- every `.slide` has `height: 100vh`, `height: 100dvh`, and `overflow: hidden`
- all typography uses `clamp()`
- all spacing uses `clamp()` or viewport units
- images have `max-height` constraints
- grids adapt with `auto-fit` + `minmax()`
- short-height breakpoints exist at `700px`, `600px`, and `500px`
- if anything feels cramped, split the slide

## Mood to Preset Mapping

| Mood | Dark Presets | Light Presets |
|------|-------------|---------------|
| Impressed / Confident | Bold Signal, Dark Botanical | Electric Studio, Swiss Modern |
| Excited / Energized | Creative Voltage, Neon Cyber | Split Pastel, Pastel Geometry |
| Calm / Focused | Notebook Tabs, Terminal Green | Paper & Ink, Swiss Modern |
| Inspired / Moved | Dark Botanical, Vintage Editorial | Pastel Geometry, Paper & Ink |

## Preset Catalog

Each preset is tagged **[Dark]** or **[Light]** to match the user's chosen theme.

### 1. Bold Signal **[Dark]**

- Vibe: confident, high-impact, keynote-ready
- Best for: pitch decks, launches, statements
- Fonts: Archivo Black + Space Grotesk
- Palette: charcoal base, hot orange focal card, crisp white text
- Signature: oversized section numbers, high-contrast card on dark field

### 2. Electric Studio **[Light]**

- Vibe: clean, bold, agency-polished
- Best for: client presentations, strategic reviews
- Fonts: Manrope only
- Palette: white base, black text, saturated cobalt accent
- Signature: two-panel split and sharp editorial alignment

### 3. Creative Voltage **[Dark]**

- Vibe: energetic, retro-modern, playful confidence
- Best for: creative studios, brand work, product storytelling
- Fonts: Syne + Space Mono
- Palette: electric blue, neon yellow, deep navy
- Signature: halftone textures, badges, punchy contrast

### 4. Dark Botanical **[Dark]**

- Vibe: elegant, premium, atmospheric
- Best for: luxury brands, thoughtful narratives, premium product decks
- Fonts: Cormorant + IBM Plex Sans
- Palette: near-black, warm ivory, blush, gold, terracotta
- Signature: blurred abstract circles, fine rules, restrained motion

### 5. Notebook Tabs **[Dark]**

- Vibe: editorial, organized, tactile
- Best for: reports, reviews, structured storytelling
- Fonts: Bodoni Moda + DM Sans
- Palette: cream paper on charcoal with pastel tabs
- Signature: paper sheet, colored side tabs, binder details

### 6. Pastel Geometry **[Light]**

- Vibe: approachable, modern, friendly
- Best for: product overviews, onboarding, lighter brand decks
- Fonts: Plus Jakarta Sans only
- Palette: pale blue field, cream card, soft pink/mint/lavender accents
- Signature: vertical pills, rounded cards, soft shadows

### 7. Split Pastel **[Light]**

- Vibe: playful, modern, creative
- Best for: agency intros, workshops, portfolios
- Fonts: Outfit only
- Palette: peach + lavender split with mint badges
- Signature: split backdrop, rounded tags, light grid overlays

### 8. Vintage Editorial **[Dark]**

- Vibe: witty, personality-driven, magazine-inspired
- Best for: personal brands, opinionated talks, storytelling
- Fonts: Fraunces + Work Sans
- Palette: cream, charcoal, dusty warm accents
- Signature: geometric accents, bordered callouts, punchy serif headlines

### 9. Neon Cyber **[Dark]**

- Vibe: futuristic, techy, kinetic
- Best for: AI, infra, dev tools, future-of-X talks
- Fonts: Clash Display + Satoshi
- Palette: midnight navy, cyan, magenta
- Signature: glow, particles, grids, data-radar energy

### 10. Terminal Green **[Dark]**

- Vibe: developer-focused, hacker-clean
- Best for: APIs, CLI tools, engineering demos
- Fonts: JetBrains Mono only
- Palette: GitHub dark + terminal green
- Signature: scan lines, command-line framing, precise monospace rhythm

### 11. Swiss Modern **[Light]**

- Vibe: minimal, precise, data-forward
- Best for: corporate, product strategy, analytics
- Fonts: Archivo + Nunito
- Palette: white, black, signal red
- Signature: visible grids, asymmetry, geometric discipline

### 12. Paper & Ink **[Light]**

- Vibe: literary, thoughtful, story-driven
- Best for: essays, keynote narratives, manifesto decks
- Fonts: Cormorant Garamond + Source Serif 4
- Palette: warm cream, charcoal, crimson accent
- Signature: pull quotes, drop caps, elegant rules

### 13. Midnight teal **[Dark]**

- Vibe: calm, modern, tech-professional
- Best for: technical reports, architecture overviews, engineering talks
- Fonts: DM Sans + DM Mono
- Palette: deep teal-black, soft teal accent, warm gray text
- Signature: subtle wave gradients, clean card hierarchy, rounded corners

### 14. Warm Studio **[Light]**

- Vibe: warm, professional, approachable
- Best for: training slides, internal reports, team presentations
- Fonts: Lexend only
- Palette: warm white, dark brown text, amber accent
- Signature: soft shadows, rounded everything, welcoming feel

## Body Size Minimum

**All presets must use `--body-size` minimum: `clamp(0.85rem, 1.6vw, 1.2rem)`**

No preset may use body text smaller than this. Card descriptions, bullet text, paragraphs — all must use `--body-size`.

## Direct Selection Prompts

If the user already knows the style they want, let them pick directly from the preset names above instead of forcing preview generation.

## Animation Feel Mapping

| Feeling | Motion Direction |
|---------|------------------|
| Dramatic / Cinematic | slow fades, parallax, large scale-ins |
| Techy / Futuristic | glow, particles, grid motion, scramble text |
| Playful / Friendly | springy easing, rounded shapes, floating motion |
| Professional / Corporate | subtle 200-300ms transitions, clean slides |
| Calm / Minimal | very restrained movement, whitespace-first |
| Editorial / Magazine | strong hierarchy, staggered text and image interplay |

## CSS Gotcha: Negating Functions

Never write these:

```css
right: -clamp(28px, 3.5vw, 44px);
margin-left: -min(10vw, 100px);
```

Browsers ignore them silently.

Always write this instead:

```css
right: calc(-1 * clamp(28px, 3.5vw, 44px));
margin-left: calc(-1 * min(10vw, 100px));
```

## Validation Sizes

Test at minimum:
- Desktop: `1920x1080`, `1440x900`, `1280x720`
- Tablet: `1024x768`, `768x1024`
- Mobile: `375x667`, `414x896`
- Landscape phone: `667x375`, `896x414`

## Anti-Patterns

Do not use:
- purple-on-white startup templates
- Inter / Roboto / Arial as the visual voice unless the user explicitly wants utilitarian neutrality
- bullet walls, tiny type, or code blocks that require scrolling
- decorative illustrations when abstract geometry would do the job better
