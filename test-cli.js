const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  ASSET_SKILLS,
  REPORT_SKILLS,
  SB_KIT_SKILLS,
  categorizedSkills,
  categoryOptions,
  chooseConflictMode,
  chooseSkills,
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
const VISUALIZER_REFERENCE_FILES = [
  "system-change-report.md",
  "spec-visualization.md",
  "implementation-plan.md",
];
const PACKAGED_SKILLS = fs
  .readdirSync(path.join(__dirname, ".agents", "skills"))
  .filter((name) => fs.statSync(path.join(__dirname, ".agents", "skills", name)).isDirectory())
  .sort();

function captureLogs(callback) {
  const originalLog = console.log;
  const logs = [];
  console.log = (message) => logs.push(message);
  try {
    callback();
  } finally {
    console.log = originalLog;
  }
  return logs;
}

function assertSbKitSkills(target, root) {
  const expectedSkills = [
    "sk-excute",
    "sk-excute-fast",
    ...CORE_ROLE_SKILLS,
    "sk-visualizer",
    "sk-create-slide",
    "sk-release",
    "sk-doc",
    "sk-start-next-hono",
    "sk-explain",
  ];

  assert.deepStrictEqual(SB_KIT_SKILLS, expectedSkills);
  assert.ok(!SB_KIT_SKILLS.includes("sk-verify-code-ui-only"));
  for (const skill of expectedSkills) {
    assert.ok(fs.existsSync(path.join(target, root, "skills", skill)), skill);
  }
  const explainSkill = path.join(target, root, "skills", "sk-explain");
  assert.ok(fs.existsSync(path.join(explainSkill, "SKILL.md")));
  assert.ok(fs.existsSync(path.join(explainSkill, "agents", "openai.yaml")));
  assert.ok(!fs.existsSync(path.join(target, root, "skills", "frontend-design")));
  assert.ok(!fs.existsSync(path.join(target, root, "skills", "sk-verify-code-ui-only")));
  assert.ok(!fs.existsSync(path.join(target, root, "skills", "sk-create-skill")));
}

function assertVisualizerReferences(target, root) {
  const sourceReferencesDir = path.join(
    __dirname,
    ".agents",
    "skills",
    "sk-visualizer",
    "references",
  );
  const installedReferencesDir = path.join(
    target,
    root,
    "skills",
    "sk-visualizer",
    "references",
  );

  for (const fileName of VISUALIZER_REFERENCE_FILES) {
    const sourceFile = path.join(sourceReferencesDir, fileName);
    const installedFile = path.join(installedReferencesDir, fileName);
    assert.ok(fs.existsSync(installedFile), fileName);
    assert.strictEqual(
      fs.readFileSync(installedFile, "utf8"),
      fs.readFileSync(sourceFile, "utf8"),
      fileName,
    );
  }
}

