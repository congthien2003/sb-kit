const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

function runInstall(input) {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-"));
  const result = spawnSync(process.execPath, [path.join(__dirname, "cli.js"), "install"], {
    cwd: target,
    input,
    encoding: "utf8",
    shell: false,
    windowsHide: true,
    env: { ...process.env, NODE_PATH: undefined },
  });

  return { target, result };
}

function assertSbKitSkills(target, root) {
  assert.ok(fs.existsSync(path.join(target, root, "skills", "sk-excute")));
  assert.ok(fs.existsSync(path.join(target, root, "skills", "sk-visualizer")));
  assert.ok(fs.existsSync(path.join(target, root, "skills", "sk-create-slide")));
  assert.ok(fs.existsSync(path.join(target, root, "skills", "sk-release")));
  assert.ok(fs.existsSync(path.join(target, root, "skills", "sk-doc")));
  assert.ok(!fs.existsSync(path.join(target, root, "skills", "frontend-design")));
}

const noClaude = runInstall("\u001B[B\n\n");
try {
  assert.strictEqual(noClaude.result.status, 0, noClaude.result.stderr);
  assertSbKitSkills(noClaude.target, ".agents");
  assert.ok(!fs.existsSync(path.join(noClaude.target, ".claude")));
} finally {
  fs.rmSync(noClaude.target, { recursive: true, force: true });
}

const withClaude = runInstall("\u001B[B\n\u001B[B\n");
try {
  assert.strictEqual(withClaude.result.status, 0, withClaude.result.stderr);
  assertSbKitSkills(withClaude.target, ".agents");
  assertSbKitSkills(withClaude.target, ".claude");
  console.log("sb-kit installation passed");
} finally {
  fs.rmSync(withClaude.target, { recursive: true, force: true });
}
