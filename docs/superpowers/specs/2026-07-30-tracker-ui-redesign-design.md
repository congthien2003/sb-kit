# Tracker UI Redesign

## Goal

Redesign the local Agent Session Tracker as a minimalist editorial workbench. Preserve the existing SQLite model, HTTP API, task transitions, artifact versioning, polling, and handoff behavior while making daily session tracking easier to scan.

## Layout

Use a three-column desktop layout beneath a compact header:

- A roughly 280px left sidebar contains date navigation, daily counts, and the session list.
- The flexible center column shows the selected session summary and its tasks.
- A roughly 300px right sidebar groups session artifacts by `spec`, `implementation_plan`, and `doc`.

Selecting a session updates the detail view without reloading. Changing the date selects the first session for that day. Creating a session selects the new record. On narrow screens, the regions stack in this order: session picker, tasks, artifacts.

## Visual System

Follow the supplied Cursor-inspired concept with a warm cream canvas (`#f7f7f4`), white surfaces, warm ink (`#26251e`), and orange (`#f54e00`) used only for primary actions and focus. Use an offline system sans-serif stack, regular-weight display text, and monospace only for metadata and paths.

Depth comes from white-on-cream contrast and 1px hairlines, never shadows. Buttons and fields use 8px corners; panels use up to 12px. Task statuses use compact muted or pastel pills. Secondary actions such as Edit and Archive move into a compact overflow menu.

## Interaction

Tasks render as concise rows with a compact status control. Moving a task to `blocked` opens a dialog requiring a reason. Copying a task handoff prompt shows a short toast. Artifact groups show the latest version first and place older versions inside native `<details>`.

Keep native dialogs, accessible labels, visible keyboard focus, 40px minimum interactive targets, and reduced-motion support. Preserve the existing two-second refresh and signature check so unchanged data does not disturb focus.

## Error and Empty States

Show an explicit loading state on first load, a useful empty state when a date has no sessions, and a non-blocking toast for API or clipboard failures. Server validation remains authoritative.

## Scope and Verification

Implement with the existing HTML, CSS, and JavaScript only. Do not add UI libraries, font downloads, new endpoints, or database changes. Verify with `npm test`, `node --check` for changed JavaScript, and browser smoke checks at desktop and mobile widths.
