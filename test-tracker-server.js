const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { initializeRepository } = require("./tracker/repository");
const { initializeDatabase } = require("./tracker/database");
const { startServer } = require("./tracker/server");

test("serves daily API and three-pane UI on loopback", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "sb-track-http-"));
  fs.mkdirSync(path.join(root, ".git"));
  initializeRepository(root); initializeDatabase(root).close();
  const server = await startServer({ root, port: 0 });
  try {
    const created = await fetch(`${server.url}/api/sessions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: "Retry", actor: "human" }) });
    assert.equal(created.status, 201);
    assert.equal((await (await fetch(`${server.url}/api/summary?date=today`)).json()).sessions.length, 1);
    const page = await (await fetch(server.url)).text();
    assert.match(page, /class="workspace"/);
    assert.match(page, /id="session-sidebar"/);
    assert.match(page, /id="session-detail"/);
    assert.match(page, /id="artifact-panel"/);
    assert.match(page, /id="blocked-dialog"/);
    assert.match(page, /id="session-list"/);
    assert.match(page, /id="session-form"/);
    assert.match(page, /id="task-form"/);
    assert.match(page, /id="artifact-form"[\s\S]*name="title" required/);
    const styles = await (await fetch(`${server.url}/styles.css`)).text();
    assert.match(styles, /--canvas:\s*#f7f7f4/);
    assert.match(styles, /\.workspace\s*\{/);
    assert.match(styles, /@media \(max-width: 900px\)/);
    const app = await (await fetch(`${server.url}/app.js`)).text();
    assert.match(app, /renderArtifactType/);
    assert.match(app, /data-task-status/);
    assert.match(app, /data-archive-session/);
  } finally {
    await server.close();
    fs.rmSync(root, { recursive: true, force: true });
  }
});
