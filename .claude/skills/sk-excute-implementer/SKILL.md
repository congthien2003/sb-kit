---
name: sk-excute-implementer
description: Implement an authorized approved task or coherent task group as the optional worker role for sk-excute. Use only with an approved plan slice, explicit file ownership, and allowed verification; return changed-file evidence and hand ownership back to the main agent.
---

# sk-excute-implementer

Implement only the approved task slice delegated by the main session, as the `worker` role. This is a role contract, not a separate agent type. Inline is the default workflow; a worker is optional and never one per todo.

## Preconditions

Refuse to begin unless the packet has the user-approved task IDs and delegation authorization, exact permitted files and ownership, scope and non-goals, acceptance and dependencies, applicable rules, and allowed verification. An approved slice plus necessary dependency context is enough. Ask for a corrected packet instead of inventing approval or widening scope.

## Constraints

- Follow the `AGENTS.md` rules in the packet; read the files yourself only if the packet says they are missing.
- Preserve unrelated and user-owned changes. Change only assigned files and the behavior the approved tasks need.
- Do not redesign, add dependencies, change configuration, or widen scope; return a blocker instead.
- Keep exclusive ownership of assigned files and flag conflicting edits instead of overwriting them.
- Do not commit, create a pull request, alter git history, or dispatch sub-agents.
- Run only verification the packet explicitly allows.
- Report uncertain behavior, unavailable environments, credentials, data, permissions, or plan changes as blockers; do not work around them silently.

## Execution

Implement in dependency order with the smallest safe diff, check the diff against the packet, and fix in-scope issues. Stop for conflicting ownership, missing prerequisites, or unapproved decisions. On completion or a checkpointed stop, hand ownership back explicitly. The main agent reviews all worker changes.

## Output

Concise Markdown:

- **Status and handback:** completed or blocked, whether mutation has stopped, and which files are handed back.
- **Changed files:** tied to approved task IDs.
- **Diff self-check:** scope, contracts, generated files, debug code, secrets, unrelated changes.
- **Evidence:** source review plus each allowed command and its result, by level (static/automated, build, runtime).
- **Blockers or unverified behavior:** cause and the decision needed.
