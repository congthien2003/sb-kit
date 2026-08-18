#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const SB_KIT_SKILLS = [
  "sk-excute",
  "sk-excute-explorer",
  "sk-excute-researcher",
  "sk-excute-reviewer",
  "sk-excute-implementer",
  "sk-visualizer",
  "sk-create-slide",
  "sk-release",
  "sk-doc",
  "sk-start-next-hono",
];
const USAGE = `sb-kit — install agent skills or bootstrap a Next.js and Hono workspace

  npx sb-kit install                                      Choose skills to install
  npx sb-kit create next-hono <project-name> [--claude]  Create a base workspace
  npx sb-kit --help                                       Show this help`;

function usage() {
  console.log(USAGE);
}

function cpRecursive(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

function listSkills(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((name) => {
    return fs.statSync(path.join(dir, name)).isDirectory();
  });
}

function selectedSkills(choice, allSkills) {
  switch (choice) {
    case "1":
      return allSkills;
    case "2":
      return allSkills.filter((name) => SB_KIT_SKILLS.includes(name));
    case "3":
      return allSkills.filter((name) => !SB_KIT_SKILLS.includes(name));
    default:
      return null;
  }
}

async function chooseSkills(allSkills, prompts) {
  const choice = await prompts.select({
    message: "Choose skills to install:",
    options: [
      { value: "1", label: "All", hint: "sb-kit + other skills" },
      {
        value: "2",
        label: "sb-kit only",
        hint: "sk-excute workflow roles, sk-visualizer, sk-create-slide, sk-release, sk-doc, sk-start-next-hono",
      },
      { value: "3", label: "Other skills only" },
    ],
  });

  if (prompts.isCancel(choice)) {
    prompts.cancel("Installation cancelled.");
    return null;
  }

  return selectedSkills(choice, allSkills);
}

function install(skillNames, root, targetDir = process.cwd()) {
  const srcSkillsDir = path.resolve(__dirname, ".agents", "skills");
  const destSkillsDir = path.resolve(targetDir, root, "skills");

  for (const name of skillNames) {
    if (!fs.existsSync(path.join(srcSkillsDir, name))) {
      console.error(
        `Error: .agents/skills/${name} is missing from the package.`,
      );
      return false;
    }
  }

  fs.mkdirSync(destSkillsDir, { recursive: true });
  const added = [];
  const skipped = [];

  for (const name of skillNames) {
    const destSkill = path.join(destSkillsDir, name);
    if (fs.existsSync(destSkill)) {
      skipped.push(name);
      continue;
    }
    cpRecursive(path.join(srcSkillsDir, name), destSkill);
    added.push(name);
  }

  console.log(`\n✓ ${root}/skills processed`);
  if (added.length) console.log(`  Added:   ${added.join(", ")}`);
  if (skipped.length)
    console.log(`  Skipped: ${skipped.join(", ")} (already present)`);
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
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
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

The installed sk-excute workflow includes portable explorer, researcher,
reviewer, and implementer roles. Use native sub-agent dispatch only when the
host supports it; otherwise disclose the inline fallback.`;
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

      const skillNames = await chooseSkills(allSkills, prompts);
      if (!skillNames) return;
      if (!install(skillNames, ".agents"))
        throw new Error("Skill installation failed.");
      if (await chooseClaudeInstall(prompts)) {
        if (!install(skillNames, ".claude"))
          throw new Error("Claude Code installation failed.");
      }
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
    process.exitCode = 1;
  });
}

module.exports = {
  SB_KIT_SKILLS,
  install,
  parseCreateArgs,
  createNextHonoProject,
  runCommand,
};
