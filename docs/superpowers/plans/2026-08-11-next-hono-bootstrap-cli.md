# Next.js and Hono Bootstrap CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `npx sb-kit create next-hono <project-name>` as a deterministic first-stage bootstrap, then hand the generated workspace to `$sk-start-next-hono` for the approved architecture setup.

**Architecture:** Extend the existing CommonJS CLI instead of adding a framework or custom application generator. The CLI creates root workspace files, delegates client/server creation to the official pnpm generators, normalizes their output, copies bundled core skills, formats the project, and prints a detailed handoff prompt; the renamed skill owns PostgreSQL, Drizzle, auth, proxy, modules, and optional R2.

**Tech Stack:** Node.js 20.12+, CommonJS, `fs`, `path`, `child_process.spawnSync`, `@clack/prompts`, pnpm, create-next-app, create-hono, Node `assert`.

**Repository constraints:** Preserve unrelated dirty files, do not commit, and do not execute build, test, lint, format, or verification commands. Verification steps below are commands for the user to run.

---

## File map

- Rename `.agents/skills/sb-start-next-hono/` to `.agents/skills/sk-start-next-hono/`; update its skill contract, setup reference, and OpenAI metadata for the second-stage agent workflow.
- Modify `cli.js`; keep installation and bootstrap behavior in the existing entry point, with small exported helpers for deterministic tests.
- Modify `test-cli.js`; retain existing installer checks and add network-free bootstrap coverage with a fake command runner.
- Modify `package.json`, `README.md`, and `index.html`; expose and document the new command and renamed core skill.
- Keep `package-lock.json` and `skills-lock.json` unchanged because no dependency or imported supporting skill changes.

### Task 1: Rename and refocus the skill

**Files:**
- Rename: `.agents/skills/sb-start-next-hono/` → `.agents/skills/sk-start-next-hono/`
- Modify: `.agents/skills/sk-start-next-hono/SKILL.md`
- Modify: `.agents/skills/sk-start-next-hono/references/setup-guideline.md`
- Modify: `.agents/skills/sk-start-next-hono/references/architecture.md`
- Modify: `.agents/skills/sk-start-next-hono/agents/openai.yaml`

- [ ] **Step 1: Verify the rename targets before moving**

Resolve both paths under `Z:\CongThien\Temp\sb-kit\.agents\skills`. Confirm the source exists and the destination does not. Move the directory with one PowerShell `Move-Item -LiteralPath` operation; do not copy/delete unrelated skill directories.

- [ ] **Step 2: Change the public skill identity**

Set the frontmatter name to `sk-start-next-hono`. Change the description from creating a new workspace to finishing an existing pnpm workspace produced by `sb-kit create next-hono`.

Update `agents/openai.yaml` to:

```yaml
interface:
  display_name: "Start Next + Hono"
  short_description: "Finish a bootstrapped Next.js and Hono workspace"
  default_prompt: "Use $sk-start-next-hono to finish setting up this existing pnpm workspace. Inspect the generated source, present a file-scoped plan, and wait for approval before modifying files."
```

- [ ] **Step 3: Replace the skill's creation workflow with bootstrap detection**

The skill must require these existing inputs before planning second-stage work:

```text
package.json
pnpm-workspace.yaml
client/package.json
server/package.json
.agents/skills/sk-start-next-hono/SKILL.md
```

If any are missing, stop and direct the user to run:

```bash
npx sb-kit create next-hono <project-name>
```

A matching non-empty workspace is expected and must not trigger the old “do not use a non-empty target” guard. The skill still reads `AGENTS.md`, inspects Git state, preserves user-owned files, proposes a file-scoped plan, and waits for approval.

- [ ] **Step 4: Keep only architecture-aware responsibilities in the skill**

Retain these defaults and boundaries:

```text
PostgreSQL + Drizzle: included
Authentication: included, admin/user boundary
Same-origin proxy: /api/backend/*
Cloudflare R2: omitted unless explicitly requested
Client: feature-oriented App Router conventions
Server: routes -> middleware -> controller -> service -> Drizzle/integration
Vercel React skill: apply when available
Final mutation: pnpm format, unless target AGENTS.md prohibits it
```

