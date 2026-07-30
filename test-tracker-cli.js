const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

test("CLI initializes and updates tracker data as JSON", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sb-track-cli-"));
  fs.mkdirSync(path.join(root, ".git"));
  const run = (args) =>
    spawnSync(
      process.execPath,
      [path.join(__dirname, "cli.js"), "track", ...args],
      { cwd: root, encoding: "utf8" },
    );
  try {
    assert.equal(run(["init", "--json"]).status, 0);
    const session = JSON.parse(
      run([
        "session",
        "create",
        "--title",
        "Retry",
        "--actor",
        "human",
        "--json",
      ]).stdout,
    );
    const task = JSON.parse(
      run([
        "task",
        "create",
        "--session",
        String(session.id),
        "--title",
        "Implement",
        "--actor",
        "human",
        "--json",
      ]).stdout,
    );
    const updated = JSON.parse(
      run([
        "task",
        "update",
        String(task.id),
        "--status",
        "in_progress",
        "--actor",
        "codex",
        "--json",
      ]).stdout,
    );
    assert.equal(updated.updatedBy, "codex");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
