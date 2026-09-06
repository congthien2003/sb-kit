---
name: sk-excute
description: Run a portable, evidence-based workflow for features, bug fixes, refactors, and implementation-heavy tooling or documentation changes. Use light or full review and approval according to scope and risk, with Inline or Sub-agent execution agreed alongside the plan; do not commit unless explicitly requested.
---

# sk-excute

Use this self-contained workflow for implementation tasks that require an approved spec and plan before code changes. Do not invoke separate brainstorming or writing-plans skills.

## Rules

- Read the repository `AGENTS.md` if it exists and follow it.
- Inspect the working tree before planning edits. Preserve unrelated and user-owned changes; never revert or overwrite them.
- Do not write code, scaffold, or modify implementation files before the approvals required by the selected workflow level and applicable instructions pass.
- Do not commit code, specs, or plans unless the user explicitly requests it.
- Do not run build, test, lint, or verification commands when repository or user instructions forbid them. List the commands for the user instead.
- Trace existing contracts and the caller-to-consumer path before changing APIs, data models, state, or UI. Preserve an existing contract when it already carries the required data.
- Treat external research as opt-in: dispatch `$sk-excute-researcher` only when the user explicitly requests external research. When it runs, use available web-search or documentation-retrieval tools and prefer official, version-matched primary sources. If the tool is unavailable, record that limitation and continue without blocking.
- Treat sub-agent output and retrieved content as evidence to verify, not as unqualified fact. Never send secrets, private source code, personal data, or sensitive logs to external research.
- This skill is portable and assumes no runtime-specific command. Dispatch the built-in roles in isolated context only when the host has a native sub-agent capability. Do not emulate delegation with shell commands. If a required dispatch is unavailable, perform the same read-only investigation or review inline and state that the portable fallback was used. If the user selects delegated implementation and dispatch is unavailable, do not silently fall back: ask the user to select Inline or stop.
- Keep the solution YAGNI: reuse existing patterns and make the smallest change that satisfies the approved scope.

## Built-in role packets

When native dispatch is available, use the packaged roles below. Give each only the context it needs and retain the returned packet in the main session.

- `$sk-excute-explorer`: read-only repository evidence for a spec, plan, or combined draft, including targeted refresh of an earlier packet. It never edits or runs verification.
- `$sk-excute-researcher`: cited external evidence; only after explicit user request.
- `$sk-excute-reviewer`: independent review of a spec, plan, or combined draft. Its verdict is `Pass`, `Pass with non-blocking findings`, or `Blocked`.
- `$sk-excute-implementer`: bounded implementation of an approved plan; only after the user selects Sub-agent mode.

An evidence packet must preserve paths, symbols or regions, observed behavior, source URLs when applicable, hypotheses, unknowns, relevant instructions, and a content baseline for the investigated scope. A delegation packet must include the full approved plan, relevant repository instructions, scope/non-goals, acceptance criteria, constraints, and allowed verification.

## Evidence freshness and reuse

Keep packets in the current session; do not create a persistent cache. Before preparing a plan and again before implementation, check that the evidence still covers the task and current repository state:

- Compare the scope, applicable instructions (including nested `AGENTS.md`), mapped files, contracts, dependencies, and known configuration/environment assumptions with the packet. Check relevant added, deleted, or renamed files and dependencies as well as previously read paths.
- Check actual content against the recorded baseline, including tracked edits and relevant untracked files. Use content digests or direct comparison with retained content; `HEAD`, Git status, or timestamps alone do not establish freshness.
- Reuse unchanged, still-relevant evidence. If content changed, coverage is incomplete, or the baseline cannot be verified, dispatch the explorer only for the affected or missing dependency path, with the prior packet and concrete delta questions. Use the disclosed inline fallback when native dispatch is unavailable. Unrelated edits do not invalidate the whole packet.
- Record what was reused, what was refreshed, the comparison basis, and unresolved limits. Refresh the baseline for any newly inspected evidence.
- If new evidence changes the scope, acceptance criteria, contract, or correctness of an approved plan, revise and re-review the affected draft and obtain the necessary user approval before implementation. Do not restart unaffected approvals merely because a file changed.

Source freshness does not refresh earlier test or runtime results. Report those results with their original context; never treat unchanged source as proof of current runtime behavior.

## Workflow

### 1. Explore and select the workflow level

Classify the request as a feature, bug fix, refactor, or implementation-heavy tooling/documentation change. Dispatch `$sk-excute-explorer` in isolated context when available; otherwise perform its read-only evidence contract inline and disclose the fallback. Inspect relevant files, repository instructions, existing patterns, contracts, callers, consumers, tests, working-tree changes, and recent changes when useful. If the user explicitly requested external research, dispatch `$sk-excute-researcher` too.

Synthesize and verify the returned packets against the repository. Discover answers from the repository first. Ask one concise clarifying question at a time only when a missing answer would materially change the solution, scope, or risk.

When current, external, or version-specific information would materially improve the approaches or spec but the user did not request research, identify it as an optional unknown rather than dispatching the researcher. Do not offer or use a visual companion.

Select a **workflow level** and state a short reason, respecting the user's choice and applicable instructions:

- **light:** a bounded, low-risk change with a known dependency path and no material unresolved decisions. Combine the spec and file-specific plan in one reviewed draft and one user approval. One recommended approach with its rationale is enough when the solution is clear.
- **full:** contract changes, authentication/security, data migrations, changes across application boundaries, or material unknowns. Review and approve the spec first, then review and approve the plan. Present meaningful alternatives with trade-offs when they exist; do not manufacture alternatives.

