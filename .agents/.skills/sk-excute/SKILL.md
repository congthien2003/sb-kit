---
name: sk-excute
description: Task execution workflow that turns a user request into an approved spec, approved implementation plan, and implementation. Use when the user asks Codex to run a structured development task workflow with brainstorming for the spec, writing-plans for the plan, explicit approval gates, and no code commits unless explicitly requested.
---

# sk-excute

Use this workflow for implementation tasks that need an explicit spec and plan before code changes.

## Workflow

1. Read the repository `AGENTS.md` if it exists and follow it.
2. Use the `brainstorming` skill to create a concise spec from the user's task.
3. In the spec, explicitly remove any commit-code step. State that commits are out of scope unless the user later asks for one.
4. Ask the user whether the spec is approved. Stop until they approve.
5. After spec approval, use the `writing-plans` skill to write the implementation plan from that spec.
6. Ask the user whether the plan is approved. Stop until they approve.
7. After plan approval, implement the plan with the smallest code change that satisfies the approved spec.
8. Do not commit code unless the user explicitly requests a commit.
9. Do not run build, test, lint, or verification commands when repo or user instructions forbid it. Instead, list the commands the user should run.

## Output Shape

Keep each gate compact:

- Spec gate: `Spec:` then the proposed behavior, scope, non-goals, and approval question.
- Plan gate: `Plan:` then ordered implementation steps and approval question.
- Completion: changed files, what was done, and any user-run verification commands.
