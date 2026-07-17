---
name: sk-release
description: Prepare a software release and version bump. Use when drafting a release from Git history, choosing a SemVer patch/minor/major version, reviewing release readiness, generating a changelog or release summary, or preparing commit and Git tag commands without pushing or committing automatically.
---

# Release preparation

Prepare releases without pushing, committing, or creating a Git tag. Respect repository `AGENTS.md` instructions. If code or version-file edits are needed, first provide a plan and wait for approval when the repository requires it.

## Workflow

1. Read repository release conventions (`AGENTS.md`, package manifests, changelog/release docs, and recent version commits).
2. Find the most recent reachable version tag. If none exists, state that the release baseline is the initial commit or an explicitly supplied ref.
3. Inspect commits from that tag (or baseline) through `HEAD`. Group user-visible changes as features, bug fixes, documentation, maintenance, and breaking changes. Do not invent details not supported by the diff or commit history.
4. Check and report release readiness:
   - test status: use existing supplied results; otherwise mark **Not verified** and provide the command for the user to run;
   - documentation: identify docs changed or still needing updates;
   - breaking changes: detect API/config/behavior removals or incompatible changes, and mark **None identified** only when evidence supports it.
5. Recommend the version bump using SemVer:
   - `major` for confirmed breaking changes;
   - `minor` for backward-compatible features;
   - `patch` for backward-compatible fixes only.
   State the current version, proposed version, rationale, and any uncertainty. Do not edit version files during a preparation-only request. For a requested bump, plan and obtain approval before editing when required by repository instructions.
6. Draft a changelog and release summary in the required format below.
7. Provide a commit-message template and the exact Git tag command, but never run `git commit`, `git tag`, or `git push` unless the user explicitly asks.

## Required output

Always finish with this concise summary, using `None identified` and `Not verified` where applicable:

```markdown
## Release summary

- Release version: `vX.Y.Z` (from `vA.B.C`)
- Release type: patch | minor | major
- Features:
  - ...
- Bug fixes:
  - ...
- Breaking changes:
  - ...
- Documentation:
  - ...
- Verification: Passed | Failed | Not verified

## Todo before release

- [ ] ...
- [ ] ...

## Prepared commands (do not run automatically)

```bash
git add <version-files> CHANGELOG.md
git commit -m "chore(release): vX.Y.Z"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin <branch> --follow-tags
```
```

Use a changelog section headed `## [X.Y.Z] - YYYY-MM-DD`, with `### Added`, `### Fixed`, `### Changed`, and `### Breaking changes` only when each has entries. Omit empty sections.

## Guardrails

- Never claim tests passed without evidence.
- Never classify a change as breaking solely from a conventional-commit label; inspect the change when available.
- Keep unrelated commits out of the changelog and call out ambiguous commits for review.
- Never push, commit, or tag automatically.
