# Implementation plan visualization

Use this reference for a delivery plan that must make execution order, tasks, and expected outputs clear at a glance. The page should foreground what will be delivered and what must happen first.

## Information hierarchy

1. State the intended delivery and the plan's main outcome.
2. Show milestones or a timeline only when dates, phases, or ordering are supplied.
3. Map each task to its output or definition of done.
4. Show dependencies, owners, and status only when the source provides them.
5. Separate risks, decisions, or blockers from the delivery sequence.

Never invent dates, durations, milestones, owners, statuses, dependencies, outputs, or completion states. When dates are absent, use an ordered task sequence rather than a fabricated timeline. Omit unavailable fields or identify them as unspecified. Put long task detail in `<details>`.

## Visual direction

Make the next delivery milestone or task sequence dominant. Pair a lightweight timeline or ordered steps with a task-to-output table when both are supported by the source. Keep dependencies and risks visually secondary but easy to scan.

Use `rounded-md` or `rounded-lg` for a milestone surface, a decision callout, or a bounded table region. Use `rounded-full` only for genuine provided status badges. Let the timeline, table, and narrative retain different containment instead of turning all of them into matching cards.

```html
<main class="mx-auto max-w-6xl px-6 py-10">
  <header><!-- delivery outcome and plan context --></header>
  <section><!-- source-provided milestones or ordered task sequence --></section>
  <section class="max-w-full overflow-x-auto"><!-- task, output, and definition of done --></section>
  <aside><!-- supplied dependencies, risks, or decisions --></aside>
  <details><!-- longer task notes --></details>
</main>
```

Avoid severity-report treatment and prose-first spec framing unless either is the plan's explicit primary purpose.

