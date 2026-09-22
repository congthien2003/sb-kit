# Spec visualization

Use this reference when a specification needs to become easier to read and understand than its source Markdown. The page should feel like an editorial technical document, not a dashboard.

## Information hierarchy

1. Establish the problem, context, and single intended outcome.
2. Present requirements in a compact, readable hierarchy.
3. Add a flow or Mermaid diagram only when a relationship, lifecycle, or sequence is hard to understand in prose.
4. Surface decisions, assumptions, and non-goals separately from requirements.
5. End with acceptance criteria or a compact criteria matrix when supplied.

Condense and structure source prose; do not reproduce the Markdown. Do not invent requirements, flows, decisions, non-goals, or acceptance criteria. Keep long supporting material in `<details>`.

## Visual direction

Prioritize reading measure, section rhythm, and clear editorial hierarchy. Let the problem statement or intended outcome dominate; use tonal dividers and whitespace before adding bounded surfaces. Use a callout for a consequential decision and a table only for repeated criteria or mappings.

Use `rounded-md` or `rounded-lg` only for meaningful callouts, criteria surfaces, and controls. Do not wrap every prose section in a card. Use `rounded-full` only for real status or category pills, never as a default section treatment.

```html
<main class="mx-auto max-w-4xl px-6 py-10">
  <header><!-- title, context, intended outcome --></header>
  <section><!-- requirements in editorial hierarchy --></section>
  <section><!-- optional flow or Mermaid diagram --></section>
  <aside><!-- decision, assumption, or non-goal --></aside>
  <section class="max-w-full overflow-x-auto"><!-- acceptance criteria when supplied --></section>
</main>
```

Avoid severity-first triage and task-timeline framing unless those are genuinely the spec's primary message.

