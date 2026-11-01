---
name: sk-verify-code-ui-only
description: Audit existing UI source for design-system compliance, component reuse, typography, and spacing consistency. Use whenever a user asks to review/audit/check UI or design-system consistency, including requests in English or Vietnamese, without changing code.
---

# Verify UI code

Perform a framework-agnostic, read-only static audit of existing UI source. Find evidence-backed inconsistencies with this repository's own standards, not violations of a universal design system.

## Instructions

1. **Read applicable instructions and protect the working tree.** Before inventory or scanning, read and follow the repository-root and applicable nested `AGENTS.md` files, including their source-scope and command/verification rules. Preserve existing user changes and settings; do not clean, overwrite, or revert them. If instructions conflict or prevent a safe audit, disclose the limitation rather than guessing.

2. **Confirm and inventory the audit scope.** For explicitly selected paths, pages, or sections, inspect those targets. Otherwise inventory all first-party UI. Identify routes/pages, layouts/sections, shared components, and style/theme/token configuration relevant to visual standards. Record the complete in-scope file inventory before scanning. Exclude hooks, services, APIs, state, data, business logic, generated output, and vendor code. In mixed files inspect only UI rendering, imports, props/variants, and styles; do not trace behavior into excluded layers. Read canonical references outside target pages when needed to establish standards, but do not thereby expand audited scope.

3. **Build a local standards registry before checking for violations.** Cite repository evidence for:
   - canonical components, public re-exports/aliases, supported props, variants, and composition patterns;
   - typography components/classes and verified font family, size, weight, and line-height tokens or documented role-specific combinations;
   - spacing conventions such as horizontal/vertical padding, gaps, and container widths, with representative comparable surfaces and responsive breakpoints.
   Prefer explicit docs, token/config declarations, canonical component APIs, and representative usage. Prevalence alone is not a standard. Record absent or conflicting guidance as unknown/review-needed rather than resolving it by guess.

4. **Check the approved UI consistency categories.** Across every in-scope file, inspect rendered UI and relevant imports, props, variants, classes, and styles for:
   - hand-built equivalents that bypass an applicable canonical component;
   - styling, prop, or class overrides that defeat an existing supported component variant;
   - typography family, size, weight, or line-height diverging from a verified role-specific component/class/token;
   - `px`/`py`, gap, or container spacing drift on comparable surfaces at the same breakpoint and variant.
   Use search only to discover candidates, never as proof of coverage or a verdict. Read each relevant occurrence in context and report all distinct supported occurrences; do not sample only top matches or impose a top-N limit. Compare like surfaces, considering semantic purpose, content, supported variants, responsive behavior, and intentional documented exceptions. Static source does not establish runtime appearance.

5. **Confirm discrepancies with evidence and a compatible replacement.** Confirm a violation only when an applicable documented/canonical standard exists, the occurrence departs from it, and a compatible existing replacement API/token is verified. Otherwise mark it review-needed, an accepted exception, or an unknown/conflicting standard. Account for semantic differences, intentional overrides, CSS modules and framework-specific conventions. Dynamic classes or unresolvable tokens require an uncertainty note. Do not invent components, variants, classes, or tokens.

6. **Use concrete comparisons carefully.**
   - A hand-built button may bypass a canonical Button only if that component exists, applies to the semantics, and has a fitting supported variant. A raw `<button>` alone proves nothing.
   - An override that negates a variant is reportable only if the existing variant's contract is evidenced and the override actually conflicts with it; a custom class alone proves nothing.
   - `text-[11px]` is a concern only when a repository typography standard for that same role is evidenced and the family, size, weight, or line-height diverges; a class alone proves nothing.
   - Different `px`/`py`, gap, or container values are drift only for comparable surfaces at the same breakpoint/variant. Valid responsive or content-specific changes are not violations.
   - Native primitives inside a canonical component implementation are valid and must not be reported as bypasses.

7. **Optionally partition work only when permitted and supported.** Native isolated read-only subagents may receive non-overlapping page/section assignments, with one shared-UI owner. The parent owns the standards registry and final aggregation. Dispatch only with host/operator permission and actual native capabilities; never emulate dispatch with shell commands or use runtime-specific orchestrators. Give each child the relevant instructions, exclusions, registry, finding/report schema, and this exact return contract:
   - assignment: page/section and exact assigned files;
   - coverage: completed inspected files, skipped files, failed files, and unassigned files, with a reason for every skipped/failed/unassigned entry;
   - findings: per-occurrence entries using the report schema under Respond in the user's language below, including occurrence and standard references, discrepancy, compatible replacement when verified, status, confidence, and impacted consumers;
   - accepted exceptions and standards gaps/conflicts/unknowns with evidence and locations;
   - explicit confirmation that no files were edited and no checks, installs, or other verification were run.
   Children must not edit, verify, recursively delegate, or silently omit files. The parent reconciles returned coverage with the original inventory, source-checks findings, and retries or sequentially inspects unresolved files when possible. If unresolved files cannot be inspected, report honest partial coverage and reasons. If dispatch is unavailable or not permitted, scan sequentially and disclose that fallback.

8. **Verify and aggregate findings in the parent.** Source-check each proposed issue against its occurrence and cited standard; reject unsupported claims. Deduplicate the same source issue reached through multiple consumers and list impacted consumers. Group repeated patterns but preserve every distinct occurrence. Reconcile completed/skipped/failed/unassigned file lists against the full scoped inventory; disclose failures and never imply complete coverage when files were not inspected. Keep finding IDs stable within the report and make summary counts reconcile with unique detailed findings.

9. **Respond in the user's language.** Default to a chat report; create or modify an artifact only if explicitly requested. Large reports may be split across chat parts without writing files. Organize the report as follows:
   - **Scope and coverage:** selected/inferred UI targets, exclusions, completed/skipped/failed/unassigned files, and sequential fallback if applicable.
   - **Standards registry:** canonical reference and location citations, supported APIs/tokens, or explicit absent/conflicting standards.
   - **Summary:** counts for confirmed violations, review-needed findings, accepted exceptions, and standards gaps; reconcile with details.
   - **Confirmed violations:** each finding has stable ID, UI-impact priority, status and confidence; occurrence file:line and short snippet; standard file:line; verified compatible replacement component/variant/class/token; discrepancy; recommendation; impacted pages/sections.
   - **Review-needed:** same evidence fields where available, plus what remains unknown and why it cannot be confirmed.
   - **Accepted exceptions:** cite the documented or contextual reason and relevant location.
   - **Standards gaps/conflicts and coverage limits:** locations and unresolved uncertainty.
   State that no issues means none were found in the inspected scope, not runtime correctness.

10. **Keep the audit read-only.** Do not autofix, format, install dependencies, or run lint/build/test/browser checks or external research by default. Respect applicable repository command rules and do not commit. Run additional checks only when the user separately asks and authorizes them; report static source evidence separately from any such tool/runtime evidence.

## Avoid false positives

An isolated raw button or paragraph, `text-[11px]`, custom spacing, unequal padding, override, or token-looking string is a candidate to investigate, not a defect. Check actual APIs and standards, usage context, semantic role, responsive variants, and intentional exceptions before assigning violation status. If evidence is missing, say so plainly instead of turning a convention guess into a finding.
