# Next.js and Hono Bootstrap CLI

## Goal

Add a deterministic first-stage bootstrap command to `sb-kit`. The user runs the CLI in a terminal to create a clean pnpm workspace and install the bundled core skills. The user then opens the generated project with a coding agent and invokes `$sk-start-next-hono` for the architecture-aware setup.

This is a two-stage workflow. The CLI does not run inside an agent session and does not replace the skill.

## User flow

```text
npx sb-kit create next-hono my-app
  -> create the root pnpm workspace
  -> generate the Next.js client and Node.js Hono server
  -> normalize root scripts, lockfiles, formatting, and baseline instructions
  -> copy sb-kit core skills into .agents/skills
  -> optionally mirror the same core skills into .claude/skills
  -> run pnpm format
  -> print a ready-to-copy agent prompt

user opens my-app in a coding agent
  -> invokes $sk-start-next-hono with the printed prompt
  -> agent inspects the generated source
  -> agent presents a file-scoped plan and waits for approval
  -> agent configures the application architecture
```

## CLI contract

The command is:

```bash
npx sb-kit create next-hono <project-name>
```

The target must be new or empty. The CLI must not overwrite a non-empty directory. It uses the current baseline without asking architecture questions: Next.js App Router client, Node.js Hono server, pnpm workspace, TypeScript, ESLint, Tailwind CSS, no `src/` directory, client port `3000`, and server port `3001`.

The CLI always copies the skills listed in `SB_KIT_SKILLS` into `.agents/skills` without overwriting existing files. `--claude` also mirrors them into `.claude/skills`; the default is `.agents` only. The generated project does not add `sb-kit` as a dependency and does not run a nested skill installer.

The implementation extends the existing CommonJS CLI and reuses its skill discovery and non-overwriting installation behavior. It uses Node.js filesystem and child-process APIs plus the existing `@clack/prompts` dependency. It must not introduce a second CLI framework, an internal replacement for the official Next.js or Hono generators, or a generic scaffolding engine.

## Bootstrap responsibilities

The CLI owns only deterministic project initialization:

- create the root `package.json` and `pnpm-workspace.yaml` before child generation;
- run the official current Next.js and Hono Node.js generators through pnpm;
- keep one root `pnpm-lock.yaml` and remove unexpected child npm, Yarn, or Bun lockfiles;
- add root development scripts plus shared Prettier configuration and ignore rules;
- create a baseline `AGENTS.md` with pnpm, workspace, non-overwrite, and no-commit rules;
- copy the bundled core skills and run `pnpm format` after bootstrap is complete.

The CLI does not configure PostgreSQL, Drizzle, authentication, the same-origin API proxy, business modules, response envelopes, environment validation, logging infrastructure, or Cloudflare R2. Those changes require repository inspection, product choices, and plan approval, so they remain in the skill stage.

## Skill contract and rename

Rename the skill and every catalog or test reference from `sb-start-next-hono` to `sk-start-next-hono`. No compatibility alias is needed because the old name has not been released.

`$sk-start-next-hono` must support an existing workspace produced by the CLI. A recognized bootstrap is not treated as an invalid non-empty target. The skill still inspects Git state, preserves generated and user-owned files, presents a plan, and waits for approval before changes.

The skill owns the second-stage setup:

- PostgreSQL with generated Drizzle migrations;
- authentication with admin/user boundaries by default;
- the protected same-origin `/api/backend/*` proxy;
- shared environment, API error, response, logging, and database utilities;
- documented client and server module conventions;
- Cloudflare R2 only when explicitly selected;
- applicable `vercel-react-best-practices` guidance when that skill is available.

## Completion output

After a successful bootstrap, print the generated path and this ready-to-copy prompt:

```text
Project bootstrap completed.

Next steps:
  1. cd <project-name>
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
```

## Failure handling

Run scaffold stages sequentially. If a generator, package operation, or formatter exits unsuccessfully, stop immediately, report the failed stage and command, and preserve the partial directory for diagnosis. Do not delete the target, retry with different flags, or hand-write a replacement application over a failed official generator.

Skill copying remains non-overwriting. A missing packaged core skill is an error before copying begins so the destination is not left with a silently incomplete skill set.

## Testing

Extend the existing Node `assert` integration checks without contacting package registries or running real generators. Cover command parsing, the default bootstrap options, `--claude`, rejection of a non-empty target, core-skill non-overwrite behavior, stage ordering through an injected command runner, and stopping on the first simulated command failure.

The user will run the resulting verification commands. Implementation must not automatically run build, test, lint, or other verification commands in this repository.

## Non-goals

- No full application scaffold in the CLI.
- No auth, R2, database, or architecture prompts in the CLI.
- No project-local `sb-kit` dependency.
- No custom Next.js or Hono template fork.
- No automatic commit, cleanup of failed targets, or verification execution.
