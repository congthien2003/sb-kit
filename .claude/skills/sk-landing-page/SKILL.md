---
name: sk-landing-page
description: Plan, create, or update a single-file landing page for an agent skill, SaaS product, GitHub repository, or other offering. Use the brief or repository to identify the page type, choose content highlights and a primary CTA, and propose a color palette and visual style. Build at landing/index.html with Tailwind CSS CDN. For documentation visualizations and multi-page applications, use their dedicated workflows.
---

# Landing pages

Explain what the offering does, show why it matters to the intended audience, and give that audience one meaningful next step.

## Output contract

- Create or update exactly `<project-root>/landing/index.html`. Create `landing/` if absent. Resolve the intended project root from the task and repository instructions, not from the skill's installation directory.
- Keep custom CSS, JavaScript, and embedded visuals inside the HTML. Use inline SVG, embedded images, or known remote asset URLs; do not create separate local assets, stylesheets, scripts, README files, or planning documents. Keep planning and handoff notes in chat.
- Use Tailwind CSS directly from CDN. Do not scaffold an app, add package dependencies, introduce a build step, implement a backend, or publish the page as part of this workflow.
- A single HTML file with CDN and web-font dependencies is not an offline or fully self-contained page.

## Workflow

1. Read applicable `AGENTS.md` instructions and inspect the intended output path. Honor required plan approvals and restrictions on tests, browser checks, or other verification. Read an existing `landing/index.html` before making scoped updates and preserve unrelated files. If `landing` is a file, or the task would replace an unrelated existing page, resolve that conflict with the user rather than choosing another output path or deleting content. Do not ask again for an already authorized update.
2. Read the brief, README, public documentation, and examples relevant to the offering. Consult public interfaces or source if needed to substantiate a claim. Open [Content strategy](references/content-strategy.md) to identify the page type, audience, hero message, supporting highlights, and primary CTA. Ask only when missing information materially affects the offering's identity, an essential claim, or the reader's next step.
3. Open [Visual direction](references/visual-direction.md) to choose a primary color, style, typography, and visual treatment. Inspect any supplied design references, the existing page, and relevant brand guidance or tokens.
4. Before writing HTML, share a brief in chat covering the page type and reason, audience, hero message, one to three supported highlights, primary CTA and destination, and proposed primary color, visual style, and heading and body fonts. Explain how the proposed direction fits the content. State material assumptions and point to the evidence behind the highlights when available. For advice-only requests, deliver the brief in chat. For build requests, proceed once the brief is clear and edits are authorized. Use a wireframe or separate design approval only if the user or applicable instructions require it.
5. Build the one HTML file using the selected direction and implementation guidance below. For a scoped update, preserve established content and visual choices outside the requested changes.
6. Review the result against the output contract and deliver the handoff below.

## Reference map

| When | Open |
| --- | --- |
| Identify the page type, prioritize the message, or choose sections and a CTA | [Content strategy](references/content-strategy.md) |
| Choose or adapt colors, layout, typography, or imagery | [Visual direction](references/visual-direction.md) |
| Build or update the HTML | [HTML and interaction](#html-and-interaction) |

## HTML and interaction

Use the Tailwind CSS v4 browser CDN in `<head>`:

```html
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
```

Use v4 syntax. If Tailwind theme customization is needed, put `@theme` inside `<style type="text/tailwindcss">`; ordinary supplemental CSS can use a normal `<style>` block. Do not mix in v3 `tailwind.config` setup.

Include the document language, UTF-8 charset, viewport, meaningful title and meta description, one primary `h1`, and semantic sections with logical heading order. Use mobile-first layouts that remain readable on narrow screens without clipping content. Keep wide command examples scrollable within their own container.

Use descriptive links, image alternatives, readable contrast, visible keyboard focus, and native controls where possible. Add only the JavaScript needed for actual interactions. Navigation, FAQ controls, and other interactive elements must work with a keyboard and expose their state appropriately. Keep motion subtle and honor `prefers-reduced-motion`; page content must not depend on an animation completing to become readable.

Tailwind documents Play CDN as intended for development, not production. Preserve the requested CDN delivery format, state this limitation in the handoff, and do not silently substitute a build pipeline. Keep dependency and implementation notes out of the marketing page itself.

## Source review and handoff

Before delivery, inspect whether the change writes only `landing/index.html`, every product claim has support, the chosen direction fits the brief, and the primary CTA has a real action. Check source structure for responsive layout, font coverage and fallbacks, accessible controls, and unnecessary external dependencies. Follow the [typography guidance](references/visual-direction.md#typography) when reviewing the real headline. Run runtime or automated checks only when permitted.

If verification is prohibited, report source review only and give the user any needed manual checks: open the file with network access, inspect mobile and desktop layouts, and exercise navigation and the primary CTA. Do not generate a second page or screenshots as additional deliverables.

Return the created or updated file path with a brief note about Tailwind CDN, web fonts or remote imagery used, material design assumptions, and verification status. Commit only when explicitly requested.

## References

- [Tailwind CSS: Play CDN](https://tailwindcss.com/docs/installation/play-cdn) — browser CDN setup, v4 inline theme syntax, and the development-only limitation.
