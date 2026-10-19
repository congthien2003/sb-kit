---
name: sk-idea-to-docs
description: Turn an initial project idea into a consistent foundation doc set (overview, spec, implementation plan) by asking one question at a time, separating confirmed requirements from proposals, assumptions and open points, and getting feedback before planning. Use to start a new project or feature from an idea, in English or Vietnamese, for example "từ ý tưởng lên tài liệu", "lên docs cho dự án mới", "write the overview, spec and plan for this idea". Stops at the docs; it does not implement, commit or run tests.
---

# Idea to foundation docs

Turn a rough idea into three aligned documents that are clear enough to start a project. The skill is self-contained: it elicits requirements itself and depends on no other skill.

## Rules

- Read root and applicable nested `AGENTS.md` files. Write the documents in the user's language.
- Never ask again for information already given in the conversation or in existing files. Ask only when the answer affects goal, scope, or architecture.
- Never decide for the user. Offer options with a recommendation and let the user choose.
- Do not research outside the repository unless the user asks.
- Stop at the docs: do not scaffold or implement the project, commit, or run build, test, or lint commands.
- Do not overwrite an existing file. Show a proposed replacement or diff and wait for explicit confirmation before writing it.
- Load a file in `templates/` only when drafting that document.

## Output documents

| File | Content |
| --- | --- |
| `docs/overview.md` | Context, problem, target users, value, goals, high-level scope. |
| `docs/spec.md` | Main features, business flows, rules, in/out of scope, acceptance criteria, non-functional requirements, high-level technical approach. |
| `docs/implementation-plan.md` | Phases in dependency order; each with goal, scope, outputs, dependencies, completion criteria. |

Use a different path only when the user names one or the repository already has a docs convention.

## Workflow

1. **Intake.** Take the idea and read existing context: README, docs, manifests, notes the user points to. List what is already known.
2. **Clarify.** Ask one question at a time, preferring multiple choice. Cover goals, target users, scope, features, constraints, and success criteria in whatever order the gaps appear. Defer decisions that can safely wait and record them as deferred; do not prolong the Q&A for them.
3. **Restate.** Summarize your understanding, labeling each item **Confirmed**, **Proposed**, **Assumption**, or **Open**. Continue only after the user confirms or corrects it.
4. **Decide.** For each important choice (architecture, platform, data, scope cut), present 2–3 options with trade-offs and a recommendation. Record the user's decision.
5. **Draft Overview and Spec.** Write `docs/overview.md` and `docs/spec.md` from the templates. Present them and **stop for feedback before planning**. Revise until the user is satisfied.
6. **Plan and check.** Write `docs/implementation-plan.md`. Then review all three documents for consistency and fix what you find. Report the file paths and any remaining open points; do not paste the documents back.

## Detail level

- Spec: product plus high-level technical approach. Plan: the main implementation phases.
- Add API shapes, schemas, or per-file change lists only when needed to explain an important decision.

## Quality checks

- Every in-scope feature is assigned to at least one phase.
- Phases follow dependency order; no phase uses an output that a later phase creates.
- Completion criteria and acceptance criteria are specific and verifiable.
- In-scope and out-of-scope lists do not contradict each other or the plan.
- Terms, names, and numbers match across the three documents.
- Open points and deferred decisions are listed with who decides and when.
- Every requirement is marked Confirmed, Proposed, Assumption, or Open; nothing proposed or assumed is presented as confirmed.