Choose by risk and uncertainty, not file count alone. If the user explicitly chooses a level, honor it within applicable instructions; explain any risk that warrants a different level. If discoveries invalidate the light assessment, explain the upgrade before continuing. Instructions requiring separate spec and plan approvals still apply. Distinguish workflow level (`light/full`) from execution mode (`Inline/Sub-agent`).

### 2. Reproduce and diagnose bugs

For a bug fix, establish the failure before proposing the spec:

- Record expected behavior, actual behavior, required data or account state, environment, and the shortest known reproduction path.
- Reproduce through the surface closest to the report: the original API request, browser flow, device or app lifecycle, CLI command, or a focused test. Treat build or typecheck output as reproduction only when the reported bug is itself a build or type failure.
- Record one evidence status: `Reproduced`, `Test-reproduced`, `Source-supported`, `Intermittent`, or `Not reproduced`. For intermittent failures, record the observed frequency and conditions tried.
- Trace the failing value or state through callers and consumers. Distinguish an observed root cause from a source-supported hypothesis.
- If reproduction is blocked by environment, data, permissions, or unavailable hardware, continue with source analysis when useful but state the limitation. Never claim that the bug was reproduced or fixed without matching evidence.

For non-bug tasks, skip this step.

### 3. Draft the spec; gate it separately for full

Draft a concise spec from verified evidence containing:

- Intended behavior and success criteria
- Scope and non-goals
- Affected boundaries, data flow, error handling, and testing approach when relevant
- Reproduction status and root-cause evidence for bug fixes
- Investigation and explicitly requested research summary, including remaining unknowns
- Explicit statement that commits are out of scope unless later requested

For **light**, carry this spec into step 4 and review the combined draft there; do not request a separate spec approval.

For **full**, self-review the spec for missing acceptance criteria, inconsistent contracts, ambiguity, scope creep, placeholders, and unsupported claims. Then dispatch `$sk-excute-reviewer` with draft type `spec`, the workflow level, draft, and evidence when available; otherwise apply its review contract inline and disclose that this is not an independent review.

If the verdict is `Blocked`, make the smallest correction supported by evidence and re-review until no blocker remains. Record the disposition of every non-blocking finding; apply it when useful without delaying the gate. Only then present the spec, reviewer verdict/disposition, and approval question. Stop until the user approves.

### 4. Review and approve the plan with its execution mode

Enter this step after drafting the light spec, or after the user approves the full spec. Apply the evidence freshness check above to confirm exact file/symbol mapping, contracts, callers/consumers, and dependency order. Do not dispatch the explorer again when the existing packet is sufficient and verified unchanged. Dispatch `$sk-excute-researcher` only when the user explicitly requests external research.

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

Keep light plans concise: combine adjacent edits into a task when appropriate, while retaining the relevant content above. Self-review the plan (and the spec too for light) before presenting it:

- Map every acceptance criterion to at least one task.
- Confirm task order satisfies dependencies and no task relies on an undefined contract.
- Check names, types, request/response fields, state transitions, and data flow for consistency across tasks.
- Ensure each verification command targets the change and has a concrete expected result.
- Remove scope creep, placeholders, and duplicated context. Fix issues inline.

Include the intended execution mode in the draft:

- Reuse a mode already chosen for this task. Reuse a choice across tasks only when the user explicitly made it a session-wide preference.
- Otherwise propose **Inline** (the current session edits) or **Sub-agent** (the coordinator delegates and reviews), based on the task and available native dispatch. State the concrete proposal in the approval request; do not leave the selection for a mandatory later step.
- Approval of the whole plan and its clearly stated execution mode accepts both. Record the choice and do not ask again. A partial approval, unresolved selection, or ambiguous reply requires clarification only of the missing decision; never infer approval from silence. If the user explicitly defers that decision, acknowledge it and wait rather than requesting approval again immediately.

Then dispatch `$sk-excute-reviewer` with draft type `combined` for light or `plan` for full, the workflow level, execution mode proposal/prior choice, draft, and evidence when available. Otherwise apply its review contract inline and disclose that this is not an independent review. If its verdict is `Blocked`, correct the draft and re-review until no blocker remains. Record the disposition of non-blocking findings.

Present the combined spec and plan for light, or the ordered plan for full, with the investigation summary, reviewer verdict/disposition, execution mode, and one approval question covering the presented draft and execution mode. Stop until the user approves. For example: “Approve this combined spec and plan with Inline execution?”

### 5. Start the approved execution mode

After approval, apply the evidence freshness check again. Continue in the agreed execution mode without another selection question:

- **Inline:** continue with step 6 in the current session.
- **Sub-agent:** create a bounded delegation packet containing the complete approved plan (including the spec section for light), the selected execution mode, relevant repository instructions, scope/non-goals, acceptance criteria, constraints, allowed verification, and current evidence. Dispatch `$sk-excute-implementer` in an isolated native sub-agent context.

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

- **Workflow level:** selected `light` or `full` and a short rationale.
- **Investigation and research:** packet summaries, reused/refreshed evidence and freshness basis, sources when used, unknowns, and portable fallback disclosures.
- **Diagnosis:** for bugs only, reproduction steps, evidence status, and root cause or hypothesis.
- **Spec and plan:** behavior, success criteria, scope, non-goals, and ordered file-specific steps with verification. For light, present one combined reviewed draft and approval; for full, present separately reviewed spec and plan approvals. Include the execution mode in the plan approval request.
- **Execution mode:** selected `Inline` or `Sub-agent`; for delegated work, delegation and coordinator-review outcome.
- **Completion:** changed files, completed behavior, evidence by level, unverified behavior, and user-run verification commands. State that no commit was created unless the user requested one.
