---
name: sk-visualizer
description: Convert a short prompt or existing conversation material into a single readable HTML visualization. Use when the user asks for an HTML mockup, visualizer, visual document, diagram page, spec/plan/docs visualization, or a clearer visual representation of agent-user discussion artifacts.
---

# sk-visualizer

Create one HTML file that makes a spec, plan, doc, mockup, flow, or diagram easier to understand at a glance.

## Modes

- Prompt-start mode: If the user invokes this skill at the start of a conversation with a short idea, infer a reasonable visual structure. Ask at most 1-2 questions only when missing information would materially change the page.
- Conversation-convert mode: If the conversation already contains spec, plan, docs, mockup, or diagram material, extract the key message and visualize that material instead of recreating the transcript.

## Output Contract

- Produce exactly one `.html` file.
- Use Tailwind from CDN by default.
- Add Mermaid CDN only when rendering a diagram.
- Add syntax highlighting CDN only when code blocks are central to the page.
- Do not claim the file is self-contained when it depends on CDN assets.
- Do not create a multi-file app, build step, README, or asset folder.

## Language and Typography

- If the user has not explicitly selected an output language, ask exactly: `Which language should the visualization use: English or Vietnamese?` This is the one required question and counts toward the prompt-start question limit.
- Do not infer the output language from the source material. Do not ask again when the user has already selected English or Vietnamese.
- Use the selected output language for generated headings, labels, summaries, and explanatory copy. Preserve source quotations, code, named entities, and evidence verbatim unless the user explicitly asks for translation.
- English output: load `Poppins` from Google Fonts and apply it to the document and UI with system fallbacks.
- Vietnamese output: load `Be Vietnam Pro` from Google Fonts and apply it to the document and UI with system fallbacks.
- Load only the selected font family and mention its Google Fonts CDN dependency in the completion response.

## Reference Routing

Choose one primary visual archetype before composing the page. References are design recipes, not output templates; never merge them into a universal layout.

- System change report: read [references/system-change-report.md](references/system-change-report.md) for severity-first triage.
- Spec visualization: read [references/spec-visualization.md](references/spec-visualization.md) for a reading-first document.
- Implementation plan: read [references/implementation-plan.md](references/implementation-plan.md) for a delivery-first plan.

Use an explicitly requested archetype first. Otherwise, choose the archetype that best matches the dominant source intent and the single takeaway the page must make obvious. For mixed material, choose one primary route and include secondary context only when it supports that route. If no archetype fits, continue with the generic workflow below without a reference. If the material cannot be meaningfully visualized with the available blocks, answer in chat instead of forcing HTML.

## Workflow

1. Resolve the output language and font family.
2. Choose the primary archetype and read its reference when one applies.
3. Identify the single takeaway the page must make obvious.
4. Choose the fewest blocks that carry that takeaway.
5. Convert long prose into structured blocks. Avoid recreating a markdown document.
6. Write the HTML file with simple responsive layout, readable spacing, semantic color, and the selected font only.
7. Before delivery, run the self-check below by inspection.

## Blocks

Use only the blocks the content needs:

- Hero: title, context, and the main takeaway.
- Steps: process, plan, lifecycle, or workflow.
- Matrix/Table: fields, states, responsibilities, mappings, acceptance criteria, or comparisons.
- Callout: info, decision, warning, risk, or success.
- Details: optional context, assumptions, non-goals, logs, or long notes.
- Diagram: Mermaid flowchart or sequence diagram when relationships matter.
- Code: short snippets only when code is the point.
- Compare: before/after, options, tradeoffs, or current/proposed behavior.
- Checklist: review status, acceptance criteria, or launch readiness.

## Design Policy

- Hierarchy: one element must visually dominate, and it must be the right takeaway.
- Color: use slate for structure, emerald for good, amber for warning, rose for risk, and sky for info.
- Visual direction: choose one restrained, content-appropriate visual direction and carry it consistently across type, spacing, surfaces, and emphasis. Do not force every visualization into one preset.
- Typography: use a clear type scale with comfortable line-height and keep normal reading measure around 60-75 characters when practical.
- Layout rhythm: use a small, consistent spacing scale, align repeated content to shared edges, and bound the main content width so wide screens do not dilute the hierarchy.
- Responsive behavior: collapse multi-column layouts on narrow screens. Put wide tables, code, and Mermaid diagrams inside `max-w-full overflow-x-auto` containers rather than clipping or shrinking them past readability.
- Surfaces: create depth with whitespace, subtle borders, tonal surfaces, and dividers. Vary containment by meaning instead of turning every section into the same card.
- Radius: keep corners subtle and consistent, normally `rounded-md` through `rounded-lg` for bounded surfaces and controls. Reserve `rounded-full` for genuine badges, pills, and status indicators; avoid oversized or arbitrarily mixed radii.
- Motion: use brief CSS-only transitions only for genuine state changes. Prefer opacity and transform, avoid perpetual decorative motion, and reduce or remove non-essential motion under `prefers-reduced-motion`.
- Accessibility: use semantic HTML, WCAG AA contrast, and visible focus states for every real interactive element. Do not add interaction only to justify hover, focus, or motion effects.
- Hard bans: no gradients, decorative box shadows, emoji bullets/icons, rainbow palettes, or background-clip text.
- Do not wrap every block in identical cards.
- Keep normal prose compact. No `<p>` should run longer than about 3 lines outside a `<details>` block.
- Do not add theme toggles, persisted details, review checkboxes, table-of-contents widgets, active-section observers, or keyboard shortcuts.

## Chart Discipline

- Bar charts start at zero.
- Label axes.
- Use one semantic series color unless series have different meanings.
- Do not use 3D charts.
- Do not use donut charts with fewer than 4 slices.

## Pre-delivery Self-check

Before writing the file, verify:

- Could any block be deleted without losing meaning? Delete it.
- Does the page pass the squint test: the main takeaway is visible even blurred?
- Are typography, reading measure, spacing rhythm, and shared alignments consistent?
- At narrow widths, do grids collapse and do tables, code, and diagrams remain usable without clipping?
- Are radii subtle, consistent, and semantic without turning every section into a card?
- Is motion limited to genuine state changes, and is non-essential motion removed under `prefers-reduced-motion`?
- Are semantic structure, readable contrast, and visible focus states present wherever interaction exists?
- Does every CDN match an actual block on the page?
- Are all colors semantic?
- Are all long details moved into `<details>`?
- Are the hard bans absent?

## Completion Response

Return the created HTML file path and mention Tailwind plus every actual CDN dependency used, including the selected Google Fonts family.
