---
name: sk-excute-fast
description: Run a smart, fast approval workflow for small, low-risk repository changes: brainstorm, write a concise spec, obtain approval, write a file-specific mini-plan, obtain approval, then implement and verify. Use this skill whenever a user asks to quickly add, fix, tweak, rename, or refactor a narrowly scoped feature, bug, CLI behavior, test, configuration, or documentation change and still wants review points before editing. Prefer this skill over sk-excute for changes with a small, local blast radius; escalate to sk-excute when the task needs broad investigation, external research, API/schema changes, several subsystems, or delegated implementation.
---

# sk-excute-fast

Use this workflow to keep small changes deliberate without turning them into a lengthy multi-agent process. The goal is a safe, minimal diff with two clear human approval points.

## Fit check

Use the fast path when the likely solution is local and can normally be expressed in **one to three files** with **two to five implementation steps**. Typical fits include a focused bug fix, copy or validation tweak, small CLI flag, narrow test addition, configuration adjustment, or isolated refactor.

Escalate to `sk-excute` before drafting the spec when any of these are true:

- The change crosses multiple subsystems, services, packages, or user journeys.
- It changes a public API, persistent schema, authentication/authorization boundary, migration, payment flow, or security-sensitive behavior.
- The correct behavior depends materially on external, current, or version-specific research.
- The repository evidence leaves a material ambiguity that cannot be resolved with one concise question.
- The user requests multi-agent investigation, formal independent review, or delegated implementation.

State the escalation reason and offer to continue with `sk-excute`; do not pretend a complex change is small.

## Operating principles

- Read and follow applicable `AGENTS.md` files. Inspect `git status` before planning or editing; preserve unrelated user changes.
- Do not change implementation files before the user approves both the spec and the plan. Do not commit unless explicitly requested.
- Investigate only the shortest relevant path: the target file, its direct contract/caller or consumer, and the most relevant test or configuration. Expand only when evidence requires it.
- Reuse existing conventions and choose the smallest change that satisfies the approved behavior. Do not add dependencies, abstractions, or broad cleanup work without a demonstrated need.
- Ask at most **one concise clarifying question at a time**, and only when its answer would materially change scope or behavior. Otherwise, record a clearly labeled assumption and let the user approve or correct it.
- Use repository evidence before inference. For a small bug, make a focused reproduction attempt only when it is cheap and permitted; otherwise state `Source-supported` rather than claiming reproduction.
- Run only relevant verification that repository and user instructions allow. Never represent static, build, or test evidence as runtime proof.

## Workflow

### 1. Rapid scan and brainstorm

Classify the request as a small feature, bug fix, refactor, test, configuration, or documentation change. Perform the fit check, inspect the minimum evidence path, and identify the smallest safe change boundary.

Present a compact brainstorm, not an open-ended ideation exercise:

```markdown
## Quick read
- Evidence: `path: symbol/region` — observed behavior
- Constraint: relevant instruction, contract, or user-owned change
- Assumption or unknown: only if material

## Options
1. **Recommended — [approach]:** benefit; trade-off.
2. **Alternative — [approach]:** benefit; trade-off.  <!-- omit when no meaningful alternative exists -->
```

Recommend one approach. Do not dispatch subagents or conduct external research in this fast workflow.

### 2. Spec gate

Draft a micro-spec based on the rapid scan. Keep it short enough to review in one screen:

```markdown
## Spec — [task]

**Intent:** [observable user or developer outcome]

**In scope:**
- [bounded behavior/change]

**Out of scope:**
- [explicitly excluded related work]

**Acceptance criteria:**
- [observable criterion]
- [observable criterion]

**Change boundary:** `path` — [symbol/region and responsibility]

**Verification:** [focused command or manual check] → [expected result]

**Evidence / assumption:** [only the facts or assumptions that matter]

No commit will be created unless you request one.

**Approve this spec?** Reply `approve spec`, request a revision, or clarify an assumption.
```

For bugs, add one line: `Diagnosis: Reproduced | Test-reproduced | Source-supported | Not reproduced — [brief evidence].`

Stop after this question. Do not combine spec and plan approval or edit code while waiting.

### 3. Mini-plan gate

After an explicit spec approval, re-check only the exact files and symbols named by the approved spec. Write a concrete mini-plan with two to five ordered steps:

```markdown
## Implementation plan — [task]

1. **`path` — `symbol/region`**
   - Change: [specific behavior or code-level change].
   - Why: [acceptance criterion or dependency].
2. **`path` — `symbol/region`**
   - Change: [specific behavior or test update].
   - Why: [acceptance criterion or dependency].

**Verification:**
- `[command]` → [expected result]

**Approve this plan?** Reply `approve plan` to implement, or request a revision.
```

Every acceptance criterion must appear in a plan step or the verification. Name exact paths and symbols/regions; avoid placeholders and generic steps such as “update logic.” If the re-check reveals larger scope or a material contract risk, stop and escalate to `sk-excute`.

Stop after this question. Do not ask the user to select an execution mode: implementation is inline by design.

### 4. Implement and verify

After explicit plan approval, implement only the approved mini-plan. Keep the diff small, preserve unrelated changes, and do not commit.

Run the focused verification from the plan when allowed. If a failure indicates a required scope or behavior change, stop, explain the blocker, and return to the appropriate approval gate. Do not silently expand the work.

Finish with:

```markdown
## Completed
- Changed: `path` — [what changed]
- Behavior: [completed acceptance criteria]
- Verification: [command/check] — [result]
- Not verified: [behavior and reason, or `None`]
- Commit: none created
```

Separate evidence accurately: source review, automated/static checks, build, and real runtime/manual behavior are different levels of confidence.

## Fast-path boundaries

Do not skip either approval gate merely because the change looks obvious. Speed comes from narrow investigation, concise artifacts, limited alternatives, and inline implementation—not from editing before the user agrees to the intended behavior and exact plan.