Remove instructions to create the root workspace, call create-next-app/create-hono, install sb-kit, or create baseline Prettier configuration. Update `references/setup-guideline.md` so it starts by inspecting the generated manifests and then covers server dependencies, Drizzle, environment files, auth proxy, application boundaries, optional R2, formatting, and verification handoff.

- [ ] **Step 5: Preserve project convention merging**

The CLI owns a baseline root `AGENTS.md`. The skill proposes adding the approved client/server rules to that file and never silently replaces it. Keep the detailed client/server rules in `references/architecture.md`; change only wording that still assumes the skill creates an empty project.

### Task 2: Add failing bootstrap contract tests

**Files:**
- Modify: `test-cli.js`
- Modify: `cli.js` only to add a `require.main` guard and exports needed by the tests

- [ ] **Step 1: Make the CLI importable without executing `main()`**

Replace the unconditional call with:

```js
if (require.main === module) {
  main();
}

module.exports = {
  SB_KIT_SKILLS,
  install,
  parseCreateArgs,
  createNextHonoProject,
};
```

For the initial failing-test stage, export both new properties as `undefined`; the assertions then fail with `parseCreateArgs is not a function` without introducing temporary implementations. Replace those two values with the real functions in Task 3. Do not expose unrelated helpers.

- [ ] **Step 2: Add argument contract assertions**

Add direct assertions covering:

```js
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
```

- [ ] **Step 3: Add a fake pnpm command runner**

Create a test-local runner that records `{ command, args, cwd }`. When called with `--version`, return `stdout: "10.15.0\n"`. When called for Next or Hono creation, create only the minimal child manifest and an unexpected child lockfile so normalization can be asserted:

```js
function createFakeRunner(calls) {
  return (command, args, options) => {
    calls.push({ command, args, cwd: options.cwd });
    if (args.length === 1 && args[0] === "--version") {
      return { status: 0, stdout: "10.15.0\n", stderr: "" };
    }

    if (args.includes("next-app@latest")) {
      const client = path.join(options.cwd, "client");
      fs.mkdirSync(client, { recursive: true });
      fs.writeFileSync(path.join(client, "package.json"), JSON.stringify({ name: "client", scripts: {} }));
      fs.writeFileSync(path.join(client, "package-lock.json"), "{}");
    }

    if (args.includes("hono@latest")) {
      const server = path.join(options.cwd, "server");
      fs.mkdirSync(server, { recursive: true });
      fs.writeFileSync(path.join(server, "package.json"), JSON.stringify({ name: "server", scripts: {} }));
      fs.writeFileSync(path.join(server, "bun.lock"), "");
    }

    return { status: 0, stdout: "", stderr: "" };
  };
}
```

- [ ] **Step 4: Assert the successful default bootstrap**

In a temporary directory, call the exact injectable interface below with the fake runner and assert:

```js
createNextHonoProject(
  { projectPath: "my-app", claude: false },
  { cwd: temporaryParent, run: fakeRunner, log: () => {} },
);
```

```text
root package name = my-app
packageManager = pnpm@10.15.0
workspace packages = client and server
child names = my-app-client and my-app-server
root format script = prettier --write .
client/package-lock.json absent
server/bun.lock absent
.agents/skills/sk-start-next-hono present
.claude absent
handoff output contains $sk-start-next-hono
```

Also assert command order by matching the recorded argument arrays:

```text
pnpm --version
pnpm create next-app@latest client ...
pnpm create hono@latest server ...
pnpm add -Dw prettier
pnpm format
```

- [ ] **Step 5: Assert `--claude`, target safety, and failure stopping**

Add three focused cases:

- `claude: true` creates the same core skill set under `.agents/skills` and `.claude/skills`.
- A target containing `user.txt` throws before running pnpm and preserves `user.txt`.
- A fake runner returning non-zero for create-hono causes an error naming the Hono stage, preserves the generated client, and records no Prettier install or format call.

Every temporary directory must be removed in `finally` using the existing `fs.rmSync(..., { recursive: true, force: true })` pattern.

