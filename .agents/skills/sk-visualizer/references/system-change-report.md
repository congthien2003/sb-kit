# System change report visualization

Use this reference for a report that must help a reader triage proposed, required, or completed system changes. Make urgency and the next decision visible before implementation detail.

## Information hierarchy

1. State the report title, scope, and the most important takeaway.
2. Show a severity summary using only the taxonomy provided by the source, such as Critical, High, or Medium.
3. Group affected areas by severity, then show impact and supporting evidence.
4. Present the recommended action, owner, status, or due date only when the source supplies it.
5. Put long logs, evidence, and implementation notes in `<details>`.

Do not invent a severity, status, owner, due date, evidence, or action. If a useful field is unavailable, omit it or label it as unavailable. Use semantic color to reinforce the source-provided severity; do not let color create a severity meaning that the source does not state.

## Visual direction

Make the severity summary the dominant visual. Use a compact legend only when it clarifies the supplied taxonomy. Follow it with one prioritized list or table of affected areas, then action-oriented detail. Use `rose` for risk, `amber` for caution, `sky` for informational context, and `emerald` only for genuinely positive or resolved states.

Use `rounded-md` or `rounded-lg` for bounded summary surfaces and controls. Reserve `rounded-full` for genuine status or severity badges. Vary containment: a severity strip, a bordered table, and a plain prose section should not all become identical cards.

```html
<main class="mx-auto max-w-6xl px-6 py-10">
  <header><!-- title, scope, primary decision --></header>
  <section><!-- severity summary and optional legend --></section>
  <section class="max-w-full overflow-x-auto"><!-- affected areas table --></section>
  <section><!-- impact, evidence, and recommended action --></section>
  <details><!-- long evidence or logs --></details>
</main>
```

Avoid a delivery timeline unless it is essential source-provided evidence. Do not use the editorial, prose-led shape intended for a spec.

