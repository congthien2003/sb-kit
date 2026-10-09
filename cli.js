#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const { SB_KIT_SKILLS, ASSET_SKILLS, REPORT_SKILLS } = require("./lib/catalog");
const stateTools = require("./lib/skill-state");
const { inspectProject, renderDoctor } = require("./lib/doctor");
const { chooseInstallSelection } = require("./lib/presets");
const { runUpdate } = require("./lib/update");
const PACKAGE_VERSION = require("./package.json").version;
const LOCAL_ONLY_SKILLS = new Set(["herdr", "skill-creator", "sk-create-skill"]);
const USAGE = `sb-kit — install agent skills or bootstrap a Next.js and Hono workspace

  npx sb-kit install                                      Choose preset and editable skill selection
  npx sb-kit create next-hono <project-name> [--claude]  Create a base workspace
  npx sb-kit doctor [--json]                             Inspect installed skills (read-only, offline)
  npx sb-kit update                                       Preview selected updates with retained backups (offline)
  npx sb-kit --help                                       Show this help`;

function usage() {
  console.log(USAGE);
}

function listSkills(dir) {
  if (!stateTools.statSafe(dir)) return [];
  return fs.readdirSync(dir)
    .filter((name) => !LOCAL_ONLY_SKILLS.has(name) && stateTools.statSafe(path.join(dir, name))?.isDirectory())
    .sort();
}

function categorizedSkills(allSkills) {
  const assets = new Set(ASSET_SKILLS);
  const report = new Set(REPORT_SKILLS);
  const categories = {
    "sk-work": [],
    assets: [],
    report: [],
  };

  for (const skill of [...allSkills].sort()) {
    if (assets.has(skill)) {
      categories.assets.push(skill);
    } else if (report.has(skill)) {
      categories.report.push(skill);
    } else {
      categories["sk-work"].push(skill);
    }
  }

  return categories;
}

function categoryOptions(allSkills) {
  return Object.fromEntries(
    Object.entries(categorizedSkills(allSkills)).map(([category, skills]) => {
      return [
        category,
        skills.map((skill) => ({ value: skill, label: skill })),
      ];
    }),
  );
}

async function chooseSkills(allSkills, prompts, initialValues = []) {
  const choice = await prompts.groupMultiselect({
    message: "Choose skills to install:",
    options: categoryOptions(allSkills),
    ...(initialValues.length ? { initialValues } : {}),
    required: true,
  });

  if (prompts.isCancel(choice) || !Array.isArray(choice) || !choice.length) {
    prompts.cancel("Installation cancelled.");
    return null;
  }

  return choice;
}

async function chooseConflictMode(prompts) {
  const choice = await prompts.select({
    message: "When selected skills already exist:",
    options: [
      {
        value: "install",
        label: "Install missing only",
        hint: "Keep existing selected skills",
      },
      {
        value: "replace",
        label: "Replace selected",
        hint: "Replace only selected existing skills",
      },
    ],
  });

  if (prompts.isCancel(choice)) {
    prompts.cancel("Installation cancelled.");
    return null;
  }

  return choice;
}