- [ ] **Step 6: Hand off the initial test command**

Ask the user to run:

```powershell
node test-cli.js
```

Expected before Tasks 3–4: failure with `parseCreateArgs is not a function`. Do not run it automatically.

### Task 3: Implement safe bootstrap orchestration

**Files:**
- Modify: `cli.js`

- [ ] **Step 1: Add Node built-ins and command usage**

Add:

```js
const { spawnSync } = require("child_process");
```

Extend `USAGE` with:

```text
npx sb-kit install
npx sb-kit create next-hono <project-name> [--claude]
npx sb-kit --help
```

Rename the core entry in `SB_KIT_SKILLS` to `sk-start-next-hono` and update the “sb-kit only” prompt hint.

- [ ] **Step 2: Parse the narrow create interface**

Implement:

```js
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
```

Derive the package name from `path.basename(path.resolve(cwd, projectPath))`. Accept lowercase npm-safe names only with `/^[a-z0-9][a-z0-9._-]*$/`; report an actionable error before creating the target when invalid.

- [ ] **Step 3: Add exact target and subprocess safety helpers**

Implement helpers with these contracts:

```js
function assertEmptyTarget(targetDir) // allows missing or empty; rejects non-empty
function runCommand(command, args, options = {}) // shell-free spawn with stage errors
function pnpmCommand() // pnpm.cmd on Windows, pnpm elsewhere
function writeJson(file, value) // JSON.stringify(value, null, 2) + newline
function removeChildPackageArtifacts(targetDir) // exact client/server lockfile paths only
function renameChildPackage(targetDir, child, name) // preserve the generated manifest
```

`runCommand` uses `shell: false`, `windowsHide: true`, and either inherited stdio or captured UTF-8 output. On `result.error` or non-zero status, throw an error containing the stage label and rendered command. Do not retry or clean the target.

Implement the orchestration signature exactly as:

```js
function createNextHonoProject(
  { projectPath, claude = false },
  { cwd = process.cwd(), run = runCommand, log = console.log } = {},
) {
  // sequential bootstrap stages
}
```

Every pnpm call passes `pnpmCommand()` as `command` and passes `{ cwd: targetDir, stage, capture }` to `run`. Use `log` for the final handoff output so tests can suppress or capture it.

- [ ] **Step 4: Create root workspace files before generators**

After `pnpm --version` succeeds and before starting generators, create the target and write:

```json
{
  "name": "<derived-name>",
  "private": true,
  "packageManager": "pnpm@<resolved-version>",
  "engines": { "node": ">=20.12.0" },
  "scripts": {
    "dev:client": "pnpm --dir client dev",
    "dev:server": "pnpm --dir server dev",
    "build": "pnpm -r --if-present build",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "lint": "pnpm -r --if-present lint",
    "test": "pnpm -r --if-present test",
    "typecheck": "pnpm -r --if-present typecheck"
  }
}
```

Write `pnpm-workspace.yaml` with only `client` and `server`. Write `.prettierrc.json`, `.prettierignore`, root `.gitignore`, and baseline `AGENTS.md`. The baseline instructions must cover pnpm-only operation, one root lockfile, preserving generated/user files, plan-before-edit, no automatic commit, and nested `client/AGENTS.md` precedence when create-next-app supplies it. Do not include Drizzle/auth/R2 architecture rules; the skill adds those after approval.

- [ ] **Step 5: Invoke the official generators with current flags**

From the new workspace root, run these argument arrays without a shell:

```js
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
]
```

```js
[
  "create",
  "hono@latest",
  "server",
  "--template",
  "nodejs",
  "--install",
  "--pm",
  "pnpm",
]
```

These flags were confirmed from the current official CLI help during planning. Keep the arguments centralized in the create function so later version updates require one edit.

- [ ] **Step 6: Normalize, format, and install core skills**

After both generators succeed:

1. Rename child packages to `<name>-client` and `<name>-server`.
2. Remove only `package-lock.json`, `yarn.lock`, `bun.lock`, and `bun.lockb` found directly under `client` or `server`.
3. Run `pnpm add -Dw prettier` from the workspace root.
4. Call the existing installer with `SB_KIT_SKILLS`, `.agents`, and the target directory.
5. When `claude` is true, repeat for `.claude`.
6. Run `pnpm format` from the workspace root.

