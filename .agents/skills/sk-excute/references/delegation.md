# Optional delegation

Read only when dispatching a scout, researcher, or worker. Inline work remains the default. These rules supplement, not replace, the main workflow's approvals and permissions.

## Roles and contracts

Roles are defined by function, not host agent-type name; map each to the available role-matching agent. Children never dispatch agents. Read the selected contract before dispatch; paths below are relative to this reference file.

| Role | Function | Contract |
| --- | --- | --- |
| `scout` | Read-only evidence for a concrete missing repo or local-doc answer. | `../../sk-excute-explorer/SKILL.md` |
| `researcher` | Cited public external evidence for a decision-relevant question. | `../../sk-excute-researcher/SKILL.md` |
| `worker` | Implement an approved task or coherent task group. | `../../sk-excute-implementer/SKILL.md` |

## Model and token discipline

- Run children on a lower-cost role-appropriate model than the main session when the host permits selection. Do not default to a general-purpose child inheriting the main model when a lighter suitable agent exists. If the host cannot choose the child's model, disclose that limitation.
- Keep the packet to about 15 lines: objective, relevant paths/evidence, applicable `AGENTS.md` rules, authority boundary, acceptance criteria, allowed verification, and stop conditions. Send only the slice and dependencies, never the whole conversation or plan. Do not omit necessary safety or ownership context to meet the length target.
- Ask for only the needed output, about 25 lines. A scout stops once the question is answered. Do not dispatch for known facts or small tasks; request only a new delta during planning.
- Use native host delegation, not shell-based emulation. Honor host authorization, consent, privacy, and offline restrictions.

## Worker ownership

The worker allocation must be user-approved. Ask before adding or changing it. Assign one coherent task group, not one worker per todo or the whole plan.

Include task IDs, scope/non-goals, dependencies and needed contracts, exact permitted files with the user-owned baseline, acceptance, allowed verification, and stop conditions. The worker owns those files exclusively until explicit handback; the main agent does not edit them meanwhile. After handback, review all worker changes and integrate or correct within approved scope.

## Fallbacks

- If a contract cannot be resolved, name the missing skill (`sk-excute-explorer`, `sk-excute-researcher`, or `sk-excute-implementer`). Do not install it or invent a contract.
- If scout or researcher dispatch is unavailable, gather permitted evidence inline or disclose the limitation. Never guess a decision-critical fact.
- If a worker is unavailable or fails, report actual status and partial changes and ask before taking over its scope. Do not silently change ownership.