function install(skillNames, root, targetDir = process.cwd(), { replace = false, io = fs } = {}) {
  stateTools.assertRoot(root);
  const names = [...new Set(skillNames)];
  const targets = names.map((name) => {
    stateTools.assertName(name);
    const source = stateTools.skillPath(__dirname, ".agents", name);
    const destination = stateTools.skillPath(targetDir, root, name);
    if (!stateTools.statSafe(source, io)?.isDirectory()) return null;
    const sourceSnapshot = stateTools.snapshot(source, io);
    const existing = stateTools.statSafe(destination, io);
    if (existing && !existing.isDirectory()) throw new Error(`Invalid skill destination: ${destination}`);
    const localSnapshot = existing ? stateTools.snapshot(destination, io) : null;
    return { name, source, destination, sourceSnapshot, localSnapshot, existing: Boolean(existing) };
  });
  if (targets.some((target) => !target)) {
    console.error("Error: a selected skill is missing from .agents/skills in the package.");
    return false;
  }
  stateTools.readState(targetDir, io);
  stateTools.assertNoPendingOperation(targetDir, io);
  const skipped = targets.filter((target) => target.existing && !replace).map((target) => target.name);
  const selected = targets.filter((target) => !target.existing || replace);
  const added = [];
  const replaced = [];
  if (selected.length) {
    const mutation = stateTools.beginMutation(targetDir, "install", io);
    const state = stateTools.readState(targetDir, io);
    let recoveryRequired = false;
    try {
      for (const target of selected) {
        const { name, source, destination, sourceSnapshot } = target;
        const staging = stateTools.managedPath(targetDir, ".sb-kit", "staging", mutation.operation.id, root, name);
        const stagedSkill = path.join(staging, "incoming");
        const original = path.join(staging, "original");
        const before = state.roots[root][name];
        let originalMoved = false;
        let installed = false;
        stateTools.statSafe(staging, io);
        io.mkdirSync(staging, { recursive: true });
        mutation.operation.current = { root, skill: name, staging: path.relative(targetDir, staging), before: before || null, phase: "staging" };
        mutation.record();
        try {
          io.cpSync(source, stagedSkill, { recursive: true });
          if (stateTools.snapshot(stagedSkill, io).treeHash !== sourceSnapshot.treeHash ||
              stateTools.snapshot(source, io).treeHash !== sourceSnapshot.treeHash) {
            throw new Error("Packaged skill changed during installation.");
          }
          stateTools.statSafe(path.dirname(destination), io);
          io.mkdirSync(path.dirname(destination), { recursive: true });
          const current = stateTools.statSafe(destination, io);
          if (Boolean(current) !== target.existing) throw new Error("Skill destination changed during installation.");
          if (target.existing) {
            if (stateTools.snapshot(destination, io).treeHash !== target.localSnapshot.treeHash) {
              throw new Error("Skill destination changed during installation.");
            }
            io.renameSync(destination, original);
            originalMoved = true;
          }
          io.renameSync(stagedSkill, destination);
          installed = true;
          state.roots[root][name] = stateTools.receipt(sourceSnapshot, PACKAGE_VERSION);
          stateTools.writeState(targetDir, state, io);
          mutation.operation.current.phase = "committed";
          mutation.operation.completed.push({ root, skill: name });
          mutation.record();
        } catch (error) {
          try {
            if (installed) {
              if (stateTools.snapshot(destination, io).treeHash !== sourceSnapshot.treeHash) {
                throw new Error("Replacement changed after install swap; refusing destructive rollback.");
              }
              io.rmSync(destination, { recursive: true, force: true });
            }
            if (originalMoved) io.renameSync(original, destination);
            if (before) state.roots[root][name] = before;
            else delete state.roots[root][name];
            stateTools.writeState(targetDir, state, io);
            mutation.operation.current.phase = "rolled-back";
            mutation.operation.completed = mutation.operation.completed.filter((item) => item.root !== root || item.skill !== name);
          } catch (rollbackError) {
            recoveryRequired = true;
            error.message += `\nRollback failed: ${rollbackError.message}. Recovery staging: ${staging}`;
          }
          throw error;
        }
        (target.existing ? replaced : added).push(name);
        io.rmSync(staging, { recursive: true, force: true });
        mutation.operation.current = null;
        mutation.record();
      }
      mutation.finish();
    } catch (error) {
      try {
        mutation.finish(recoveryRequired ? "recovery-required" : "rolled-back");
      } catch (journalError) {
        error.message += `\nOperation journal requires recovery: ${journalError.message}`;
      }
      error.message += `\nCompleted: ${[...added, ...replaced].join(", ") || "none"}. Inspect .sb-kit/operation.json before retrying.`;
      throw error;
    }
  }
  console.log(`\n✓ ${root}/skills processed`);
  if (added.length) console.log(`  Added:    ${added.join(", ")}`);
  if (replaced.length) console.log(`  Replaced: ${replaced.join(", ")}`);
  if (skipped.length) console.log(`  Skipped:  ${skipped.join(", ")} (already present)`);
  return true;
}