Change the installer signature to `install(skillNames, root, targetDir = process.cwd())`; preserve all existing install behavior and console reporting.

- [ ] **Step 7: Print the detailed handoff prompt**

Return and print the exact prompt approved in `docs/superpowers/specs/2026-08-11-next-hono-bootstrap-cli-design.md`, substituting the actual relative `cd` path. It must mention `$sk-start-next-hono`, preserve generated files, list Drizzle/auth/proxy/shared infrastructure/R2 boundaries, require a file-scoped plan, prohibit commits, and defer verification commands until explicitly allowed.

- [ ] **Step 8: Wire the command into `main()`**

Handle only this shape:

```js
case "create": {
  if (process.argv[3] !== "next-hono") {
    throw new Error("Usage: npx sb-kit create next-hono <project-name> [--claude]");
  }
  const options = parseCreateArgs(process.argv.slice(4));
  createNextHonoProject(options);
  break;
}
```

Catch user-facing errors once around `main()`, print `Error: <message>` to stderr, and set `process.exitCode = 1`. Keep cancellation behavior of the existing interactive installer unchanged.

### Task 4: Update catalog and user documentation

**Files:**
- Modify: `package.json`
- Modify: `README.md`
- Modify: `index.html`

- [ ] **Step 1: Update package metadata without dependencies**

Change the description to cover both skill installation and Next/Hono workspace bootstrap. Add `scaffold`, `nextjs`, and `hono` keywords if absent. Do not change the version, dependencies, or lockfiles.

- [ ] **Step 2: Document the two-stage CLI flow in README**

Add a focused “Create Next + Hono workspace” section containing:

```bash
npx sb-kit create next-hono my-app
npx sb-kit create next-hono my-app --claude
```

Explain that the CLI creates the runnable base workspace and core skills, while `$sk-start-next-hono` performs architecture setup only after the user opens an agent and approves its plan. Include the completion prompt in a collapsible or fenced block, rename the catalog entry, and extend the CLI reference/help examples. Keep `sb-kit install` documentation intact.

- [ ] **Step 3: Update the landing page surgically**

Rename the skill card to `sk-start-next-hono`. Add a small bootstrap command block and a concise two-stage explanation near the existing installation section. Reuse the current styling and copy-button behavior; do not redesign the page, add dependencies, or change the skill counts.

### Task 5: Static review and verification handoff

**Files:**
- Review: `cli.js`
- Review: `test-cli.js`
- Review: `.agents/skills/sk-start-next-hono/`
- Review: `README.md`
- Review: `index.html`

- [ ] **Step 1: Inspect working-tree scope separately**

Read `git status --short`, `git diff`, and `git diff --cached` separately. Confirm no unrelated dirty/staged files were changed and no commit was created.

- [ ] **Step 2: Perform read-only residual searches**

Search for `sb-start-next-hono`, nested `sb-kit` install commands inside the renamed skill, and accidental npm/Yarn/Bun scaffold commands. The design spec may retain the old name only where it explicitly documents the rename; runtime metadata, CLI, catalog, tests, and skill paths must use `sk-start-next-hono`.

- [ ] **Step 3: Give the user verification commands without running them**

Provide:

```powershell
node cli.js --help
node test-cli.js
```

For a real smoke test, recommend a disposable parent directory:

```powershell
node Z:\CongThien\Temp\sb-kit\cli.js create next-hono smoke-next-hono
```

Expected results:

- help lists both `install` and `create next-hono`;
- automated tests print the existing installer success plus bootstrap success and exit `0`;
- smoke project contains one root pnpm lockfile, `client`, `server`, root formatting/config files, `.agents/skills/sk-start-next-hono`, no project-local sb-kit dependency, and the detailed handoff prompt;
- `--claude` additionally creates `.claude/skills/sk-start-next-hono`;
- no test/build/lint result is claimed until the user runs the relevant command.
