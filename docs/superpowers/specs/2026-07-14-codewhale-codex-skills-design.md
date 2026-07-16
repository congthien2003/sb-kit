# CodeWhale Skills for Codex

## Goal

Add two narrowly scoped Codex skills to this kit so Codex can delegate work to the locally installed CodeWhale CLI in headless mode.

## Scope

- Add `/sk-codewhale-investigate` for read-only investigation.
- Add `/sk-codewhale-implement` for an already approved, bounded implementation task.
- Invoke CodeWhale directly with `codewhale exec --auto --output-format stream-json`.
- Require a CLI availability check before delegation.
- Default execution to the current folder where Codex is running. Pass that same folder as CodeWhale's workspace boundary and never put credentials in prompts or command arguments.

## Non-goals

- No wrapper scripts, dependencies, configuration files, or credentials management.
- No automatic CodeWhale session resume, review, doctor, or parallel-agent skills in v1.
- No commit as part of this change.

## Skill contracts

### `/sk-codewhale-investigate`

Use only for inspection. The skill builds a bounded prompt requiring CodeWhale to avoid edits and return: likely cause or repository map, file references, evidence, risks, and the smallest proposed next step. It runs from Codex's current folder and reports command failure verbatim enough to diagnose it.

### `/sk-codewhale-implement`

Use only after the user has approved an implementation plan or explicitly authorized a bounded change. The skill requires: outcome, in-scope files or behavior, exclusions, acceptance criteria, and requested verification. Its prompt keeps CodeWhale within Codex's current folder and asks it to report changed files and evidence. It does not expand scope, commit, or expose secrets.

## Execution and errors

Both skills first check that `codewhale` is available. They use the CLI's one-shot headless interface with stream JSON and pass the current folder as `--workspace` so Codex can inspect incremental structured output without relying on CodeWhale's inferred directory. If CodeWhale exits unsuccessfully or emits an actionable error, the skill stops and reports it; it must not retry with broader permissions or switch to a destructive mode.

## Verification

No build, test, lint, or verification command is run by this task. After installation, the user may manually invoke each skill with a harmless prompt in a disposable workspace and confirm that it validates the CLI and uses headless stream JSON.

## Scope review

This contains exactly two independent but complementary workflows. Their permissions differ materially, so they remain separate skills rather than a mode flag in one broad skill.