async function chooseClaudeInstall(prompts) {
  const choice = await prompts.select({
    message: "Install for Claude Code too?",
    options: [
      { value: false, label: "No" },
      { value: true, label: "Yes" },
    ],
  });

  if (prompts.isCancel(choice)) {
    prompts.cancel("Claude Code installation skipped.");
    return false;
  }

  return choice;
}

function parseCreateArgs(args) {
  let projectPath;
  let claude = false;

  for (const arg of args) {
    if (arg === "--claude") {
      claude = true;
    } else if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    } else if (projectPath) {
      throw new Error(`Unexpected argument: ${arg}`);
    } else {
      projectPath = arg;
    }
  }

  if (!projectPath) throw new Error("A project name is required.");
  return { projectPath, claude };
}

function assertEmptyTarget(targetDir) {
  if (!fs.existsSync(targetDir)) return;
  if (!fs.statSync(targetDir).isDirectory()) {
    throw new Error(`Target exists and is not a directory: ${targetDir}`);
  }
  if (fs.readdirSync(targetDir).length) {
    throw new Error(`Target directory is not empty: ${targetDir}`);
  }
}

function pnpmCommand() {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

function runCommand(command, args, { cwd, capture = false } = {}) {
  let executable = command;
  let executableArgs = args;

  if (process.platform === "win32" && command.toLowerCase().endsWith(".cmd")) {
    const commandParts = [command, ...args];
    if (commandParts.some((part) => !/^[a-z0-9@%_+=:,./*-]+$/i.test(part))) {
      throw new Error("Unsafe Windows command argument.");
    }
    executable = process.env.ComSpec || "cmd.exe";
    executableArgs = ["/d", "/s", "/c", commandParts.join(" ")];
  }

  return spawnSync(executable, executableArgs, {
    cwd,
    encoding: "utf8",
    shell: false,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
    windowsHide: true,
  });
}

function executeCommand(run, command, args, options) {
  const result = run(command, args, options);
  const renderedCommand = [command, ...args].join(" ");

  if (result?.error) {
    throw new Error(
      `${options.stage} failed: ${renderedCommand}\n${result.error.message}`,
    );
  }
  if (!result || result.status !== 0) {
    const detail = result?.stderr?.trim();
    throw new Error(
      `${options.stage} failed: ${renderedCommand}${detail ? `\n${detail}` : ""}`,
    );
  }

  return result;
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function renameChildPackage(targetDir, child, name) {
  const manifestPath = path.join(targetDir, child, "package.json");
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    throw new Error(`Invalid package manifest at ${manifestPath}: ${error.message}`);
  }
  manifest.name = name;
  writeJson(manifestPath, manifest);
}

function removeChildPackageArtifacts(targetDir) {
  const lockfiles = [
    "package-lock.json",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
  ];
  for (const child of ["client", "server"]) {
    for (const lockfile of lockfiles) {
      const file = path.join(targetDir, child, lockfile);
      if (fs.existsSync(file)) fs.rmSync(file);
    }
  }
}

function writeRootFiles(targetDir, packageName, pnpmVersion) {
  writeJson(path.join(targetDir, "package.json"), {
    name: packageName,
    private: true,
    packageManager: `pnpm@${pnpmVersion}`,
    engines: {
      node: ">=20.12.0",
    },
    scripts: {
      "dev:client": "pnpm --dir client dev",
      "dev:server": "pnpm --dir server dev",
      build: "pnpm -r --if-present build",
      format: "prettier --write .",
      "format:check": "prettier --check .",
      lint: "pnpm -r --if-present lint",
      test: "pnpm -r --if-present test",
      typecheck: "pnpm -r --if-present typecheck",
    },
  });

  fs.writeFileSync(
    path.join(targetDir, "pnpm-workspace.yaml"),
    "packages:\n  - client\n  - server\nallowBuilds:\n  esbuild: true\n  unrs-resolver: true\n",
    "utf8",
  );
  writeJson(path.join(targetDir, ".prettierrc.json"), {
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "all",
  });
  fs.writeFileSync(
    path.join(targetDir, ".prettierignore"),
    "node_modules\n.next\ndist\ncoverage\npnpm-lock.yaml\nserver/drizzle\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(targetDir, ".gitignore"),
    "node_modules\n.next\ndist\ncoverage\n.env\n.env.*\n!.env.example\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(targetDir, "AGENTS.md"),
    `# Project Guidelines

## Workspace

- Use pnpm for every package operation and keep one \`pnpm-lock.yaml\` at the root.
- Keep runtime dependencies in the application that imports them; reserve the root manifest for workspace scripts and shared tooling.
- Preserve generated and user-owned files. Do not replace an application or non-empty file without explicit approval.
- Read nested instructions before changing scoped files; \`client/AGENTS.md\` takes precedence inside \`client/\` when generated by Next.js.

## Workflow

- Present a concise, file-scoped plan and wait for approval before modifying code.
- Do not commit unless the user explicitly requests it.
- Follow the user's instructions before running format, build, test, lint, or verification commands.
`,
    "utf8",
  );
}

function createHandoff(projectPath) {
  return `Project bootstrap completed.

Next steps:
  1. cd ${projectPath}
  2. Open the project with your coding agent.
  3. Send this prompt:

Use $sk-start-next-hono to finish setting up this existing pnpm workspace.

Inspect the generated Next.js client, Hono server, root workspace files,
AGENTS.md, and Git state first. Preserve the generated applications and
existing files.

Configure the project following the skill conventions:
- PostgreSQL with Drizzle migrations on the server;
- authentication with admin/user boundaries by default;
- same-origin /api/backend/* proxy for protected client requests;
- shared environment, API error, response, logging, and database utilities;
- client and server module boundaries documented by the skill;
- Cloudflare R2 only if I explicitly request it.

Before modifying files, present a concise file-scoped plan and wait for my
approval. Follow the repository AGENTS.md. Do not commit code. Do not run
build, test, lint, or verification commands unless I explicitly allow them.

The installed sk-excute workflow is inline-first. The main agent owns the
spec, detailed plan/todos, implementation, integration, and final review.
Obtain approval for the reviewed spec, then the detailed plan, before edits.
Only native scout, researcher, worker, and reviewer roles may be dispatched.
Use scout/researcher only for concrete missing evidence within permissions;
review the whole spec once, and add plan/change review only for material risk
or user request. The worker is optional and receives authorized approved
tasks with exclusive file ownership. Review its changed files after handback.
If required independent review or an authorized worker is unavailable or
fails, disclose status and ask before fallback or takeover.`;
}

function createNextHonoProject(
  { projectPath, claude = false },
  { cwd = process.cwd(), run = runCommand, log = console.log } = {},
) {
  const targetDir = path.resolve(cwd, projectPath);
  const packageName = path.basename(targetDir);

  if (!/^[a-z0-9][a-z0-9._-]*$/.test(packageName)) {
    throw new Error(
      "Project name must start with a lowercase letter or number and contain only lowercase letters, numbers, dots, underscores, or hyphens.",
    );
  }
  assertEmptyTarget(targetDir);

  const pnpm = pnpmCommand();
  const versionResult = executeCommand(run, pnpm, ["--version"], {
    cwd,
    capture: true,
    stage: "pnpm availability check",
  });
  const pnpmVersion = versionResult.stdout.trim();
  if (!pnpmVersion)
    throw new Error("pnpm availability check returned no version.");

  fs.mkdirSync(targetDir, { recursive: true });
  writeRootFiles(targetDir, packageName, pnpmVersion);

  executeCommand(
    run,
    pnpm,
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
    { cwd: targetDir, stage: "Next.js generator" },
  );
  executeCommand(
    run,
    pnpm,
    [
      "create",
      "hono@latest",
      "server",
      "--template",
      "nodejs",
      "--install",
      "--pm",
      "pnpm",
    ],
    { cwd: targetDir, stage: "Hono generator" },
  );

  renameChildPackage(targetDir, "client", `${packageName}-client`);
  renameChildPackage(targetDir, "server", `${packageName}-server`);
  removeChildPackageArtifacts(targetDir);

  executeCommand(run, pnpm, ["add", "-Dw", "prettier"], {
    cwd: targetDir,
    stage: "Prettier installation",
  });
  if (!install(SB_KIT_SKILLS, ".agents", targetDir)) {
    throw new Error("Core skill installation failed.");
  }
  if (claude && !install(SB_KIT_SKILLS, ".claude", targetDir)) {
    throw new Error("Claude Code skill installation failed.");
  }
  executeCommand(run, pnpm, ["format"], {
    cwd: targetDir,
    stage: "Workspace formatting",
  });

  const handoff = createHandoff(projectPath);
  log(`\n${handoff}`);
  return handoff;
}

async function main() {
  const cmd = process.argv[2];

  switch (cmd) {
    case "install": {
      const prompts = await import("@clack/prompts");
      const srcSkillsDir = path.resolve(__dirname, ".agents", "skills");
      const allSkills = listSkills(srcSkillsDir);
      if (!allSkills.length) throw new Error("No packaged skills found.");

      const available = stateTools.inventory(process.cwd(), ".agents").filter((name) => {
        const stat = stateTools.statSafe(path.join(stateTools.skillPath(process.cwd(), ".agents", name), "SKILL.md"));
        return stat?.isFile();
      });
      const skillNames = await chooseInstallSelection(allSkills, prompts, chooseSkills, available);
      if (!skillNames) return;
      const conflictMode = await chooseConflictMode(prompts);
      if (!conflictMode) return;
      const installOptions = { replace: conflictMode === "replace" };

      if (!install(skillNames, ".agents", process.cwd(), installOptions))
        throw new Error("Skill installation failed.");
      if (await chooseClaudeInstall(prompts)) {
        if (!install(skillNames, ".claude", process.cwd(), installOptions))
          throw new Error("Claude Code installation failed.");
      }
      break;
    }
    case "update": {
      if (process.argv.length > 3) throw new Error("Usage: npx sb-kit update");
      const prompts = await import("@clack/prompts");
      await runUpdate(process.cwd(), __dirname, prompts);
      break;
    }
    case "doctor": {
      const args = process.argv.slice(3);
      if (args.length > 1 || args.some((arg) => arg !== "--json")) {
        throw Object.assign(new Error("Usage: npx sb-kit doctor [--json]"), { exitCode: 2 });
      }
      const report = inspectProject(process.cwd(), __dirname);
      console.log(args.includes("--json") ? JSON.stringify(report, null, 2) : renderDoctor(report));
      process.exitCode = report.exitCode;
      break;
    }
    case "create": {
      if (process.argv[3] !== "next-hono") {
        throw new Error(
          "Usage: npx sb-kit create next-hono <project-name> [--claude]",
        );
      }
      createNextHonoProject(parseCreateArgs(process.argv.slice(4)));
      break;
    }
    case "--help":
    case "-h":
      usage();
      break;
    default:
      if (cmd === undefined) {
        usage();
      } else {
        throw new Error(`Unknown command: ${cmd}`);
      }
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Error: ${error.message}`);
    process.exitCode = error.exitCode || 1;
  });
}

module.exports = {
  ASSET_SKILLS,
  REPORT_SKILLS,
  SB_KIT_SKILLS,
  categorizedSkills,
  categoryOptions,
  chooseConflictMode,
  chooseSkills,
  install,
  listSkills,
  parseCreateArgs,
  createNextHonoProject,
  runCommand,
};
