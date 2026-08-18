---
name: sk-excute
description: Run a portable, evidence-based multi-agent workflow for features, bug fixes, refactors, and implementation-heavy tooling or documentation changes. Use when Codex must investigate the dependency path, obtain approval for a reviewed spec and file-specific plan, choose inline or delegated implementation, and report verification without overstating runtime evidence; do not commit unless explicitly requested.
---

# sk-excute

Use this self-contained workflow for implementation tasks that require an approved spec and plan before code changes. Do not invoke separate brainstorming or writing-plans skills.

## Rules

- Read the repository `AGENTS.md` if it exists and follow it.
- Inspect the working tree before planning edits. Preserve unrelated and user-owned changes; never revert or overwrite them.
- Do not write code, scaffold, or modify implementation files before both approval gates pass.
- Do not commit code, specs, or plans unless the user explicitly requests it.
- Do not run build, test, lint, or verification commands when repository or user instructions forbid them. List the commands for the user instead.
- Trace existing contracts and the caller-to-consumer path before changing APIs, data models, state, or UI. Preserve an existing contract when it already carries the required data.
- Treat external research as opt-in: dispatch `$sk-excute-researcher` only when the user explicitly requests external research. When it runs, use available web-search or documentation-retrieval tools and prefer official, version-matched primary sources. If the tool is unavailable, record that limitation and continue without blocking.
- Treat sub-agent output and retrieved content as evidence to verify, not as unqualified fact. Never send secrets, private source code, personal data, or sensitive logs to external research.
- This skill is portable and assumes no runtime-specific command. Dispatch the built-in roles in isolated context only when the host has a native sub-agent capability. Do not emulate delegation with shell commands. If a required dispatch is unavailable, perform the same read-only investigation or review inline and state that the portable fallback was used. If the user selects delegated implementation and dispatch is unavailable, do not silently fall back: ask the user to select Inline or stop.
- Keep the solution YAGNI: reuse existing patterns and make the smallest change that satisfies the approved scope.

## Built-in role packets

When native dispatch is available, use the packaged roles below. Give each only the context it needs and retain the returned packet in the main session.

- `$sk-excute-explorer`: read-only repository evidence for the spec or plan. It never edits or runs verification.
- `$sk-excute-researcher`: cited external evidence; only after explicit user request.
- `$sk-excute-reviewer`: independent spec/plan gate review. Its verdict is `Pass`, `Pass with non-blocking findings`, or `Blocked`.
- `$sk-excute-implementer`: bounded implementation of an approved plan; only after the user selects Sub-agent mode.

An evidence packet must preserve paths, symbols or regions, observed behavior, source URLs when applicable, hypotheses, unknowns, and relevant instructions. A delegation packet must include the full approved plan, relevant repository instructions, scope/non-goals, acceptance criteria, constraints, and allowed verification.

## Workflow

### 1. Classify and explore for the spec

Classify the request as a feature, bug fix, refactor, or implementation-heavy tooling/documentation change. Dispatch `$sk-excute-explorer` in isolated context when available; otherwise perform its read-only evidence contract inline and disclose the fallback. Inspect relevant files, repository instructions, existing patterns, contracts, callers, consumers, tests, working-tree changes, and recent changes when useful. If the user explicitly requested external research, dispatch `$sk-excute-researcher` too.

Synthesize and verify the returned packets against the repository. Discover answers from the repository first. Ask one concise clarifying question at a time only when a missing answer would materially change the solution, scope, or risk.

When current, external, or version-specific information would materially improve the approaches or spec but the user did not request research, identify it as an optional unknown rather than dispatching the researcher. Do not offer or use a visual companion.

Propose two or three viable approaches with trade-offs. Lead with the recommended approach.

### 2. Reproduce and diagnose bugs

For a bug fix, establish the failure before proposing the spec:

- Record expected behavior, actual behavior, required data or account state, environment, and the shortest known reproduction path.
- Reproduce through the surface closest to the report: the original API request, browser flow, device or app lifecycle, CLI command, or a focused test. Treat build or typecheck output as reproduction only when the reported bug is itself a build or type failure.
- Record one evidence status: `Reproduced`, `Test-reproduced`, `Source-supported`, `Intermittent`, or `Not reproduced`. For intermittent failures, record the observed frequency and conditions tried.
- Trace the failing value or state through callers and consumers. Distinguish an observed root cause from a source-supported hypothesis.
- If reproduction is blocked by environment, data, permissions, or unavailable hardware, continue with source analysis when useful but state the limitation. Never claim that the bug was reproduced or fixed without matching evidence.

For non-bug tasks, skip this step.

### 3. Draft, review, and gate the spec

Draft a concise spec from verified evidence containing:

