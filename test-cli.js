const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  SB_KIT_SKILLS,
  createNextHonoProject,
  install,
  parseCreateArgs,
  runCommand,
} = require("./cli");

function runInstall({ claude = false } = {}) {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-"));
  assert.strictEqual(install(SB_KIT_SKILLS, ".agents", target), true);
  if (claude) assert.strictEqual(install(SB_KIT_SKILLS, ".claude", target), true);

  return { target };
}

const CORE_ROLE_SKILLS = [
  "sk-excute-explorer",
  "sk-excute-researcher",
  "sk-excute-reviewer",
  "sk-excute-implementer",
];

function assertSbKitSkills(target, root) {
  const expectedSkills = [
    "sk-excute",
    ...CORE_ROLE_SKILLS,
    "sk-visualizer",
    "sk-create-slide",
    "sk-release",
    "sk-doc",
    "sk-start-next-hono",
  ];

  assert.deepStrictEqual(SB_KIT_SKILLS, expectedSkills);
  for (const skill of expectedSkills) {
    assert.ok(fs.existsSync(path.join(target, root, "skills", skill)), skill);
  }
  assert.ok(!fs.existsSync(path.join(target, root, "skills", "frontend-design")));
}

function createFakeRunner(calls, { failHono = false } = {}) {
  return (command, args, options) => {
    calls.push({ command, args, cwd: options.cwd });

    if (args.length === 1 && args[0] === "--version") {
      return { status: 0, stdout: "10.15.0\n", stderr: "" };
    }

    if (args.includes("next-app@latest")) {
      const client = path.join(options.cwd, "client");
      fs.mkdirSync(client, { recursive: true });
      fs.writeFileSync(
        path.join(client, "package.json"),
        JSON.stringify({ name: "client", scripts: {} }),
      );
      fs.writeFileSync(path.join(client, "package-lock.json"), "{}");
      fs.writeFileSync(path.join(client, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
      fs.writeFileSync(path.join(client, "pnpm-workspace.yaml"), "packages: []");
    }

    if (args.includes("hono@latest")) {
      if (failHono) return { status: 1, stdout: "", stderr: "hono failed" };
      const server = path.join(options.cwd, "server");
      fs.mkdirSync(server, { recursive: true });
      fs.writeFileSync(
        path.join(server, "package.json"),
        JSON.stringify({ name: "server", scripts: {} }),
      );
      fs.writeFileSync(path.join(server, "bun.lock"), "");
    }

    return { status: 0, stdout: "", stderr: "" };
  };
}

function runFakeCreate({ claude = false, failHono = false } = {}) {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-create-"));
  const calls = [];
  const logs = [];

  try {
    const handoff = createNextHonoProject(
      { projectPath: "my-app", claude },
      {
        cwd: parent,
        run: createFakeRunner(calls, { failHono }),
        log: (message) => logs.push(message),
      },
    );
    return { parent, target: path.join(parent, "my-app"), calls, logs, handoff };
  } catch (error) {
    error.parent = parent;
    error.calls = calls;
    throw error;
  }
}

const noClaude = runInstall();
try {
  assertSbKitSkills(noClaude.target, ".agents");
  assert.ok(!fs.existsSync(path.join(noClaude.target, ".claude")));
} finally {
  fs.rmSync(noClaude.target, { recursive: true, force: true });
}

const withClaude = runInstall({ claude: true });
try {
  assertSbKitSkills(withClaude.target, ".agents");
  assertSbKitSkills(withClaude.target, ".claude");
  console.log("sb-kit installation passed");
} finally {
  fs.rmSync(withClaude.target, { recursive: true, force: true });
}

assert.deepStrictEqual(parseCreateArgs(["my-app"]), {
  projectPath: "my-app",
  claude: false,
});
assert.deepStrictEqual(parseCreateArgs(["my-app", "--claude"]), {
  projectPath: "my-app",
  claude: true,
});
assert.throws(() => parseCreateArgs([]), /project name/i);
assert.throws(() => parseCreateArgs(["my-app", "--unknown"]), /unknown option/i);
assert.throws(() => parseCreateArgs(["one", "two"]), /unexpected argument/i);

if (process.platform === "win32") {
  const pnpmVersion = runCommand("pnpm.cmd", ["--version"], {
    cwd: __dirname,
    capture: true,
  });
  assert.strictEqual(pnpmVersion.status, 0, pnpmVersion.error?.message);
  assert.match(pnpmVersion.stdout, /^\d+\.\d+\.\d+/);
}

const defaultCreate = runFakeCreate();
try {
  const rootPackage = JSON.parse(
    fs.readFileSync(path.join(defaultCreate.target, "package.json"), "utf8"),
  );
  const clientPackage = JSON.parse(
    fs.readFileSync(path.join(defaultCreate.target, "client", "package.json"), "utf8"),
  );
  const serverPackage = JSON.parse(
    fs.readFileSync(path.join(defaultCreate.target, "server", "package.json"), "utf8"),
  );

  assert.strictEqual(rootPackage.name, "my-app");
  assert.strictEqual(rootPackage.packageManager, "pnpm@10.15.0");
  assert.strictEqual(rootPackage.scripts.format, "prettier --write .");
  assert.strictEqual(clientPackage.name, "my-app-client");
  assert.strictEqual(serverPackage.name, "my-app-server");
  const workspace = fs.readFileSync(
    path.join(defaultCreate.target, "pnpm-workspace.yaml"),
    "utf8",
  );
  assert.ok(workspace.includes("client"));
  assert.ok(workspace.includes("server"));
  assert.ok(workspace.includes("esbuild: true"));
  assert.ok(workspace.includes("unrs-resolver: true"));
  assert.ok(!fs.existsSync(path.join(defaultCreate.target, "client", "package-lock.json")));
  assert.ok(!fs.existsSync(path.join(defaultCreate.target, "client", "pnpm-lock.yaml")));
  assert.ok(!fs.existsSync(path.join(defaultCreate.target, "client", "pnpm-workspace.yaml")));
  assert.ok(!fs.existsSync(path.join(defaultCreate.target, "server", "bun.lock")));
  assertSbKitSkills(defaultCreate.target, ".agents");
  assert.ok(!fs.existsSync(path.join(defaultCreate.target, ".claude")));
  assert.ok(defaultCreate.handoff.includes("$sk-start-next-hono"));
  assert.ok(defaultCreate.logs.join("\n").includes("$sk-start-next-hono"));

  const installedSkill = path.join(
    defaultCreate.target,
    ".agents",
    "skills",
    "sk-excute-implementer",
    "SKILL.md",
  );
  fs.writeFileSync(installedSkill, "user-owned role skill");
  assert.strictEqual(install(SB_KIT_SKILLS, ".agents", defaultCreate.target), true);
  assert.strictEqual(
    fs.readFileSync(installedSkill, "utf8"),
    "user-owned role skill",
  );

  assert.deepStrictEqual(
    defaultCreate.calls.map(({ args }) => args),
    [
      ["--version"],
      [
        "create",
        "next-app@latest",
        "client",
        "--ts",
        "--tailwind",
        "--eslint",
        "--app",
        "--import-alias",
        "@/*",
        "--use-pnpm",
        "--disable-git",
        "--yes",
      ],
      ["create", "hono@latest", "server", "--template", "nodejs", "--install", "--pm", "pnpm"],
      ["add", "-Dw", "prettier"],
      ["format"],
    ],
  );
} finally {
  fs.rmSync(defaultCreate.parent, { recursive: true, force: true });
}

const claudeCreate = runFakeCreate({ claude: true });
try {
  assertSbKitSkills(claudeCreate.target, ".agents");
  assertSbKitSkills(claudeCreate.target, ".claude");
} finally {
  fs.rmSync(claudeCreate.parent, { recursive: true, force: true });
}

const nonEmptyParent = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-non-empty-"));
try {
  const target = path.join(nonEmptyParent, "my-app");
  const userFile = path.join(target, "user.txt");
  const calls = [];
  fs.mkdirSync(target);
  fs.writeFileSync(userFile, "keep");

  assert.throws(
    () =>
      createNextHonoProject(
        { projectPath: "my-app" },
        { cwd: nonEmptyParent, run: createFakeRunner(calls), log: () => {} },
      ),
    /not empty/i,
  );
  assert.strictEqual(fs.readFileSync(userFile, "utf8"), "keep");
  assert.deepStrictEqual(calls, []);
} finally {
  fs.rmSync(nonEmptyParent, { recursive: true, force: true });
}

let failedCreate;
try {
  runFakeCreate({ failHono: true });
  assert.fail("Expected the Hono generator to fail.");
} catch (error) {
  failedCreate = error;
}

try {
  assert.match(failedCreate.message, /Hono/i);
  assert.ok(fs.existsSync(path.join(failedCreate.parent, "my-app", "client", "package.json")));
  assert.ok(!failedCreate.calls.some(({ args }) => args[0] === "add" || args[0] === "format"));
} finally {
  fs.rmSync(failedCreate.parent, { recursive: true, force: true });
}

console.log("sb-kit bootstrap passed");
