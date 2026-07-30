# Local Agent Session Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional repository-local tracker to `sb-kit` with sessions, tasks, versioned artifact references, handoff prompts, CLI/MCP access, and a daily web board.

**Architecture:** Keep the existing skill installer intact and lazy-load a new `tracker/` module only for `sb-kit track` commands. CLI, MCP, and loopback HTTP adapters call one synchronous application core backed by repository-local SQLite; the UI is static HTML/CSS/JavaScript with no frontend build step.

**Tech Stack:** Node.js 22.13+, CommonJS, `better-sqlite3`, official MCP TypeScript SDK used from JavaScript, Zod, `node:http`, `node:test`.

**Execution rule:** Do not commit unless the user explicitly requests it. The commit steps normally suggested by the planning workflow are intentionally omitted.

---

## File Structure

- Modify: `package.json` — Node engine, tracker dependencies, package contents, and test script.
- Modify: `package-lock.json` — locked dependency graph.
- Modify: `cli.js` — advertise and dispatch `sb-kit track`.
- Modify: `test-cli.js` — preserve installer coverage and cover top-level tracker help.
- Create: `tracker/repository.js` — repository discovery, `.gitignore`, and safe artifact paths.
- Create: `tracker/migrations.js` — ordered SQL migration definitions.
- Create: `tracker/database.js` — initialization, backup, migration, and SQLite connection settings.
- Create: `tracker/core.js` — session, task, artifact, activity, and summary operations.
- Create: `tracker/handoff.js` — deterministic one-task handoff prompt.
- Create: `tracker/cli.js` — tracker argument parsing and text/JSON output.
- Create: `tracker/mcp.js` — MCP handlers and `stdio` server registration.
- Create: `tracker/server.js` — loopback HTTP API and static-file serving.
- Create: `tracker/ui/index.html` — daily board structure and edit dialogs.
- Create: `tracker/ui/app.js` — polling, rendering, forms, and copy-prompt behavior.
- Create: `tracker/ui/styles.css` — compact local dashboard styling.
- Create: `test-tracker-core.js` — storage and domain integration coverage.
- Create: `test-tracker-cli.js` — spawned CLI integration coverage.
- Create: `test-tracker-mcp.js` — MCP handler contract coverage.
- Create: `test-tracker-server.js` — HTTP and static UI smoke coverage.
- Modify: `README.md` — tracker setup, commands, MCP configuration, and local-data behavior.

### Task 1: Add the Optional Tracker Entry Point

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `cli.js`
- Modify: `test-cli.js`

- [ ] **Step 1: Extend the existing CLI help test**

Add a non-interactive help assertion to `test-cli.js`:

```js
const help = spawnSync(process.execPath, [path.join(__dirname, "cli.js"), "--help"], {
  encoding: "utf8",
  shell: false,
  windowsHide: true,
});

assert.strictEqual(help.status, 0, help.stderr);
assert.match(help.stdout, /sb-kit track init/);
assert.match(help.stdout, /sb-kit track serve/);
```

- [ ] **Step 2: Run the test and confirm the new assertion fails**

Run:

```powershell
node test-cli.js
```

Expected: failure because the current usage text does not contain tracker commands.

- [ ] **Step 3: Add package metadata and install the approved dependencies**

Update `package.json` to:

```json
{
  "name": "sb-kit",
  "version": "2.0.0",
  "description": "CLI to pull .agents skills into any project — npx sb-kit install",
  "bin": {
    "sb-kit": "cli.js"
  },
  "scripts": {
    "test": "node --test test-cli.js test-tracker-core.js test-tracker-cli.js test-tracker-mcp.js test-tracker-server.js"
  },
  "dependencies": {
    "@clack/prompts": "^1.7.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "better-sqlite3": "^13.0.0",
    "zod": "^4.0.0"
  },
  "engines": {
    "node": ">=22.13.0"
  },
  "files": [
    "cli.js",
    "tracker",
    ".agents"
  ],
  "keywords": [
    "agents",
    "skills",
    "cli",
    "installer"
  ],
  "author": "",
  "license": "ISC"
}
```

Run `npm install` to update `package-lock.json`. Do not hand-edit the lockfile.

- [ ] **Step 4: Advertise and lazy-dispatch tracker commands**

Extend `USAGE` in `cli.js`:

```js
const USAGE = `sb-kit — install agent skills into the current project

  npx sb-kit install       Choose which packaged skills to install
  npx sb-kit track init    Initialize local session tracking
  npx sb-kit track serve   Open the local tracker UI
  npx sb-kit --help        Show this help`;
```