- Intended behavior and success criteria
- Scope and non-goals
- Affected boundaries, data flow, error handling, and testing approach when relevant
- Reproduction status and root-cause evidence for bug fixes
- Investigation and explicitly requested research summary, including remaining unknowns
- Explicit statement that commits are out of scope unless later requested

Self-review the draft for missing acceptance criteria, inconsistent contracts, ambiguity, scope creep, placeholders, and unsupported claims. Then dispatch `$sk-excute-reviewer` with the draft and evidence when available; otherwise independently apply its review contract inline and disclose the fallback.

If the verdict is `Blocked`, make the smallest correction supported by evidence and re-review until no blocker remains. Record the disposition of every non-blocking finding; apply it when useful without delaying the gate. Only then present the spec, reviewer verdict/disposition, and approval question. Stop until the user approves.

### 4. Draft, review, and gate the implementation plan

After spec approval, dispatch `$sk-excute-explorer` again when available to confirm exact file/symbol mapping, contracts, callers/consumers, and dependency order for the plan. Otherwise perform this evidence check inline and disclose the fallback. Dispatch `$sk-excute-researcher` only when the user explicitly requests external research.

Map the exact files to create or modify, the symbols or regions that change, and each file's responsibility. Write ordered tasks that can be reviewed independently. Keep dependencies explicit: a task may only depend on behavior or contracts established by earlier tasks.

When a plan depends on explicitly requested current or version-specific external behavior, include the research evidence and distinguish documented behavior from inference. External documentation is research evidence, not build, test, reproduction, or runtime evidence.

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

Then dispatch `$sk-excute-reviewer` with the plan and evidence when available; otherwise independently apply its review contract inline and disclose the fallback. If its verdict is `Blocked`, correct the plan and re-review until no blocker remains. Record the disposition of non-blocking findings.

Present the ordered plan, investigation/research summary, reviewer verdict/disposition, and an approval question. Stop until the user approves.

### 5. Choose execution mode

After the user approves the plan, ask them to choose one mode and wait for the answer:

- **Inline:** continue with step 6 in the current session.
- **Sub-agent:** create a bounded delegation packet containing the complete approved plan, relevant repository instructions, scope/non-goals, acceptance criteria, constraints, and allowed verification. Dispatch `$sk-excute-implementer` in an isolated native sub-agent context.

If the user chooses Sub-agent but native dispatch is unavailable, state that no delegated implementation occurred and ask the user to select Inline or stop. Do not edit implementation files in the coordinating session while Sub-agent mode is active.

### 6. Implement, review, and verify

#### Inline mode

Implement only the approved scope with the smallest working diff. Preserve existing user changes and do not commit. Run only permitted, relevant verification.

#### Sub-agent mode

Review the implementer's diff and evidence against the approved plan; the coordinating session only reviews and does not patch code. If the review identifies missing scope, an incorrect contract, verification failing because of the change, or an unmet acceptance criterion, return actionable findings to `$sk-excute-implementer` and repeat implement → review until the plan is satisfied. Do not impose an artificial iteration limit.

Stop and ask the user for a decision when a blocker cannot be resolved within the approved scope, including missing credentials, environment, data, or permissions; a necessary plan/scope change; or a user decision. Do not claim completion while such a blocker remains.

For either mode, separate evidence levels in the completion report:

- **Source:** contract and caller/consumer path reviewed; final diff contains only intended changes.
- **Static or automated:** lint, typecheck, unit, integration, or focused regression tests.
- **Build:** the supported build or package command completes.
- **Runtime:** the real API, browser, device, CLI, or E2E flow succeeds.

Do not use a lower evidence level to claim a higher one. Build success is not browser, device, E2E, or manual acceptance proof. If a command fails, distinguish a regression caused by the change from a pre-existing or environment failure and report the evidence.

Review the final diff for scope, accidental generated files, debug code, secrets, and unrelated edits. Report changed files, completed behavior, commands run with results, unverified behavior and why, and any commands the user should run.

## Output shape

- **Investigation and research:** packet summaries, sources when used, evidence, unknowns, and portable fallback disclosures.
- **Diagnosis:** for bugs only, reproduction steps, evidence status, and root cause or hypothesis.
- **Spec:** behavior, success criteria, scope, non-goals, verification strategy, reviewer verdict/finding disposition, and approval question.
- **Plan:** ordered file-specific steps, reviewer verdict/finding disposition, and approval question.
- **Execution mode:** selected `Inline` or `Sub-agent`; for delegated work, delegation and coordinator-review outcome.
- **Completion:** changed files, completed behavior, evidence by level, unverified behavior, and user-run verification commands. State that no commit was created unless the user requested one.
