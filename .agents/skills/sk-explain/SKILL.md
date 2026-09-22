---
name: sk-explain
description: Explain source-code questions, code paths, business flows, and state transitions with evidence-backed file references; use when someone needs to understand existing code rather than change it.
---

# sk-explain

Explain existing source code from evidence. This is a read-only analysis skill: it does not edit the project or create a documentation file unless the user explicitly asks for a separate deliverable.

## Investigation

1. Read the applicable `AGENTS.md` files and respect their repository boundaries and command rules.
2. Restate the user's question as a concrete target: a module, function, endpoint, event, data path, business flow, state transition, or behavior.
3. Locate the likely entry points and follow callers and consumers. Inspect related implementations, types/models, configuration, persistence, events/jobs/webhooks, tests, and project documentation when they help prove the path.
4. Prefer focused repository search and source inspection. Do not scan generated files, vendored dependencies, or unrelated modules unless they are necessary to explain the target.
5. Record the evidence before writing the explanation. Use repository-relative file paths plus symbols and line numbers when available; never invent a reference or a runtime result.

Do not run build, test, lint, or other verification commands by default. If the user explicitly asks for runtime evidence and the repository instructions allow it, report that evidence separately from static source analysis.

## Choose the explanation mode

Use a flow explanation when the requested behavior crosses files or layers, unfolds over time, uses asynchronous events/jobs/webhooks, or changes persisted state. A flow may include both synchronous and asynchronous branches.

Use a code walkthrough when the behavior is contained in a function, module, query, handler, or small group of blocks. If both views clarify the answer, lead with the high-level flow and include the relevant block walkthrough.

If several unrelated implementations match the question, list the candidate entry points and ask one focused clarification before selecting a path. If no meaningful path is found, report what was searched, identify the missing evidence, and do not fabricate an explanation.

## Evidence rules

Label material claims as one of:

- **Source-supported** — directly shown by executable code, a declared contract, a persisted model, a test, or an explicit configuration/reference.
- **Inferred** — a relationship or intent derived from multiple source locations; state why it is an inference and cite all relevant locations.
- **Unknown / not found** — the repository does not establish the behavior, or the relevant implementation is outside the inspected scope.

Names, comments, type names, and status labels can guide the search but do not prove runtime behavior on their own. Separate static source evidence from runtime, external-provider, or operational assumptions.

## Flow output

When the target is a flow, provide:

1. A concise conclusion and the inspected scope.
2. An ordered step table with the trigger/actor, action, important input/output, state or persistence change, conditions, errors/retries, and exact source references for every step.
3. The relevant caller-to-consumer or producer-to-handler relationship, including asynchronous boundaries and terminal effects.
4. A state-machine table or compact diagram only when explicit states, events, guards, persisted statuses, or tests support it. Mark inferred transitions clearly and omit the state machine when the source does not establish one.
5. A separate list of branches, failure paths, retries, idempotency behavior, side effects, and unknowns when they materially affect the answer.

Do not turn a list of similarly named functions into a flow unless their call, event, data, or persistence relationship is supported by source evidence.

## Code walkthrough output

When the target is code-local, explain the blocks in execution order. For each meaningful block, cover its input, transformation, guard or condition, side effect, error behavior, output, and downstream consumer when known. Call out early returns, nested branches, loops, transactions, permission checks, and implicit defaults when they change behavior.

## Response shape

Use only the sections the evidence needs, normally:

- `## Kết luận`
- `## Phạm vi và evidence status`
- `## Flow` or `## Code walkthrough`
- `## State machine` when warranted
- `## Branches, errors, and unknowns`

Keep the primary explanation readable and source-grounded. Do not claim that a command, provider interaction, database effect, or end-to-end flow succeeds unless the source or explicitly reported runtime evidence proves it.

After delivering the explanation, ask:

> Bạn có muốn dùng `$sk-visualizer` để tạo một file HTML giúp nhìn trực quan hơn không?

Do not invoke `$sk-visualizer` or create the HTML file until the user explicitly agrees. If the user agrees, hand the explanation to `$sk-visualizer` and follow that skill's one-HTML-file contract.