Add this `main()` switch branch without importing tracker code at module load:

```js
case "track": {
  const { run } = require("./tracker/cli");
  await run(process.argv.slice(3));
  break;
}
```

Create a temporary `tracker/cli.js` export so the dispatcher is valid:

```js
async function run() {
  throw new Error("Tracker commands are not implemented yet.");
}

module.exports = { run };
```

- [ ] **Step 5: Re-run the existing CLI test**

Run:

```powershell
node test-cli.js
```

Expected: `sb-kit installation passed` and exit code `0`.

### Task 2: Initialize and Discover Repository Storage

**Files:**

- Create: `tracker/repository.js`
- Create: `tracker/migrations.js`
- Create: `tracker/database.js`
- Create: `test-tracker-core.js`

- [ ] **Step 1: Write failing repository initialization tests**

Create `test-tracker-core.js` with `node:test` cases that use a temporary folder:

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { findTrackerRoot, initializeRepository } = require("./tracker/repository");
const { initializeDatabase, openDatabase } = require("./tracker/database");
const { migrations } = require("./tracker/migrations");

function temporaryRepository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-tracker-"));
  fs.mkdirSync(path.join(root, ".git"));
  return root;
}

test("initializes tracker storage and discovers it from a nested directory", () => {
  const root = temporaryRepository();
  try {
    initializeRepository(root);
    initializeDatabase(root);
    const nested = path.join(root, "src", "feature");
    fs.mkdirSync(nested, { recursive: true });

    assert.strictEqual(findTrackerRoot(nested), root);
    assert.ok(fs.existsSync(path.join(root, ".sb-kit", "tracker.sqlite")));
    assert.match(fs.readFileSync(path.join(root, ".gitignore"), "utf8"), /^\.sb-kit\/$/m);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("initialization is idempotent", () => {
  const root = temporaryRepository();
  try {
    initializeRepository(root);
    initializeRepository(root);
    initializeDatabase(root);
    initializeDatabase(root);

    const ignored = fs.readFileSync(path.join(root, ".gitignore"), "utf8")
      .split(/\r?\n/)
      .filter((line) => line === ".sb-kit/");
    assert.strictEqual(ignored.length, 1);
    const db = openDatabase(root);
    try {
      assert.strictEqual(
        db.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get().count,
        1,
      );
    } finally {
      db.close();
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("backs up an existing database before a pending migration", () => {
  const root = temporaryRepository();
  try {
    initializeRepository(root);
    initializeDatabase(root).close();
    initializeDatabase(root, [
      ...migrations,
      { version: 2, sql: "CREATE TABLE migration_probe(id INTEGER PRIMARY KEY);" },
    ]).close();

    assert.ok(fs.existsSync(path.join(root, ".sb-kit", "tracker.sqlite.bak")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the focused test and confirm missing-module failure**

Run:

```powershell
node --test test-tracker-core.js
```

Expected: failure because repository and database modules do not exist.

- [ ] **Step 3: Implement repository discovery and path safety**

Create `tracker/repository.js` with these exports and behavior:

```js
const fs = require("node:fs");
const path = require("node:path");

function walkUp(start, predicate) {
  let current = path.resolve(start);
  while (true) {
    if (predicate(current)) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function findGitRoot(start = process.cwd()) {
  const root = walkUp(start, (dir) => fs.existsSync(path.join(dir, ".git")));
  if (!root) throw new Error("Run this command inside a Git repository.");
  return root;
}

function findTrackerRoot(start = process.cwd()) {
  const root = walkUp(start, (dir) =>
    fs.existsSync(path.join(dir, ".sb-kit", "tracker.sqlite")),
  );
  if (!root) throw new Error("Tracker is not initialized. Run `sb-kit track init`.");
  return root;
}

function initializeRepository(start = process.cwd()) {
  const root = findGitRoot(start);
  fs.mkdirSync(path.join(root, ".sb-kit"), { recursive: true });
  const ignorePath = path.join(root, ".gitignore");
  const current = fs.existsSync(ignorePath) ? fs.readFileSync(ignorePath, "utf8") : "";
  const lines = current.split(/\r?\n/);
  if (!lines.includes(".sb-kit/")) {
    fs.appendFileSync(ignorePath, `${current && !current.endsWith("\n") ? "\n" : ""}.sb-kit/\n`);
  }
  return root;
}

function resolveArtifactPath(root, relativePath) {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error("Artifact path must be relative to the repository.");
  }
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("Artifact path must stay inside the repository.");
  }
  if (!fs.statSync(resolved, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`Artifact file does not exist: ${relativePath}`);
  }
  return resolved;
}

module.exports = {
  findGitRoot,
  findTrackerRoot,
  initializeRepository,
  resolveArtifactPath,
};
```

- [ ] **Step 4: Define the initial migration**

Create `tracker/migrations.js` with one migration containing:

```js
const migrations = [{
  version: 1,
  sql: `
    CREATE TABLE sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      archived_at TEXT
    );

    CREATE TABLE tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      acceptance_criteria TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'todo'
        CHECK (status IN ('todo', 'in_progress', 'blocked', 'done')),
      blocked_reason TEXT,
      completed_at TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE artifacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
      type TEXT NOT NULL CHECK (type IN ('spec', 'implementation_plan', 'doc')),
      key TEXT NOT NULL,
      title TEXT NOT NULL,
      version INTEGER NOT NULL,
      path TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      UNIQUE (session_id, key, version)
    );

    CREATE TABLE activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      actor TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      details_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX tasks_session_position_idx ON tasks(session_id, position, id);
    CREATE INDEX artifacts_session_key_version_idx
      ON artifacts(session_id, key, version DESC);
    CREATE INDEX activity_entity_idx
      ON activity_log(entity_type, entity_id, created_at);
  `,
}];

module.exports = { migrations };
```

- [ ] **Step 5: Implement database initialization and migration backup**

Create `tracker/database.js`:

```js
const fs = require("node:fs");
const path = require("node:path");
const Database = require("better-sqlite3");
const { migrations } = require("./migrations");

function databasePath(root) {
  return path.join(root, ".sb-kit", "tracker.sqlite");
}

function configure(db) {
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  return db;
}

function openDatabase(root) {
  return configure(new Database(databasePath(root)));
}

function appliedVersions(db) {
  const exists = db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'",
  ).get();
  if (!exists) return new Set();
  return new Set(db.prepare("SELECT version FROM schema_migrations").all().map((row) => row.version));
}

function initializeDatabase(root, migrationList = migrations) {
  fs.mkdirSync(path.dirname(databasePath(root)), { recursive: true });
  const existed = fs.existsSync(databasePath(root));
  const db = openDatabase(root);
  const applied = appliedVersions(db);
  const pending = migrationList.filter((migration) => !applied.has(migration.version));

  if (existed && pending.length) {
    db.pragma("wal_checkpoint(TRUNCATE)");
    fs.copyFileSync(databasePath(root), `${databasePath(root)}.bak`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const migrate = db.transaction(() => {
    for (const migration of pending) {
      db.exec(migration.sql);
      db.prepare(
        "INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)",
      ).run(migration.version, new Date().toISOString());
    }
  });
  migrate();
  return db;
}

module.exports = { databasePath, initializeDatabase, openDatabase };
```

- [ ] **Step 6: Run the focused storage tests**

Run:

```powershell
node --test test-tracker-core.js
```

Expected: two passing tests.

### Task 3: Implement Sessions and Daily Grouping

**Files:**

- Create: `tracker/core.js`
- Modify: `test-tracker-core.js`

- [ ] **Step 1: Add failing session tests**

Append tests using an injected clock:

```js
const { createTracker } = require("./tracker/core");

test("creates, updates, lists, and archives sessions by local date", () => {
  const root = temporaryRepository();
  try {
    initializeRepository(root);
    initializeDatabase(root).close();
    const tracker = createTracker({
      root,
      now: () => new Date(2026, 6, 30, 10, 0, 0),
    });

    const session = tracker.createSession({
      title: "Payment retry",
      summary: "Plan and implement retries",
      actor: "human",
    });
    tracker.updateSession(session.id, { summary: "Retry with idempotency", actor: "codex" });

    assert.strictEqual(tracker.listSessions({ date: "2026-07-30" }).length, 1);
    assert.strictEqual(tracker.getSession(session.id).updatedBy, "codex");

    tracker.archiveSession(session.id, "human");
    assert.strictEqual(tracker.listSessions({ date: "2026-07-30" }).length, 0);
    assert.strictEqual(tracker.listSessions({ date: "2026-07-30", archived: true }).length, 1);
    tracker.close();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the test and confirm `createTracker` is missing**

Run:

```powershell
node --test test-tracker-core.js
```

Expected: failure because `tracker/core.js` does not exist.

- [ ] **Step 3: Implement the core constructor and session methods**

Create `tracker/core.js` with this public shape:

```js
function createTracker({ root, now = () => new Date() }) {
  const db = openDatabase(root);
  const timestamp = () => now().toISOString();

  return {
    createSession(input) {},
    listSessions(input = {}) {},
    getSession(id) {},
    updateSession(id, input) {},
    archiveSession(id, actor) {},
    createTask(input) {},
    listTasks(sessionId) {},
    getTask(id) {},
    updateTask(id, input) {},
    addArtifact(input) {},
    listArtifacts(sessionId) {},
    getArtifact(id) {},
    getActivity(entityType, entityId) {},
    dailySummary(date) {},
    handoff(taskId) {},
    close: () => db.close(),
  };
}
```

Implement session SQL with named prepared statements. Normalize rows to camelCase in one local `mapSession(row)` function. `listSessions()` must:

1. Resolve `today`, `yesterday`, or `YYYY-MM-DD`.
2. Build local midnight boundaries with `new Date(year, monthIndex, day)`.
3. Compare stored UTC ISO strings against `start.toISOString()` and `end.toISOString()`.
4. Exclude archived sessions unless `archived: true`.
5. Return task counts through correlated `COUNT` expressions rather than a second query per session.

`updateSession` and `archiveSession` must update the session and insert an activity row in one `db.transaction()`.

- [ ] **Step 4: Run session tests**

Run:

```powershell
node --test test-tracker-core.js
```

Expected: all storage and session tests pass.

### Task 4: Implement Task Workflow and Activity

**Files:**

- Modify: `tracker/core.js`
- Modify: `test-tracker-core.js`

- [ ] **Step 1: Add failing task-transition tests**

Append:

```js
test("validates task transitions and records activity atomically", () => {
  const root = temporaryRepository();
  try {
    initializeRepository(root);
    initializeDatabase(root).close();
    const tracker = createTracker({ root });
    const session = tracker.createSession({ title: "Retry", actor: "human" });
    const task = tracker.createTask({
      sessionId: session.id,
      title: "Implement retry",
      acceptanceCriteria: "- Retries transient errors",
      actor: "human",
    });

    assert.throws(
      () => tracker.updateTask(task.id, { status: "blocked", actor: "codex" }),
      /blocked reason/i,
    );
    assert.throws(
      () => tracker.updateTask(task.id, { status: "done", actor: "codex" }),
      /invalid task transition/i,
    );

    tracker.updateTask(task.id, { status: "in_progress", actor: "codex" });
    tracker.updateTask(task.id, {
      status: "blocked",
      blockedReason: "Missing contract",
      actor: "codex",
    });
    tracker.updateTask(task.id, { status: "in_progress", actor: "codex" });
    tracker.updateTask(task.id, { status: "done", actor: "codex" });

    const current = tracker.getTask(task.id);
    assert.strictEqual(current.status, "done");
    assert.ok(current.completedAt);
    assert.strictEqual(tracker.getActivity("task", task.id).length, 5);
    tracker.close();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the test and confirm task methods fail**

Run:

```powershell
node --test test-tracker-core.js
```

Expected: failure at the first unimplemented task operation.

- [ ] **Step 3: Implement task creation, listing, and transitions**

Use the fixed transition map:

```js
const TRANSITIONS = {
  todo: new Set(["in_progress"]),
  in_progress: new Set(["blocked", "done"]),
  blocked: new Set(["in_progress"]),
  done: new Set(["in_progress"]),
};
```

`createTask()` must verify the session exists, assign `position` to `MAX(position) + 1` within the session, default the actor to `unknown`, and record `task.created`.

`updateTask()` must:

- reject status values outside the four system statuses
- reject transitions not present in `TRANSITIONS`
- require non-empty `blockedReason` when moving to `blocked`
- clear `blockedReason` when leaving `blocked`
- set `completedAt` only when moving to `done`
- clear `completedAt` when reopening
- update editable text fields and `position` in the same mutation
- record `task.updated` or `task.status_changed` with the actor

- [ ] **Step 4: Run task tests**

Run:

```powershell
node --test test-tracker-core.js
```

Expected: all tests pass.

### Task 5: Implement Session Artifacts, Handoff, and Daily Summary

**Files:**

- Create: `tracker/handoff.js`
- Modify: `tracker/core.js`
- Modify: `test-tracker-core.js`

- [ ] **Step 1: Add failing artifact and handoff tests**

Append:

```js
test("versions session artifacts and generates a non-mutating handoff", () => {
  const root = temporaryRepository();
  try {
    initializeRepository(root);
    initializeDatabase(root).close();
    fs.mkdirSync(path.join(root, "docs"), { recursive: true });
    fs.writeFileSync(path.join(root, "docs", "retry-v1.md"), "# Retry v1\n");
    fs.writeFileSync(path.join(root, "docs", "retry-v2.md"), "# Retry v2\n");

    const tracker = createTracker({ root });
    const session = tracker.createSession({
      title: "Payment retry",
      summary: "Make retries safe",
      actor: "human",
    });
    const task = tracker.createTask({
      sessionId: session.id,
      title: "Implement retry",
      acceptanceCriteria: "- Read the latest retry spec",
      actor: "human",
    });

    tracker.addArtifact({
      sessionId: session.id,
      type: "spec",
      key: "payment-retry",
      title: "Retry spec",
      path: "docs/retry-v1.md",
      actor: "codex",
    });
    tracker.addArtifact({
      sessionId: session.id,
      type: "spec",
      key: "payment-retry",
      title: "Retry spec",
      path: "docs/retry-v2.md",
      actor: "codex",
    });

    const artifacts = tracker.listArtifacts(session.id);
    assert.deepStrictEqual(artifacts.map((item) => [item.version, item.latest]), [
      [2, true],
      [1, false],
    ]);
    assert.throws(
      () => tracker.addArtifact({
        sessionId: session.id,
        type: "doc",
        key: "outside",
        title: "Outside",
        path: "../outside.md",
        actor: "codex",
      }),
      /inside the repository/i,
    );

    const before = tracker.getTask(task.id);
    const prompt = tracker.handoff(task.id);
    const after = tracker.getTask(task.id);
    assert.match(prompt, /Payment retry/);
    assert.match(prompt, /artifact list --session/);
    assert.match(prompt, /Do not commit unless explicitly requested/);
    assert.deepStrictEqual(after, before);
    tracker.close();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the test and confirm artifact methods fail**

Run:

```powershell
node --test test-tracker-core.js
```

Expected: failure at `addArtifact`.

- [ ] **Step 3: Implement artifact versioning**

`addArtifact()` must call `resolveArtifactPath(root, input.path)`, verify the session, and insert within a transaction. Compute the next version with:

```sql
SELECT COALESCE(MAX(version), 0) + 1 AS version
FROM artifacts
WHERE session_id = ? AND key = ?
```

`listArtifacts()` must order by `key`, then `version DESC`, and expose:

```js
latest: row.version === latestVersionByKey.get(row.key)
```

Record `artifact.created` activity. Do not create a task-to-artifact link.

- [ ] **Step 4: Implement deterministic handoff text**

Create `tracker/handoff.js` exporting:

```js
function buildHandoff({ root, session, task, artifacts }) {
  const artifactLines = artifacts
    .map((artifact) =>
      `- [${artifact.type}] ${artifact.title} (${artifact.path}, v${artifact.version}${artifact.latest ? ", latest" : ""})`,
    )
    .join("\n");

  return `Repository: ${root}
Session #${session.id}: ${session.title}
Session summary: ${session.summary || "(none)"}

Task #${task.id}: ${task.title}
Description: ${task.description || "(none)"}
Acceptance criteria:
${task.acceptanceCriteria || "(none)"}

Available session artifacts:
${artifactLines || "(none)"}

Before implementation:
1. Read AGENTS.md and follow repository instructions.
2. Run \`sb-kit track artifact list --session ${session.id}\` or call \`artifact_list\`.
3. Select and read the specs, implementation plans, and docs relevant to this task.
4. Mark task ${task.id} in_progress with your agent name when work starts.
5. Mark it done when complete, or blocked with a reason when work cannot continue.
6. Do not commit unless explicitly requested.
`;
}

module.exports = { buildHandoff };
```

`core.handoff(taskId)` reads current session, task, and all session artifacts, then calls `buildHandoff()` without writing to SQLite.

- [ ] **Step 5: Implement daily summary**

`dailySummary(date)` reuses the same local date boundaries as `listSessions()` and returns:

```js
{
  date: "YYYY-MM-DD",
  sessions: [{
    id,
    title,
    summary,
    createdAt,
    counts: { todo, inProgress, blocked, done, total },
    tasks,
  }],
}
```

Use one task query for all returned session IDs and group in JavaScript. Do not execute one query per session.

- [ ] **Step 6: Run the complete core test**

Run:

```powershell
node --test test-tracker-core.js
```

Expected: all core tests pass.

### Task 6: Expose the Full CLI Contract

**Files:**

- Modify: `tracker/cli.js`
- Create: `test-tracker-cli.js`

- [ ] **Step 1: Write failing spawned CLI tests**

Create `test-tracker-cli.js` with a helper that spawns `cli.js` in a temporary Git repository. Cover:

```js
const initialized = run(root, ["track", "init", "--json"]);
assert.strictEqual(initialized.status, 0, initialized.stderr);

const createdSession = JSON.parse(
  run(root, [
    "track", "session", "create",
    "--title", "Payment retry",
    "--summary", "Make retries safe",
    "--actor", "human",
    "--json",
  ]).stdout,
);
assert.strictEqual(createdSession.title, "Payment retry");

const createdTask = JSON.parse(
  run(root, [
    "track", "task", "create",
    "--session", String(createdSession.id),
    "--title", "Implement retry",
    "--actor", "human",
    "--json",
  ]).stdout,
);

const updated = JSON.parse(
  run(root, [
    "track", "task", "update", String(createdTask.id),
    "--status", "in_progress",
    "--actor", "codex",
    "--json",
  ]).stdout,
);
assert.strictEqual(updated.status, "in_progress");
assert.strictEqual(updated.updatedBy, "codex");
```

Also assert that an invalid transition exits non-zero and emits `{ "error": { "message": "..." } }` when `--json` is present.

- [ ] **Step 2: Run the CLI test and confirm the stub fails**

Run:

```powershell
node --test test-tracker-cli.js
```

Expected: failure from the temporary tracker stub.

- [ ] **Step 3: Implement parsing and command dispatch**

Replace the stub with:

```js
async function run(argv, io = process) {
  const { command, positionals, options } = parseArguments(argv);
  // Dispatch init, serve, mcp, session, task, artifact, handoff, and summary.
  // Print one JSON document when options.json is true.
  // Otherwise print concise human-readable output.
}
```

`parseArguments()` must support `--key value`, boolean `--json`, and dashed-to-camel option names. It must not use `eval`, shell parsing, or another CLI dependency.

Implement these exact command paths:

```text
init
serve
mcp
session create|list|show|update|archive
task create|list|show|update
artifact add|list|show
handoff <taskId>
summary --date <today|yesterday|YYYY-MM-DD>
```

For every command except `init`, discover the repository through `findTrackerRoot(process.cwd())`. Default mutation actor to `unknown`. Catch errors once at the `run()` boundary, set `process.exitCode = 1`, and choose text or structured JSON output based on `--json`.

- [ ] **Step 4: Run CLI integration tests**

Run:

```powershell
node --test test-tracker-cli.js
```

Expected: all CLI cases pass.

### Task 7: Add Local MCP Tools

**Files:**

- Create: `tracker/mcp.js`
- Create: `test-tracker-mcp.js`
- Modify: `tracker/cli.js`

- [ ] **Step 1: Write failing MCP handler tests**

Create `test-tracker-mcp.js`. Initialize a temporary repository and call exported handlers without starting a transport:

```js
const handlers = createHandlers(tracker);
const sessionResult = await handlers.session_create({
  title: "Payment retry",
  summary: "Make retries safe",
  actor: "human",
});
const taskResult = await handlers.task_create({
  sessionId: sessionResult.id,
  title: "Implement retry",
  actor: "codex",
});
const updated = await handlers.task_update({
  id: taskResult.id,
  status: "in_progress",
  actor: "codex",
});

assert.strictEqual(updated.updatedBy, "codex");
assert.strictEqual((await handlers.session_list({ date: "today" })).length, 1);
assert.match((await handlers.handoff_get({ taskId: taskResult.id })).prompt, /Implement retry/);
```

Verify that `artifact_list` returns all session artifacts without task filtering.

- [ ] **Step 2: Run the MCP test and confirm the module is missing**

Run:

```powershell
node --test test-tracker-mcp.js
```

Expected: missing-module failure.

- [ ] **Step 3: Implement reusable MCP handlers**

Create `createHandlers(tracker)` with these keys:

```text
session_create, session_list, session_get, session_update, session_archive
task_create, task_list, task_get, task_update
artifact_add, artifact_list, artifact_get
handoff_get, daily_summary
```

Handlers return plain camelCase objects. `handoff_get` returns `{ prompt }`.

- [ ] **Step 4: Register tools and connect `stdio`**

In `runMcp(root)`, dynamically import:

```js
const { McpServer } = await import("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = await import(
  "@modelcontextprotocol/sdk/server/stdio.js"
);
const { z } = await import("zod");
```

Register every handler with explicit Zod input fields and descriptions. Convert success to:

```js
{
  content: [{ type: "text", text: JSON.stringify(value) }],
  structuredContent: value,
}
```

Convert failures to:

```js
{
  content: [{ type: "text", text: error.message }],
  isError: true,
}
```

Connect one `StdioServerTransport`. Add `track mcp` dispatch in `tracker/cli.js`; it discovers the tracker root and does not start the HTTP server.

- [ ] **Step 5: Run MCP handler and CLI regression tests**

Run:

```powershell
node --test test-tracker-mcp.js test-tracker-cli.js
```

Expected: all tests pass.

### Task 8: Add the Loopback HTTP API

**Files:**

- Create: `tracker/server.js`
- Create: `test-tracker-server.js`
- Modify: `tracker/cli.js`

- [ ] **Step 1: Write failing HTTP tests**

Create `test-tracker-server.js` and start the server on an ephemeral port:

```js
const instance = await startServer({
  root,
  host: "127.0.0.1",
  port: 0,
  openBrowser: false,
});

try {
  const sessionResponse = await fetch(`${instance.url}/api/sessions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ title: "Payment retry", actor: "human" }),
  });
  assert.strictEqual(sessionResponse.status, 201);
  const session = await sessionResponse.json();

  const boardResponse = await fetch(`${instance.url}/api/summary?date=today`);
  assert.strictEqual(boardResponse.status, 200);
  assert.strictEqual((await boardResponse.json()).sessions[0].id, session.id);

  const pageResponse = await fetch(instance.url);
  assert.match(await pageResponse.text(), /Agent Session Tracker/);
} finally {
  await instance.close();
}
```

- [ ] **Step 2: Run the test and confirm the server module is missing**

Run:

```powershell
node --test test-tracker-server.js
```

Expected: missing-module failure.

- [ ] **Step 3: Implement the API and static server**

Create `startServer({ root, host = "127.0.0.1", port = 41737, openBrowser = false })`. Reject non-loopback hosts in the first version.

Implement:

```text
GET    /api/summary?date=
GET    /api/sessions?date=&archived=
POST   /api/sessions
GET    /api/sessions/:id
PATCH  /api/sessions/:id
POST   /api/sessions/:id/archive
POST   /api/tasks
GET    /api/tasks/:id
PATCH  /api/tasks/:id
GET    /api/artifacts?sessionId=
POST   /api/artifacts
GET    /api/artifacts/:id
GET    /api/handoff/:taskId
GET    /, /app.js, /styles.css
```

Use `new URL(request.url, "http://localhost")`, a bounded JSON body reader that rejects bodies larger than 1 MiB, and an explicit route table. Return:

```js
{ error: { message: error.message } }
```

with status `400` for validation failures and `404` for unknown routes. Do not serve arbitrary filesystem paths.

- [ ] **Step 4: Wire `track serve`**

`tracker/cli.js` calls `startServer()` and prints the local URL. Keep the process alive through the HTTP listener. Do not auto-open a browser unless a future explicit flag is added.

- [ ] **Step 5: Run server tests**

Run:

```powershell
node --test test-tracker-server.js
```

Expected: API and static-page smoke tests pass.

### Task 9: Build the Daily Board UI

**Files:**

- Create: `tracker/ui/index.html`
- Create: `tracker/ui/app.js`
- Create: `tracker/ui/styles.css`
- Modify: `test-tracker-server.js`

- [ ] **Step 1: Extend the static UI smoke test**

Assert the served HTML contains stable hooks:

```js
assert.match(page, /id="board-date"/);
assert.match(page, /id="session-list"/);
assert.match(page, /id="session-form"/);
assert.match(page, /id="task-form"/);
assert.match(page, /id="artifact-form"/);
```

Run `node --test test-tracker-server.js` and expect failure because the UI files are not present.

- [ ] **Step 2: Create accessible page structure**

`tracker/ui/index.html` must contain:

- a header with previous day, **Today**, and next day controls
- `#board-date` and aggregate task counts
- `#session-list`
- native `<dialog>` forms for session, task, and artifact editing
- labeled fields and submit/cancel buttons
- one `aria-live="polite"` status region
- references to `/styles.css` and deferred `/app.js`

Use native buttons, forms, labels, and dialogs rather than custom control libraries.

- [ ] **Step 3: Implement board state and polling**

`tracker/ui/app.js` owns:

```js
const state = {
  date: localDateKey(new Date()),
  summary: null,
  editingSession: null,
  editingTask: null,
};
```

Implement these named functions:

```text
api(path, options)
localDateKey(date)
loadBoard()
renderBoard(summary)
renderSession(session)
renderTask(task, session)
openSessionForm(session?)
openTaskForm(sessionId, task?)
openArtifactForm(sessionId)
copyHandoff(taskId)
changeDate(offset)
showStatus(message, isError?)
```

Poll `loadBoard()` every two seconds only while `document.visibilityState === "visible"`. Preserve open dialogs and focused form fields during polling by replacing only `#session-list`.

Task status controls expose only transitions valid from the current status. A blocked transition prompts for `blockedReason`. **Copy prompt** calls `/api/handoff/:taskId`, then `navigator.clipboard.writeText(prompt)`; it does not call a task mutation endpoint.

- [ ] **Step 4: Implement forms**

Session form creates or patches title and summary. Task form creates or patches title, description, acceptance criteria, position, and status. Artifact form posts:

```js
{
  sessionId,
  type,
  key,
  title,
  path,
  actor: "human",
}
```

Render artifacts grouped by `key`, display the latest version by default, and reveal older versions in a native `<details>` element.

- [ ] **Step 5: Add compact responsive styling**

`tracker/ui/styles.css` must provide:

- system font stack and semantic CSS custom properties
- a centered board with session cards
- visible keyboard focus
- status colors that retain text labels
- stacked task controls below 720 px
- reduced-motion handling

Do not add fonts, icons, CSS frameworks, animations, or a theme system.

- [ ] **Step 6: Run server/UI smoke tests**

Run:

```powershell
node --test test-tracker-server.js
```

Expected: all API and static UI assertions pass.

### Task 10: Document and Verify the Packaged Feature

**Files:**

- Modify: `README.md`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Document the optional tracker**

Add a `## Local session tracker` section covering:

```bash
npx sb-kit track init
npx sb-kit track serve
npx sb-kit track session create --title "Payment retry" --summary "..."
npx sb-kit track task create --session 1 --title "Implement retry"
npx sb-kit track handoff 1
npx sb-kit track summary --date today
npx sb-kit track mcp
```

State that:

- data stays in `.sb-kit/tracker.sqlite`
- `.sb-kit/` is ignored by Git
- CLI and MCP work without the web server
- the server listens only on `127.0.0.1`
- artifacts are repository-relative file references
- tasks use fixed statuses
- Node.js 22.13 or newer is required

Include a minimal MCP client configuration whose command invokes `sb-kit track mcp` from the target repository.

- [ ] **Step 2: Verify the package test script**

Ensure `package.json` contains:

```json
"test": "node --test test-cli.js test-tracker-core.js test-tracker-cli.js test-tracker-mcp.js test-tracker-server.js"
```

Run:

```powershell
npm test
```

Expected: all installer, core, CLI, MCP handler, server, and UI smoke tests pass with zero failures.

- [ ] **Step 3: Verify CLI help and package contents**

Run:

```powershell
node cli.js --help
npm pack --dry-run
```

Expected:

- help lists `track init` and `track serve`
- the dry-run package contains `cli.js`, `.agents/`, and `tracker/`
- `.sb-kit/`, test files, and local databases are not packaged

- [ ] **Step 4: Perform one disposable end-to-end check**

In a temporary Git repository:

```powershell
node <SB_KIT_REPO>\cli.js track init
node <SB_KIT_REPO>\cli.js track session create --title "Smoke session" --json
node <SB_KIT_REPO>\cli.js track task create --session 1 --title "Smoke task" --json
node <SB_KIT_REPO>\cli.js track handoff 1
```

Expected:

- `.sb-kit/tracker.sqlite` exists
- session and task commands emit valid JSON
- the handoff contains repository, session, task, artifact-discovery, status-update, and no-commit instructions

Do not leave the temporary repository running and do not commit generated files.

## Self-review

- **Spec coverage:** Tasks 1–2 preserve the installer and create optional repository storage. Tasks 3–5 implement sessions, fixed-status tasks, session-level artifact versions, activity history, daily summaries, and non-mutating handoffs. Tasks 6–8 expose the same core through CLI, MCP, and loopback HTTP. Task 9 implements the editable daily board and two-second polling. Task 10 documents and verifies packaging.
- **Scope:** The feature remains repository-local. It adds no cloud sync, authentication, global multi-repository dashboard, transcript parsing, Kanban, custom statuses, daemon, WebSocket, hard delete, ORM, HTTP framework, or frontend framework.
- **Contract consistency:** Artifacts use `sessionId`, never `taskId`. Latest is derived from `(sessionId, key, version)`. Tasks use `todo`, `in_progress`, `blocked`, and `done`. Mutation inputs consistently use `actor`; stored API output uses `createdBy` and `updatedBy`.
- **No placeholders:** Every task names exact files, commands, expected results, interfaces, status rules, endpoint paths, and verification behavior.
