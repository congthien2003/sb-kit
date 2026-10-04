---
name: sk-create-skill
description: Create or improve SaboKit skills, or explicitly rename or integrate them into the repository. Trigger on English or Vietnamese requests to create, improve, rename, or integrate a SaboKit skill, including "tạo skill", "cải thiện skill", "đổi tên skill", and "tích hợp skill"; do not trigger for unrelated skill execution or general application work.
---

# Create or improve a SaboKit skill

Coordinate SaboKit skill authorship with the repository's approved implementation workflow. This skill is a thin coordinator, not a replacement for either companion workflow.

## Prerequisites and ownership

Resolve the companion skills relative to this skill directory, not through machine-specific paths:

- `../skill-creator/SKILL.md` owns intent capture, skill authorship, eval design, and feedback-driven improvements.
- `../sk-excute/SKILL.md` owns investigation, spec and plan approvals, review, execution-mode choice, implementation prohibitions, and evidence reporting.

Read both before proceeding. If either required companion is unavailable, stop and tell the user which skill must be installed; do not install it automatically or substitute a locally invented workflow. Keep these workflows separate: do not restart either recursively. Creator intent/design informs the spec and plan; excute governs approvals and implementation. Creator authorship, evals, and feedback loops may proceed only within approved scope and after required approvals. In Sub-agent mode, implementation and corrections remain implementer-owned, and the coordinating parent must not patch them; in Inline mode, defer implementation ownership to the workflow defined by sk-excute. The coordinating parent may coordinate authorized evaluations.

Use the native capability and fallback behavior described by `sk-excute`; never emulate delegation with shell commands or silently change execution mode. Do not copy either companion's workflow or templates into this skill.

## SaboKit-specific checklist

After reading the companions, follow their applicable workflow and confirm the boundaries below in the approved plan:

- **Name and trigger:** use one kebab-case skill directory and matching frontmatter `name`; describe explicit English and Vietnamese trigger intent. Distinguish a requested skill creation/improvement from a request to execute an existing skill. For renames, obtain an explicit choice about old-name removal, compatibility alias, and any collisions before touching them.
- **Interface and resources:** provide valid `name` and `description` frontmatter, a clear user-facing interface, and an appropriate agent metadata file such as `agents/openai.yaml` when the skill follows that convention. Use the exact default prompt `$<skill-name>`. Add only necessary references, scripts, or assets; link resources with paths relative to the skill directory and keep the main instructions lean.
- **Catalog placement:** determine whether the skill belongs in the picker category (`sk-work`, `assets`, or `report`) or the `SB_KIT_SKILLS` core set. Category membership and core membership are separate. Reuse current directory discovery/default installer behavior; change CLI registries only if the approved requirement actually needs it. Do not alter companion skills or lockfiles as incidental catalog work.
- **Install contract:** preserve `.agents/skills` as the source and optional `.claude/skills` mirror, selected-only replacement, and install-missing-only non-overwrite behavior. Cover both roots, explicit selection, and sentinel preservation with disposable integration-test targets cleaned in `finally` blocks.
- **Docs and landing:** inspect the current README, changelog, root `index.html`, established styles, and displayed skill counts before editing. Update only the relevant existing catalog/usage copy and the current landing card/counts; do not create another landing page or infer missing catalog entries.
- **Evals and release:** store eval definitions under the skill being created or updated at `<target-skill>/evals/evals.json`; keep generated eval workspaces/results outside discoverable skill directories. Do not auto-version, commit, or release.

## Completion

Report the files changed, approval and handoff boundaries followed, checks actually run, and remaining uncertainty. Distinguish source/test evidence from browser or runtime evidence; do not claim behavior that was not verified.