const categorized = categorizedSkills(PACKAGED_SKILLS);
const pickerOptions = categoryOptions(PACKAGED_SKILLS);
assert.deepStrictEqual(Object.keys(categorized), ["sk-work", "assets", "report"]);
assert.deepStrictEqual(categorized.assets, [...ASSET_SKILLS].sort());
assert.ok(!categorized.assets.includes("sk-create-skill"));
assert.deepStrictEqual(categorized.report, [...REPORT_SKILLS].sort());
assert.ok(categorized.report.includes("sk-verify-code-ui-only"));
assert.ok(!categorized.report.includes("sk-verify-code"));
assert.ok(
  Object.values(pickerOptions)
    .flat()
    .some(({ value }) => value === "sk-verify-code-ui-only"),
);
assert.ok(!categorized["sk-work"].includes("sk-verify-code-ui-only"));
assert.ok(!SB_KIT_SKILLS.includes("sk-verify-code-ui-only"));
assert.ok(!fs.existsSync(path.join(__dirname, ".agents", "skills", "sk-verify-code")));
assert.deepStrictEqual(
  Object.values(categorized).flat().sort(),
  PACKAGED_SKILLS,
);
assert.deepStrictEqual(
  Object.values(pickerOptions)
    .flat()
    .map(({ value }) => value)
    .sort(),
  PACKAGED_SKILLS,
);
assert.ok(categorized["sk-work"].includes("deep-research"));
assert.ok(categorized["sk-work"].includes("sk-excute"));
assert.ok(categorized["sk-work"].includes("sk-create-skill"));
assert.ok(!SB_KIT_SKILLS.includes("sk-create-skill"));
assert.ok(!categorized.report.includes("sk-create-skill"));
const landingSource = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
const landingCards = [...landingSource.matchAll(/<article class="skill-card">([\s\S]*?)<\/article>/g)];
const landingSkillNames = landingCards.map(([, article]) => article.match(/<h3>([^<]+)<\/h3>/)[1]);
assert.deepStrictEqual([...landingSkillNames].sort(), PACKAGED_SKILLS);
const landingCoreNames = landingCards
  .filter(([, article]) => /<span class="tag tag-core">core<\/span>/.test(article))
  .map(([, article]) => article.match(/<h3>([^<]+)<\/h3>/)[1]);
assert.deepStrictEqual(landingCoreNames.sort(), [...SB_KIT_SKILLS].sort());
const renamedSkillCards = landingCards
  .filter(([, article]) => /<h3>sk-verify-code-ui-only<\/h3>/.test(article));
assert.strictEqual(renamedSkillCards.length, 1);
assert.match(renamedSkillCards[0][1], /<span class="tag tag-support">report<\/span>/);
const createSkillCards = landingCards
  .filter(([, article]) => /<h3>sk-create-skill<\/h3>/.test(article));
