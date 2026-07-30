# Tracker UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current stacked tracker board with a minimalist three-column session workbench while preserving all existing behavior.

**Architecture:** Keep the current static HTML/CSS/JavaScript UI and HTTP API. Add stable shell regions to `index.html`, let `app.js` own the selected-session state and render each region independently, and express the visual system entirely in `styles.css`.

**Tech Stack:** Node.js 22, CommonJS server, browser-native HTML/CSS/JavaScript, `node:test`

---

### Task 1: Lock the new UI shell contract

**Files:**
- Modify: `test-tracker-server.js`
- Modify: `tracker/ui/index.html`

- [ ] **Step 1: Add failing static UI assertions**

Extend the existing server test after `const page = ...`:

```js
assert.match(page, /class="workspace"/);
assert.match(page, /id="session-sidebar"/);
assert.match(page, /id="session-detail"/);
assert.match(page, /id="artifact-panel"/);
assert.match(page, /id="blocked-dialog"/);

const styles = await (await fetch(`${server.url}/styles.css`)).text();
assert.match(styles, /--canvas:\s*#f7f7f4/);
assert.match(styles, /\.workspace\s*\{/);
assert.match(styles, /@media \(max-width: 900px\)/);
```

- [ ] **Step 2: Verify the test fails**

Run:

```powershell
node --test test-tracker-server.js
```

Expected: FAIL because the new shell IDs and design tokens do not exist.

- [ ] **Step 3: Replace the board shell**

Update `tracker/ui/index.html` so the body structure is:

```html
<header class="topbar">
  <a class="brand" href="/" aria-label="Agent Sessions home">
    <span class="brand-mark" aria-hidden="true"></span>
    <span>Agent Sessions</span>
  </a>
  <button class="button-primary" id="new-session">New session</button>
</header>
<main class="workspace">
  <aside class="session-sidebar" id="session-sidebar">
    <nav class="date-nav" aria-label="Board date">
      <div class="date-controls">
        <button class="icon-button" id="previous-date" aria-label="Previous day">←</button>
        <button id="today">Today</button>
        <button class="icon-button" id="next-date" aria-label="Next day">→</button>
      </div>
      <strong id="board-date"></strong>
      <span id="board-counts"></span>
    </nav>
    <div id="session-list" aria-live="polite">Loading sessions…</div>
  </aside>
  <section class="session-detail" id="session-detail" aria-live="polite">
    Loading session…
  </section>
  <aside class="artifact-panel" id="artifact-panel">Loading artifacts…</aside>
</main>
```

Keep the existing session, task, and artifact dialogs. Add a native blocked-reason dialog:

```html
<dialog id="blocked-dialog">
  <form id="blocked-form">
    <h2>Block task</h2>
    <input name="taskId" type="hidden" />
    <label>Reason<textarea name="blockedReason" required></textarea></label>
    <footer>
      <button type="button" data-close>Cancel</button>
      <button class="button-primary">Mark blocked</button>
    </footer>
  </form>
</dialog>
```

- [ ] **Step 4: Run the focused test**

Run:

```powershell
node --test test-tracker-server.js
```

Expected: still FAIL only on CSS assertions; HTML shell assertions pass.

### Task 2: Implement master-detail rendering

**Files:**
- Modify: `tracker/ui/app.js`
- Test: `test-tracker-server.js`

- [ ] **Step 1: Add selected-session state and selection helpers**

Change state and add a helper:

```js
const state = {
  date: dateKey(new Date()),
  summary: null,
  selectedSessionId: null,
  signature: "",
};

function selectedSession() {
  const sessions = state.summary?.sessions || [];
  return (
    sessions.find((session) => session.id === state.selectedSessionId) ||
    sessions[0] ||
    null
  );
}
```

After loading a changed summary, retain the selection when possible and otherwise select the first session:

```js
const sessions = summary.sessions || [];
if (!sessions.some((session) => session.id === state.selectedSessionId)) {
  state.selectedSessionId = sessions[0]?.id ?? null;
}
```

- [ ] **Step 2: Split rendering into the three shell regions**

Replace the stacked `renderSession()` flow with:

```js
function render() {
  renderDate();
  renderSessionList();
  renderSessionDetail();
  renderArtifacts();
}
```

`renderSessionList()` renders compact buttons carrying `data-select-session`, current counts, and `aria-current`. Its empty state includes a `New session` button. `renderSessionDetail()` renders the selected title, summary, task rows, and `Add task`. Put Edit and Archive inside one native `<details class="action-menu">` with a `•••` summary. `renderArtifacts()` renders the selected session's artifacts under Spec, Implementation plan, and Doc headings plus `Add artifact`; each key shows its latest version before its history.

Use the existing `escapeHtml()`, artifact grouping logic, dialogs, API paths, and status classes. Do not introduce a component abstraction or client-side router.

- [ ] **Step 3: Render and wire the compact status control**

Replace `nextButtons()` with a native select that contains the current state and only valid transitions:

