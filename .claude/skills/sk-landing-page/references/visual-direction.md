# Visual direction

## Follow the brief and existing brand

Resolve color, typography, layout, and imagery individually. Apply explicit user instructions and relevant design references first. For choices the brief leaves open, use the existing landing page, brand guidance such as `DESIGN.md`, or established design tokens. Propose a direction for the remaining choices based on the intended reader, the hero message, and the assets available.

For example, if the user specifies an orange accent, start with that accent and keep the project's typography and layout where they fit the request. If an exact brand color has low contrast with white button text, choose a contrasting foreground or use the color as an accent and give the button a stronger treatment. For scoped edits, keep decisions outside the requested changes.

## Pick a direction that supports the content

These are starting points for projects without brand guidance. Each pairs a palette with a way to show the material the reader needs to see. Choose one direction and adapt it to the brief.

| When it fits | Example palette | Typography and composition | What to show |
| --- | --- | --- | --- |
| Agent skill with a short, demonstrable workflow | Violet `#6D28D9`, cool off-white `#F8FAFC`, ink `#0F172A` | A clear sans serif, a strong headline, and a compact prompt-and-result layout | A real prompt and a representative output grounded in the skill's instructions or examples |
| SaaS with a visual product workflow | Blue `#1D4ED8`, white `#FFFFFF`, slate `#0F172A` | A restrained product style with a sans serif such as Roboto and room for a legible product view | A real screenshot or a faithful diagram of the task and outcome |
| Repository whose value is easiest to see in use | Teal `#0F766E`, warm off-white `#FAFAF9`, charcoal `#1C1917` | A documentation-inspired layout with sans-serif body text and monospace reserved for code | A real quickstart snippet, result, or existing project preview |
| Another offering whose story is easier to show in photos or examples | Rust `#9A3412`, cream `#FFF7ED`, dark brown `#292524` | An editorial layout with a distinct headline and generous space for a relevant image | Actual course materials, spaces, activities, or other subject-specific evidence where available |

Choose based on the presentation need rather than treating these palettes as conventions for an industry. A developer tool still benefits from readable body text and an actual example where appropriate. If product visuals are unavailable, use a faithful illustration of the workflow or benefit and avoid mock interfaces that imply unsupported features.

## Apply the direction

- Give the primary color a role, such as the CTA or selected emphasis. Define background, surface, text, and focus colors alongside it. Check contrast on the actual combinations, including CTA text, hover and focus states, and text over images or gradients.
- Use a consistent type scale and spacing, bound the reading width, and vary the composition by what each section needs to show. Keep decoration secondary to the message and controls.
- In chat, name the primary color and style and explain what they help the reader see or do. For example, “Teal on a light background, with a documentation-style layout that gives the install command and its output room to be read together.”

## Typography

- Choose the heading and body fonts for the actual copy. Follow the user's font choice or the project's brand first. For Vietnamese pages without an established font, start with one family such as Be Vietnam Pro for both headings and body. Use size, weight, and color to create hierarchy. Add a display serif only when its Vietnamese coverage is established and the pairing serves the page.
- Check language coverage for every family and style that renders text, including headings, emphasis, and any fallback. Check the actual font source or font files for the characters the copy uses. If coverage is unclear, use the established language-appropriate family for that role. Load only the weights and styles used, use `display=swap` for web fonts, and provide a readable fallback.
- Let hero text wrap naturally across viewport widths. Prefer breaks between phrases. Keep a deliberate break only if it reads well on both narrow and wide screens. Adjust text width, font size, and line height before tightening letter spacing. Give stacked accents room above the next line.
- When browser review is permitted, inspect the actual hero and other display text at desktop and mobile widths after fonts load. Look for detached or clipped accents, inconsistent glyphs, cramped spacing, and awkward one-word lines. Include this check in manual handoff when browser review is restricted.
- If a Vietnamese mark appears detached, such as in “nhiều” or “đầu mối,” inspect the font applied to that element. When replacing a problematic display font, find and update every use of its class or token, including section headings, demo panels, and the closing CTA.

## Full-width step bars

When a step bar spans a bordered panel, let equal-width buttons fill the bar and put horizontal padding inside each button. Apply the selected background and underline to that same button so both reach its column edges. Padding on the bar can leave a blank gutter beside the first or last selected step while the separator still spans the full panel.

Allow step labels to wrap on narrow screens and keep the focus indicator visible inside rounded or clipped panels. When browser review is permitted, inspect the first, middle, and last selected states at desktop and mobile widths.