assert.strictEqual(createSkillCards.length, 1);
assert.match(createSkillCards[0][1], /<span class="tag tag-support">support<\/span>/);
const supportingCount = PACKAGED_SKILLS.length - SB_KIT_SKILLS.length;
assert.ok(landingSource.includes(`<h2 class="section-label">SaboKit core / ${SB_KIT_SKILLS.length} skills</h2>`));
assert.ok(landingSource.includes(`<h2 class="section-label">Supporting / ${supportingCount} skills</h2>`));
assert.ok(landingSource.includes(`<span class="badge">${PACKAGED_SKILLS.length} agent skills</span>`));
assert.doesNotMatch(landingSource, /<h3>sk-verify-code<\/h3>/);
const readmeSource = fs.readFileSync(path.join(__dirname, "README.md"), "utf8");
const changelogSource = fs.readFileSync(path.join(__dirname, "CHANGELOG.md"), "utf8");
const packageMetadata = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
const packageLock = JSON.parse(fs.readFileSync(path.join(__dirname, "package-lock.json"), "utf8"));
assert.strictEqual(packageLock.version, packageMetadata.version);
assert.strictEqual(packageLock.packages[""].version, packageMetadata.version);
assert.ok(changelogSource.includes(`## [${packageMetadata.version}] - `));
assert.deepStrictEqual(
  [...readmeSource.matchAll(/^\| `([^`]+)` \|/gm)].map(([, name]) => name).sort(),
  PACKAGED_SKILLS,
);
assert.match(readmeSource, /`sk-create-skill`/);
assert.match(readmeSource, /cài và tự chọn.*`skill-creator`/i);
assert.match(readmeSource, /không tự cài các companion/i);
assert.match(changelogSource, /Add `sk-create-skill`/);
assert.ok(categorizedSkills(["future-skill"])["sk-work"].includes("future-skill"));

const createSkillSourceDir = path.join(__dirname, ".agents", "skills", "sk-create-skill");
const createSkillFiles = [
  "SKILL.md",
  path.join("agents", "openai.yaml"),
  path.join("evals", "evals.json"),
];
const createSkillSourceBytes = new Map(
  createSkillFiles.map((fileName) => [fileName, fs.readFileSync(path.join(createSkillSourceDir, fileName))]),
);
const createSkillSource = createSkillSourceBytes.get("SKILL.md").toString("utf8");
const createSkillMetadata = createSkillSourceBytes.get(path.join("agents", "openai.yaml")).toString("utf8");
const createSkillEvals = JSON.parse(createSkillSourceBytes.get(path.join("evals", "evals.json")));
assert.match(createSkillSource, /^name: sk-create-skill$/m);
assert.match(createSkillSource, /^description:.*English or Vietnamese.*tạo skill.*$/m);
assert.match(createSkillSource, /\.\.\/sk-excute\/SKILL\.md/);
assert.match(createSkillSource, /\.\.\/skill-creator\/SKILL\.md/);
assert.ok(fs.existsSync(path.resolve(createSkillSourceDir, "..", "sk-excute", "SKILL.md")));
assert.ok(fs.existsSync(path.resolve(createSkillSourceDir, "..", "skill-creator", "SKILL.md")));
assert.match(createSkillMetadata, /display_name: "SK Create Skill"/);
assert.ok(createSkillMetadata.includes('default_prompt: "Use $sk-create-skill'));
assert.strictEqual(createSkillEvals.skill_name, "sk-create-skill");
assert.strictEqual(createSkillEvals.evals.length, 3);
assert.deepStrictEqual(createSkillEvals.evals.map(({ id }) => id), [1, 2, 3]);
for (const evaluation of createSkillEvals.evals) {
  assert.strictEqual(typeof evaluation.prompt, "string");
  assert.strictEqual(typeof evaluation.expected_output, "string");
  assert.ok(Array.isArray(evaluation.files));
  assert.ok(Array.isArray(evaluation.expectations));
}
const evalPrompts = createSkillEvals.evals.map(({ prompt }) => prompt).join("\n");
assert.match(evalPrompts, /have not approved/i);
assert.match(evalPrompts, /approved this spec and file-scoped plan/i);
assert.match(evalPrompts, /skill-creator companion is missing/i);
assert.match(evalPrompts, /sk-ui-copy-review/);
const approvedIntegrationPrompt = createSkillEvals.evals[1].prompt;
for (const approvedPath of [
  ".agents/skills/sk-ui-copy-review/SKILL.md",
  ".agents/skills/sk-ui-copy-review/agents/openai.yaml",
  ".agents/skills/sk-ui-copy-review/evals/evals.json",
  "cli.js",
  "README.md",
  "CHANGELOG.md",
  "index.html",
  "test-cli.js",
]) {
  assert.ok(approvedIntegrationPrompt.includes(approvedPath), approvedPath);
}
assert.match(approvedIntegrationPrompt, /exactly these eight repository paths/);
assert.match(approvedIntegrationPrompt, /`approved-packet\.json` is separate, read-only approval context/);
assert.match(approvedIntegrationPrompt, /selected Inline/);
assert.match(approvedIntegrationPrompt, /node test-cli\.js.*node cli\.js --help/);
assert.match(approvedIntegrationPrompt, /Do not start a recursive evaluation/i);

const createSkillSoloTarget = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-create-skill-solo-"));
try {
  assert.strictEqual(install(["sk-create-skill"], ".agents", createSkillSoloTarget), true);
  assert.ok(!fs.existsSync(path.join(createSkillSoloTarget, ".claude")));
  const installedSkill = path.join(createSkillSoloTarget, ".agents", "skills", "sk-create-skill");
  for (const fileName of createSkillFiles) {
    assert.deepStrictEqual(
      fs.readFileSync(path.join(installedSkill, fileName)),
      createSkillSourceBytes.get(fileName),
    );
  }
  assert.ok(!fs.existsSync(path.join(createSkillSoloTarget, ".agents", "skills", "sk-excute")));
  assert.ok(!fs.existsSync(path.join(createSkillSoloTarget, ".agents", "skills", "skill-creator")));

  assert.strictEqual(install(["sk-create-skill"], ".claude", createSkillSoloTarget), true);
  for (const fileName of createSkillFiles) {
    assert.deepStrictEqual(
      fs.readFileSync(path.join(createSkillSoloTarget, ".claude", "skills", "sk-create-skill", fileName)),
      createSkillSourceBytes.get(fileName),
    );
  }
  for (const root of [".agents", ".claude"]) {
    assert.ok(!fs.existsSync(path.join(createSkillSoloTarget, root, "skills", "sk-excute")));
    assert.ok(!fs.existsSync(path.join(createSkillSoloTarget, root, "skills", "skill-creator")));
  }

  const explicitSelection = ["sk-create-skill", "sk-excute", "skill-creator"];
  for (const root of [".agents", ".claude"]) {
    assert.strictEqual(install(explicitSelection, root, createSkillSoloTarget), true);
    for (const fileName of createSkillFiles) {
      assert.deepStrictEqual(
        fs.readFileSync(path.join(createSkillSoloTarget, root, "skills", "sk-create-skill", fileName)),
        createSkillSourceBytes.get(fileName),
      );
    }
    for (const companion of ["sk-excute", "skill-creator"]) {
      const sourceCompanion = path.join(__dirname, ".agents", "skills", companion, "SKILL.md");
      const installedCompanion = path.join(createSkillSoloTarget, root, "skills", companion, "SKILL.md");
      assert.deepStrictEqual(fs.readFileSync(installedCompanion), fs.readFileSync(sourceCompanion));
    }
  }

  const sentinels = new Map();
  for (const root of [".agents", ".claude"]) {
    const skillDir = path.join(createSkillSoloTarget, root, "skills", "sk-create-skill");
    const skillFile = path.join(skillDir, "SKILL.md");
    const sentinel = `user-owned ${root} coordinator`;
    fs.writeFileSync(skillFile, sentinel);
    sentinels.set(skillFile, sentinel);
  }
  const skipLogs = captureLogs(() => {
    for (const root of [".agents", ".claude"]) {
      assert.strictEqual(install(["sk-create-skill"], root, createSkillSoloTarget), true);
    }
  });
  assert.match(skipLogs.join("\n"), /Skipped:.*sk-create-skill/);
  for (const [file, sentinel] of sentinels) {
    assert.strictEqual(fs.readFileSync(file, "utf8"), sentinel);
  }
  for (const root of [".agents", ".claude"]) {
    for (const fileName of createSkillFiles.slice(1)) {
      assert.deepStrictEqual(
        fs.readFileSync(path.join(createSkillSoloTarget, root, "skills", "sk-create-skill", fileName)),
        createSkillSourceBytes.get(fileName),
      );
    }
  }
  console.log("sk-create-skill selected installation passed");
} finally {
  fs.rmSync(createSkillSoloTarget, { recursive: true, force: true });
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
  assertVisualizerReferences(noClaude.target, ".agents");
  assert.ok(!fs.existsSync(path.join(noClaude.target, ".claude")));
} finally {
  fs.rmSync(noClaude.target, { recursive: true, force: true });
}

const withClaude = runInstall({ claude: true });
try {
  assertSbKitSkills(withClaude.target, ".agents");
  assertVisualizerReferences(withClaude.target, ".agents");
  assertSbKitSkills(withClaude.target, ".claude");
  assertVisualizerReferences(withClaude.target, ".claude");
  console.log("sb-kit installation passed");
} finally {
  fs.rmSync(withClaude.target, { recursive: true, force: true });
}

const verifyCodeTarget = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-verify-code-ui-only-"));
try {
  const sourceSkill = path.join(__dirname, ".agents", "skills", "sk-verify-code-ui-only");
  const sourceFiles = ["SKILL.md", path.join("agents", "openai.yaml")];
  const skillSource = fs.readFileSync(path.join(sourceSkill, "SKILL.md"), "utf8");
  const metadataSource = fs.readFileSync(path.join(sourceSkill, "agents", "openai.yaml"), "utf8");
  assert.match(skillSource, /^name: sk-verify-code-ui-only$/m);
  assert.match(metadataSource, /display_name: "SK Verify Code UI Only"/);
  assert.match(metadataSource, /short_description: "Audit UI-only component, typography, and spacing consistency"/);
  assert.match(metadataSource, /default_prompt: "Use \$sk-verify-code-ui-only to audit/);
  assert.strictEqual(install(["sk-verify-code-ui-only"], ".agents", verifyCodeTarget), true);
  assert.ok(!fs.existsSync(path.join(verifyCodeTarget, ".claude")));

  for (const fileName of sourceFiles) {
    assert.deepStrictEqual(
      fs.readFileSync(
        path.join(verifyCodeTarget, ".agents", "skills", "sk-verify-code-ui-only", fileName),
      ),
      fs.readFileSync(path.join(sourceSkill, fileName)),
    );
  }

  assert.strictEqual(install(["sk-verify-code-ui-only"], ".claude", verifyCodeTarget), true);
  for (const root of [".agents", ".claude"]) {
    for (const fileName of sourceFiles) {
      assert.deepStrictEqual(
        fs.readFileSync(
          path.join(verifyCodeTarget, root, "skills", "sk-verify-code-ui-only", fileName),
        ),
        fs.readFileSync(path.join(sourceSkill, fileName)),
      );
    }
  }

  const userSentinels = new Map();
  for (const root of [".agents", ".claude"]) {
    const installedSkill = path.join(verifyCodeTarget, root, "skills", "sk-verify-code-ui-only");
    const skillFile = path.join(installedSkill, "SKILL.md");
    const contents = `user-owned ${root} SKILL.md`;
    fs.writeFileSync(skillFile, contents);
    userSentinels.set(skillFile, contents);
  }

  const skippedLogs = captureLogs(() => {
    assert.strictEqual(install(["sk-verify-code-ui-only"], ".agents", verifyCodeTarget), true);
    assert.strictEqual(install(["sk-verify-code-ui-only"], ".claude", verifyCodeTarget), true);
  });
  assert.match(skippedLogs.join("\n"), /Skipped:.*sk-verify-code-ui-only/);
  for (const [file, contents] of userSentinels) {
    assert.strictEqual(fs.readFileSync(file, "utf8"), contents);
  }
  for (const root of [".agents", ".claude"]) {
    const installedMetadata = path.join(
      verifyCodeTarget,
      root,
      "skills",
      "sk-verify-code-ui-only",
      "agents",
      "openai.yaml",
    );
    assert.deepStrictEqual(
      fs.readFileSync(installedMetadata),
      fs.readFileSync(path.join(sourceSkill, "agents", "openai.yaml")),
    );
  }
  console.log("sk-verify-code-ui-only selected installation passed");
} finally {
  fs.rmSync(verifyCodeTarget, { recursive: true, force: true });
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
  assertVisualizerReferences(defaultCreate.target, ".agents");
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
  assertVisualizerReferences(claudeCreate.target, ".agents");
  assertSbKitSkills(claudeCreate.target, ".claude");
  assertVisualizerReferences(claudeCreate.target, ".claude");
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

const replaceTarget = fs.mkdtempSync(path.join(os.tmpdir(), "sb-kit-replace-"));
try {
  assert.strictEqual(
    install(["sk-doc", "sk-visualizer"], ".agents", replaceTarget),
    true,
  );
  const docSkill = path.join(replaceTarget, ".agents", "skills", "sk-doc");
  const visualizerSkill = path.join(
    replaceTarget,
    ".agents",
    "skills",
    "sk-visualizer",
  );
  const docSkillFile = path.join(docSkill, "SKILL.md");
  const visualizerSkillFile = path.join(visualizerSkill, "SKILL.md");
  fs.writeFileSync(docSkillFile, "old selected skill");
  fs.writeFileSync(path.join(docSkill, "stale.txt"), "remove me");
  fs.writeFileSync(visualizerSkillFile, "unselected skill");

  const replaceLogs = captureLogs(() => {
    assert.strictEqual(
      install(["sk-doc"], ".agents", replaceTarget, { replace: true }),
      true,
    );
  });
  assert.match(replaceLogs.join("\n"), /Replaced: sk-doc/);
  assert.strictEqual(
    fs.readFileSync(docSkillFile, "utf8"),
    fs.readFileSync(
      path.join(__dirname, ".agents", "skills", "sk-doc", "SKILL.md"),
      "utf8",
    ),
  );
  assert.ok(!fs.existsSync(path.join(docSkill, "stale.txt")));
  assert.strictEqual(fs.readFileSync(visualizerSkillFile, "utf8"), "unselected skill");

  assert.strictEqual(install(["sk-doc"], ".claude", replaceTarget), true);
  const claudeDocFile = path.join(
    replaceTarget,
    ".claude",
    "skills",
    "sk-doc",
    "SKILL.md",
  );
  fs.writeFileSync(claudeDocFile, "old Claude skill");
  assert.strictEqual(
    install(["sk-doc"], ".claude", replaceTarget, { replace: true }),
    true,
  );
  assert.strictEqual(
    fs.readFileSync(claudeDocFile, "utf8"),
    fs.readFileSync(
      path.join(__dirname, ".agents", "skills", "sk-doc", "SKILL.md"),
      "utf8",
    ),
  );
  assert.ok(
    !fs.existsSync(path.join(replaceTarget, ".claude", "skills", "sk-visualizer")),
  );
} finally {
  fs.rmSync(replaceTarget, { recursive: true, force: true });
}

async function testInstallPrompts() {
  const cancellations = [];
  let groupConfig;
  const selected = await chooseSkills(PACKAGED_SKILLS, {
    groupMultiselect: async (config) => {
      groupConfig = config;
      return ["sk-doc", "sk-excute"];
    },
    isCancel: () => false,
    cancel: (message) => cancellations.push(message),
  });
  assert.deepStrictEqual(selected, ["sk-doc", "sk-excute"]);
  assert.strictEqual(groupConfig.required, true);
  assert.deepStrictEqual(groupConfig.options, pickerOptions);

  const cancelledSelection = await chooseSkills(PACKAGED_SKILLS, {
    groupMultiselect: async () => Symbol.for("cancel"),
    isCancel: (value) => value === Symbol.for("cancel"),
    cancel: (message) => cancellations.push(message),
  });
  assert.strictEqual(cancelledSelection, null);

  const emptySelection = await chooseSkills(PACKAGED_SKILLS, {
    groupMultiselect: async () => [],
    isCancel: () => false,
    cancel: (message) => cancellations.push(message),
  });
  assert.strictEqual(emptySelection, null);
  assert.deepStrictEqual(cancellations, [
    "Installation cancelled.",
    "Installation cancelled.",
  ]);

  let conflictConfig;
  const installMode = await chooseConflictMode({
    select: async (config) => {
      conflictConfig = config;
      return "install";
    },
    isCancel: () => false,
    cancel: () => assert.fail("install mode must not cancel"),
  });
  assert.strictEqual(installMode, "install");
  assert.strictEqual(conflictConfig.options[0].value, "install");
  assert.strictEqual(conflictConfig.options[1].value, "replace");

  const cancelledModeMessages = [];
  const cancelledMode = await chooseConflictMode({
    select: async () => Symbol.for("cancel"),
    isCancel: (value) => value === Symbol.for("cancel"),
    cancel: (message) => cancelledModeMessages.push(message),
  });
  assert.strictEqual(cancelledMode, null);
  assert.deepStrictEqual(cancelledModeMessages, ["Installation cancelled."]);
}

testInstallPrompts()
  .then(() => console.log("sb-kit bootstrap and install picker passed"))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