```js
function renderStatusControl(task) {
  const transitions = {
    todo: ["in_progress"],
    in_progress: ["blocked", "done"],
    blocked: ["in_progress"],
    done: ["in_progress"],
  };
  return `<select class="status status-${task.status}" data-task-status="${task.id}" data-current="${task.status}" aria-label="Status for ${escapeHtml(task.title)}">
    <option selected value="${task.status}">${task.status}</option>
    ${transitions[task.status].map((status) => `<option value="${status}">${status}</option>`).join("")}
  </select>`;
}
```

Handle selection separately from the existing button click delegation:

```js
document.addEventListener("change", async (event) => {
  const select = event.target.closest("[data-task-status]");
  if (!select) return;
  const status = select.value;
  select.value = select.dataset.current;
  if (status === "blocked") {
    openForm("#blocked-dialog", { taskId: select.dataset.taskStatus });
    return;
  }
  try {
    await updateTaskStatus(select.dataset.taskStatus, status);
  } catch (error) {
    notify(error.message, true);
  }
});

async function updateTaskStatus(id, status, blockedReason) {
  await api(`/api/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      blockedReason,
      actor: "human",
    }),
  });
  await loadBoard();
}
```

Submit `#blocked-form` with `updateTaskStatus()`, then close the dialog. Remove `nextButtons()` and the native `prompt()` call.

- [ ] **Step 4: Wire session selection**

Add this branch near the start of the existing button click handler:

```js
if (button.dataset.selectSession) {
  state.selectedSessionId = Number(button.dataset.selectSession);
  render();
}
```

- [ ] **Step 5: Select a newly created session**

In the existing form submit handler, keep the API response:

```js
const saved = await api(target, {
  method: target === path ? method : "PATCH",
  body: JSON.stringify(data),
});
if (id === "#session-form" && target === path) {
  state.selectedSessionId = saved.id;
}
```

When the date changes, clear `selectedSessionId` before `loadBoard()`. Preserve the current signature check and two-second polling behavior.

- [ ] **Step 6: Verify JavaScript and existing behavior**

Run:

```powershell
node --check tracker/ui/app.js
node --test test-tracker-server.js
```

Expected: syntax check passes; server test fails only on unfinished CSS assertions.

### Task 3: Apply the editorial visual system

**Files:**
- Modify: `tracker/ui/styles.css`
- Test: `test-tracker-server.js`

- [ ] **Step 1: Replace tokens and global controls**

Define the approved palette and geometry:

```css
:root {
  --canvas: #f7f7f4;
  --canvas-soft: #fafaf7;
  --surface: #ffffff;
  --surface-strong: #e6e5e0;
  --ink: #26251e;
  --body: #5a5852;
  --muted: #807d72;
  --hairline: #e6e5e0;
  --hairline-strong: #cfcdc4;
  --primary: #f54e00;
  --primary-active: #d04200;
  --success: #1f8a65;
  --error: #cf2d56;
}
```

Use a local `system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif` stack, 8px control corners, 12px panel corners, 40px minimum buttons, orange focus rings, and no shadows.

- [ ] **Step 2: Build the desktop workbench**

Implement:

```css
.workspace {
  display: grid;
  grid-template-columns: minmax(240px, 280px) minmax(0, 1fr) minmax(260px, 300px);
  min-height: calc(100vh - 65px);
}

.session-sidebar,
.artifact-panel {
  background: var(--canvas-soft);
}

.session-sidebar {
  border-right: 1px solid var(--hairline);
}

.artifact-panel {
  border-left: 1px solid var(--hairline);
}
```

Style session buttons as borderless compact rows, the selected session as a white inset panel, tasks as separated rows, artifact versions as `<details>`, and secondary actions as quiet controls. Status pills use muted/pastel fills without reusing orange.

- [ ] **Step 3: Add responsive and accessibility styles**

At `max-width: 900px`, collapse to one column in session/task/artifact order and replace side borders with horizontal hairlines. At `max-width: 640px`, stack task content/actions and allow action buttons to wrap. Preserve `prefers-reduced-motion`.

- [ ] **Step 4: Run focused and full automated checks**

Run:

```powershell
node --test test-tracker-server.js
npm test
```

Expected: all tests pass.

### Task 4: Browser verification

**Files:**
- Verify: `tracker/ui/index.html`
- Verify: `tracker/ui/app.js`
- Verify: `tracker/ui/styles.css`

- [ ] **Step 1: Start the local tracker**

In a disposable repository:

```powershell
node cli.js track init
node cli.js track serve
```

Expected: tracker is available at `http://127.0.0.1:41737`.

- [ ] **Step 2: Check desktop behavior**

At approximately 1440px width, verify:

- The three columns are visible with no horizontal overflow.
- Date navigation and session selection work.
- New sessions become selected.
- Task transitions work, including the blocked-reason dialog.
- Copy prompt, task editing, artifact creation/history, and archive still work.
- Browser console has no errors.

- [ ] **Step 3: Check mobile behavior**

At approximately 390px width, verify the regions stack session picker → tasks → artifacts, all controls remain reachable, dialogs fit the viewport, and no horizontal overflow appears.

- [ ] **Step 4: Final static checks**

Run:

```powershell
node --check tracker/ui/app.js
git diff --check
```

Expected: both commands exit successfully.
