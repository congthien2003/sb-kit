---
name: sk-excute
description: Run a structured development workflow that turns an implementation request into an approved spec, approved implementation plan, and minimal code change. Use when explicit brainstorming and planning gates are required before editing code; do not commit unless explicitly requested.
---

# sk-excute

Use this self-contained workflow for implementation tasks that require an approved spec and plan before code changes. Do not invoke separate brainstorming or writing-plans skills.

## Rules

- Read the repository `AGENTS.md` if it exists and follow it.
- Do not write code, scaffold, or modify implementation files before both approval gates pass.
- Do not commit code, specs, or plans unless the user explicitly requests it.
- Do not run build, test, lint, or verification commands when repository or user instructions forbid them. List the commands for the user instead.
- Keep the solution YAGNI: reuse existing patterns and make the smallest change that satisfies the approved scope.

## Workflow

### 1. Explore and brainstorm

Inspect the relevant repository context: files, documentation, existing patterns, and recent changes when useful. If the request spans independent subsystems, identify the split and brainstorm the first scoped unit.

Ask clarifying questions one at a time until purpose, constraints, and success criteria are clear. Prefer concise multiple-choice questions when helpful.

Propose two or three viable approaches with trade-offs. Lead with the recommended approach. Do not offer or use a visual companion.

### 2. Spec gate

Present a concise spec containing:

- Intended behavior and success criteria
- Scope and non-goals
- Affected boundaries, data flow, error handling, and testing approach when relevant
- Explicit statement that commits are out of scope unless later requested

Ask for approval and stop. Revise the spec if requested; do not continue until it is approved.

### 3. Write the implementation plan

After spec approval, map the exact files to create or modify, the symbols or regions that change, and each file's responsibility. Write ordered tasks that can be reviewed independently. Keep dependencies explicit: a task may only depend on behavior or contracts established by earlier tasks.

For every task, include:

- **Goal:** the observable outcome and acceptance criterion.
- **Preconditions:** relevant prior task, existing behavior, migration, configuration, or data needed before starting.
- **Files:** exact create/modify paths plus the relevant symbol, route, component, API, or approximate region.
- **Changes:** numbered, concrete implementation steps. Name the inputs, outputs, state changes, and caller/callee flow; show the intended contract or pseudocode when that removes ambiguity.
- **Edge cases:** validation, empty/error/loading states, compatibility, permissions, or rollback behavior that apply to this task. State `None identified` when no meaningful edge case exists.
- **Verification:** exact commands the user can run and expected observable result. Do not run them yourself when instructions forbid it.

Split tasks at meaningful review checkpoints: contract/schema first, shared behavior next, consumers after that, then focused verification or documentation. Do not split trivial adjacent edits solely to inflate the task count.

Avoid placeholders such as `TBD`, vague instructions, undefined names, and generic test steps. Use the existing repository patterns; do not introduce abstractions or dependencies without a demonstrated need.

Self-review the plan before presenting it:

- Map every acceptance criterion to at least one task.
- Confirm task order satisfies dependencies and no task relies on an undefined contract.
- Check names, types, request/response fields, state transitions, and data flow for consistency across tasks.
- Ensure each verification command targets the change and has a concrete expected result.
- Remove scope creep, placeholders, and duplicated context. Fix issues inline.

### 4. Plan gate

Present the ordered plan and ask for approval. Stop until it is approved. Do not suggest sub-agent, inline, or other execution modes.

### 5. Implement

After plan approval, implement only the approved scope with the smallest working diff. Preserve existing user changes and do not commit.

Report changed files, completed behavior, and any commands the user should run to verify the work.

## Output shape

- **Spec:** behavior, scope, non-goals, approval question.
- **Plan:** ordered file-specific steps, approval question.
- **Completion:** changed files, what was done, and user-run verification commands.
