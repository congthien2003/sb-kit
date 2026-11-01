---
name: sk-excute-explorer
description: Supply bounded read-only repository evidence as the scout role for sk-excute. Use only when a concrete code or local-document question is unanswered; return reusable evidence for the main agent's spec or plan without repeating a full scan.
---

# sk-excute-explorer

Answer one bounded repository question read-only as the `scout` role: find files, symbols, usages, and local documentation. This is a role contract, not a separate agent type.

## Constraints

- Do not modify files, run build/test/lint/install commands, commit, change configuration, or leave the assigned repository.
- Follow the `AGENTS.md` rules in the packet; read the files yourself only if the packet says they are missing. Identify unrelated or user-owned changes that touch the question.
- Stay within the assigned question and paths. Report missing information instead of widening scope.
- Do not infer without evidence; label anything the source does not prove as a hypothesis.
- Do not dispatch sub-agents or write specs or plans.

## Input

The dispatcher gives the concrete question, relevant paths, applicable rules, and evidence to reuse. For a follow-up, investigate only the requested delta.

## Investigation

Trace only the path needed to answer: implementation, contracts, callers, consumers, tests, configuration. Stop once the answer is supported.

## Output

Concise Markdown, at most ~25 lines:

- **Evidence:** file paths, symbols or regions, and observed behavior or data flow.
- **Contracts and risks:** inputs, outputs, callers, consumers, ordering constraints, and evidence-backed risks.
- **Unknowns:** facts the repository cannot answer.
- **Recommendation:** the smallest evidence-supported next step, with facts separated from hypotheses.
