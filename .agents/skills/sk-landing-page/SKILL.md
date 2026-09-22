---
name: sk-landing-page
description: Create or update a product marketing landing page from a brief or repository as landing/index.html using Tailwind CSS CDN. Use for single-file product landing pages, not documentation visualizations or multi-page applications.
---

# Product landing pages

Explain a small product clearly and help its intended audience take one meaningful next step. Choose a familiar marketing-page direction that fits the audience and concept, such as SaaS, education, gym, or sport.

## Output contract

- Create or update exactly `<project-root>/landing/index.html`. Create `landing/` if absent. Resolve the intended project root from the task and repository instructions, not from the skill's installation directory.
- Keep custom CSS, JavaScript, and embedded visuals inside the HTML. Use inline SVG, embedded images, or known remote asset URLs; do not create separate local assets, stylesheets, scripts, README files, or planning documents. Keep planning and handoff notes in chat.
- Use Tailwind CSS directly from CDN. Do not scaffold an app, add package dependencies, introduce a build step, implement a backend, or publish the page as part of this workflow.
- A single HTML file with CDN and web-font dependencies is not an offline or fully self-contained page.

## Workflow

1. Read applicable `AGENTS.md` instructions and inspect the intended output path. Honor required plan approvals and restrictions on tests, browser checks, or other verification. Read an existing `landing/index.html` before making scoped updates and preserve unrelated files. If `landing` is a file, or the task would replace an unrelated existing page, resolve that conflict with the user rather than choosing another output path or deleting content. Do not ask again for an already authorized update.
2. Gather product facts from the user's brief and relevant public-facing repository evidence: README, product documentation, public interfaces, examples, and source when needed. Identify the audience, problem, main benefit, capabilities, workflow, and primary conversion goal. Do not copy private configuration or internal implementation details into marketing copy.
3. Ask only for missing information that materially affects the product's identity, claims, or next step. Infer reasonable presentation choices. Omit unsupported optional content instead of filling the page with placeholders or assumptions presented as facts.
4. Choose the visual direction, language, font, and content outline. Use the user's stated concept when supplied; otherwise infer a conventional direction from the audience and offering. Briefly explain the choice in chat without requiring a separate theme questionnaire.
5. Build the one HTML file using the content and design guidance below. For an existing page, make the requested changes within its established content and visual direction unless a redesign is authorized.
6. Review the source against the output contract and product evidence. Run runtime or automated checks only when permitted. Return the file path, external dependencies, and any material unverified behavior; do not claim browser validation or successful conversion without evidence. Do not commit unless explicitly requested.

## Content structure

Use this as a starting sequence, not a required section count. Merge, reorder, or omit sections that would repeat information or do not fit the product. A reader should understand what the product does, who it serves, why it helps, how to use it, and how to start.

| Section | Purpose |
| --- | --- |
| Navigation | Product identity, a few useful section links, and the primary CTA. |
| Hero | A concrete value proposition, audience/context, short supporting copy, CTA, and a relevant visual. |
| Problem and solution | Explain the situation the product improves and its approach. |
| Features and benefits | Connect real capabilities to useful outcomes; make the product understandable beyond a slogan. |
| How it works | Show the actual path to getting value, including prerequisites or short usage examples when relevant. |
| Use cases | Help distinct audiences recognize suitable situations without inventing unsupported capabilities. |
| Pricing and proof | Include actual plans, terms, testimonials, customer logos, or results only when supplied or evidenced. |
| FAQ | Resolve likely product questions and objections with supported answers. |
| Closing CTA | Reinforce the main benefit and repeat the same primary conversion goal. |
| Footer | Product identity and real documentation, contact, or other relevant links. |

Lead with benefits while explaining the features behind them. Keep technical detail when it helps a buyer or user decide; do not turn repository internals into page content.

Never fabricate pricing, free tiers, customer names, testimonials, usage counts, performance results, guarantees, capabilities, or URLs. Omit unavailable optional proof and commercial sections. Discuss essential information gaps in chat, not as fake content on the page.

CTA labels must match their real destinations or actions. Use a supplied or evidenced destination, or a useful link to an actual section such as getting started. If the intended conversion cannot work without a missing destination, ask for it. Do not use empty `href="#"` links, fake checkout buttons, or forms that pretend to submit successfully. Secondary links may support exploration while the primary goal stays clear.

## Visual direction and typography

- Use SaaS, education, gym, and sport as examples of familiar landing-page concepts, not a fixed template library or an exhaustive taxonomy. Let the product and audience guide composition, colors, imagery, and tone.
- A CLI product does not imply a terminal theme. Present it as an ordinary product landing page; avoid defaulting to terminal windows, hacker colors, shell prompts as decoration, or monospace body text. A short real command in a getting-started section is appropriate when it helps explain use.
- Select fonts for the concept and language. Be Vietnam Pro is a useful first choice for Vietnamese content; Poppins and Roboto are valid options when suitable. These are preferences, not an exclusive list. Load only needed web-font weights, use `display=swap`, provide a readable fallback, and account for the actual language's glyph coverage.
- Keep a cohesive type scale, bounded content width, comfortable reading measure, consistent spacing, and restrained corner radii. Vary section composition instead of enclosing every section in identical cards. Use color and decoration to support the product message.
- Prefer actual product visuals when available. Otherwise use an honest illustration of the workflow or benefit; do not invent a dashboard or interface that implies the product has features it lacks.
- This skill supplies its own marketing-page guidance. Do not automatically invoke a separate design or visualization skill, inherit report-specific colors, or exclude the user's preferred fonts because another general design guide discourages them.

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

Before delivery, inspect whether the change writes only `landing/index.html`, every product claim has support, the chosen concept fits the brief, and the primary CTA has a real action. Check source structure for responsive layout, font fallbacks, accessible controls, and unnecessary external dependencies.

If verification is prohibited, report source review only and give the user any needed manual checks: open the file with network access, inspect mobile and desktop layouts, and exercise navigation and the primary CTA. Do not generate a second page or screenshots as additional deliverables.

Return the created or updated file path with a brief note about Tailwind CDN, web fonts or remote imagery used, and verification status.

## References

- [Unbounce: The anatomy of a landing page](https://unbounce.com/landing-page-articles/the-anatomy-of-a-landing-page/) — guidance on value proposition, contextual visuals, features and benefits, real proof, and a primary conversion goal; not a universal layout or conversion guarantee.
- [Tailwind CSS: Play CDN](https://tailwindcss.com/docs/installation/play-cdn) — browser CDN setup, v4 inline theme syntax, and the development-only limitation.
