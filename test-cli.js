const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

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

function runClaudeInstall() {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-"));
  const child = spawn(process.execPath, [path.join(__dirname, "cli.js"), "install"], {
    cwd: target,
    shell: false,
    windowsHide: true,
    env: { ...process.env, NODE_PATH: undefined },
  });

  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    let step = 0;

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (step === 0 && stdout.includes("Choose skills to install:")) {
        step = 1;
        child.stdin.write("\u001B[B\r");
      } else if (step === 1 && stdout.includes("Install for Claude Code too?")) {
        step = 2;
        child.stdin.end("\u001B[B\r");
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (status) => resolve({ target, result: { status, stdout, stderr } }));
  });
}

function assertSbKitSkills(target, root) {
  assert.ok(fs.existsSync(path.join(target, root, "skills", "sk-excute")));
  assert.ok(fs.existsSync(path.join(target, root, "skills", "sk-visualizer")));
  assert.ok(fs.existsSync(path.join(target, root, "skills", "sk-create-slide")));
  assert.ok(fs.existsSync(path.join(target, root, "skills", "sk-release")));
  assert.ok(fs.existsSync(path.join(target, root, "skills", "sk-doc")));
  assert.ok(!fs.existsSync(path.join(target, root, "skills", "frontend-design")));
}

const help = spawnSync(process.execPath, [path.join(__dirname, "cli.js"), "--help"], {
  encoding: "utf8",
  shell: false,
  windowsHide: true,
});

assert.strictEqual(help.status, 0, help.stderr);
assert.match(help.stdout, /sb-kit track init/);
assert.match(help.stdout, /sb-kit track serve/);

const noClaude = runInstall("\u001B[B\r\r");
try {
  assert.strictEqual(noClaude.result.status, 0, noClaude.result.stderr);
  assertSbKitSkills(noClaude.target, ".agents");
  assert.ok(!fs.existsSync(path.join(noClaude.target, ".claude")));
} finally {
  fs.rmSync(noClaude.target, { recursive: true, force: true });
}

runClaudeInstall()
  .then((withClaude) => {
    try {
      assert.strictEqual(withClaude.result.status, 0, withClaude.result.stderr);
      assertSbKitSkills(withClaude.target, ".agents");
      assertSbKitSkills(withClaude.target, ".claude");
      console.log("sb-kit installation passed");
    } finally {
      fs.rmSync(withClaude.target, { recursive: true, force: true });
    }
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
