const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { initializeRepository } = require("./tracker/repository");
const { initializeDatabase } = require("./tracker/database");
const { createTracker } = require("./tracker/core");
const { createHandlers } = require("./tracker/mcp");

test("MCP handlers use the shared core", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sb-track-mcp-"));
  fs.mkdirSync(path.join(root, ".git"));
  try {
    initializeRepository(root); initializeDatabase(root).close();
    const tracker = createTracker({ root });
    const handlers = createHandlers(tracker);
    const session = await handlers.session_create({ title: "Retry", actor: "human" });
    const task = await handlers.task_create({ sessionId: session.id, title: "Implement", actor: "codex" });
    const updated = await handlers.task_update({ id: task.id, status: "in_progress", actor: "codex" });
    assert.equal(updated.updatedBy, "codex");
    assert.match((await handlers.handoff_get({ taskId: task.id })).prompt, /Implement/);
    tracker.close();
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

