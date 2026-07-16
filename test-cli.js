const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const target = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-"));
const result = spawnSync(process.execPath, [path.join(__dirname, "cli.js"), "install"], {
  cwd: target,
  input: "2\n",
  encoding: "utf8",
  shell: false,
  windowsHide: true,
  env: { ...process.env, NODE_PATH: undefined },
});

try {
  assert.strictEqual(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(path.join(target, ".agents", "skills", "sk-excute")));
  assert.ok(fs.existsSync(path.join(target, ".agents", "skills", "sk-visualizer")));
  assert.ok(!fs.existsSync(path.join(target, ".agents", "skills", "frontend-design")));
  assert.ok(fs.existsSync(path.join(target, ".claude", "skills", "sk-excute")));
  assert.ok(fs.existsSync(path.join(target, ".claude", "skills", "sk-visualizer")));
  assert.ok(!fs.existsSync(path.join(target, ".claude", "skills", "frontend-design")));
  console.log("sb-kit only installation passed");
} finally {
  fs.rmSync(target, { recursive: true, force: true });
}
