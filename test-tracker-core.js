const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

const { initializeRepository, findTrackerRoot } = require("./tracker/repository");
const { initializeDatabase, openDatabase } = require("./tracker/database");
const { createTracker } = require("./tracker/core");

function tempRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sb-track-"));
  fs.mkdirSync(path.join(root, ".git"));
  return root;
}

test("tracks sessions, tasks, artifacts, activity, and handoff", () => {
  const root = tempRepo();
  let tracker;
  try {
    initializeRepository(root);
    initializeDatabase(root).close();
    assert.equal(findTrackerRoot(root), root);
    assert.match(fs.readFileSync(path.join(root, ".gitignore"), "utf8"), /^\.sb-kit\/$/m);

    tracker = createTracker({ root, now: () => new Date(2026, 6, 30, 10) });
    const session = tracker.createSession({ title: "Retry", summary: "Safe retries", actor: "human" });
    const task = tracker.createTask({ sessionId: session.id, title: "Implement", actor: "human" });
    tracker.updateTask(task.id, { status: "in_progress", actor: "codex" });
    assert.throws(() => tracker.updateTask(task.id, { status: "blocked", actor: "codex" }), /reason/i);
    tracker.updateTask(task.id, { status: "blocked", blockedReason: "Missing contract", actor: "codex" });
    const editedBlocked = tracker.updateTask(task.id, { title: "Implement safely", actor: "human" });
    assert.equal(editedBlocked.blockedReason, "Missing contract");
    tracker.updateTask(task.id, { status: "in_progress", actor: "codex" });
    tracker.updateTask(task.id, { status: "done", actor: "codex" });

    fs.mkdirSync(path.join(root, "docs"));
    fs.writeFileSync(path.join(root, "docs", "spec.md"), "# Spec");
    fs.writeFileSync(path.join(root, "docs", "spec-v2.md"), "# Spec v2");
    tracker.addArtifact({ sessionId: session.id, type: "spec", key: "retry", title: "Retry", path: "docs/spec.md", actor: "codex" });
    tracker.addArtifact({ sessionId: session.id, type: "spec", key: "retry", title: "Retry", path: "docs/spec-v2.md", actor: "codex" });
    const notes = tracker.addArtifact({ sessionId: session.id, type: "doc", key: "notes", path: "docs/spec.md", actor: "codex" });
    assert.equal(notes.title, "notes");
    assert.deepEqual(
      tracker.listArtifacts(session.id)
        .filter((x) => x.key === "retry")
        .map((x) => [x.version, x.latest]),
      [[2, true], [1, false]],
    );
    assert.throws(() => tracker.addArtifact({ sessionId: session.id, type: "doc", key: "bad", title: "Bad", path: "../bad.md" }), /inside/i);
    assert.match(tracker.handoff(task.id), /Do not commit unless explicitly requested/);
    assert.equal(tracker.listSessions({ date: "2026-07-30" }).length, 1);
    const summary = tracker.dailySummary("2026-07-30");
    assert.equal(summary.sessions[0].counts.done, 1);
    assert.deepEqual(
      summary.sessions[0].artifacts
        .filter((x) => x.key === "retry")
        .map((x) => [x.version, x.latest]),
      [[2, true], [1, false]],
    );
    assert.ok(tracker.getActivity("task", task.id).length >= 3);
  } finally {
    tracker?.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("rolls back entity creation when activity logging fails", () => {
  const root = tempRepo();
  let tracker;
  try {
    initializeRepository(root);
    initializeDatabase(root).close();
    tracker = createTracker({ root });
    const sabotage = openDatabase(root);
    sabotage.exec("DROP TABLE activity_log");
    sabotage.close();

    assert.throws(() => tracker.createSession({ title: "Must roll back", actor: "human" }));
    const verify = openDatabase(root);
    assert.equal(verify.prepare("SELECT COUNT(*) count FROM sessions").get().count, 0);
    verify.close();
  } finally {
    tracker?.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
