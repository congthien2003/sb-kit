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

## Workflow

1. Identify the single takeaway the page must make obvious.
2. Choose the fewest blocks that carry that takeaway.
3. Convert long prose into structured blocks. Avoid recreating a markdown document.
4. Write the HTML file with simple responsive layout, readable spacing, and semantic color only.
5. Before delivery, run the self-check below by inspection.

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

If the content does not fit these blocks, answer in chat instead of forcing HTML.

## Design Policy

- Hierarchy: one element must visually dominate, and it must be the right takeaway.
- Color: use slate for structure, emerald for good, amber for warning, rose for risk, and sky for info.
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
- Does every CDN match an actual block on the page?
- Are all colors semantic?
- Are all long details moved into `<details>`?
- Are the hard bans absent?

## Completion Response

Return the created HTML file path and mention any CDN dependencies used.
