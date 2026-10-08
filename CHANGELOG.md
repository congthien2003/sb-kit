# Changelog

## [3.2.0] - 2026-10-08

### Added

- Add offline selected-skill updates with preview, explicit local/unknown overwrite consent, retained original/receipt backups, per-target rollback and interruption recovery journals.
- Add `sk-review-diff` for scoped read-only code change reviews, with three eval definitions.
- Add supporting `sk-debug` with diagnosis evidence labels, privacy boundaries and three eval definitions.
- Add editable installation presets with explicit required-companion consent; retain Manual as the default.
- Automatically include all four `sk-excute-*` role skills when `sk-excute` is selected.
- Add offline, read-only `sb-kit doctor` with text/JSON findings and provenance-aware exit codes.
- Add per-root install receipts with raw SHA256 fingerprints, safe-path validation and mutation journals. Skipped and legacy skills retain their provenance.

### Fixed

- Close `sk-excute` companion, consent, and routing gaps.

### Changed

- Promote `sk-review-diff` to core and move `sk-review-diff` and `sk-verify-code-ui-only` out of the report picker category.

### Breaking changes

- Remove the packaged `sk-excute-fast` skill; use `sk-excute` for all implementation scopes. Existing project installations are preserved.
- Keep `sk-create-skill` and `skill-creator` repository-local and exclude them from the package and installer picker; existing project installations are not automatically removed.

## [3.0.1] - 2026-10-05

### Fixed

- Fix the core bundle classification so `sk-verify-code-ui-only` is installed by `create next-hono` and displayed in the SaboKit core catalog while retaining its report picker category.

### Changed

- Update installer integration coverage, README, and landing-page catalog counts for 13 core and 7 supporting skills.

## [3.0.0] - 2026-10-04

### Added

- Add `sk-create-skill` as a supporting coordinator for approved SaboKit skill creation and improvement, with prerequisite, handoff, catalog, installer, documentation, and eval guidance.
- Add `sk-verify-code-ui-only` for evidence-backed, read-only audits of UI component reuse, typography, and spacing.
- Bundle `skill-creator` as an explicitly selectable companion for skill authorship and improvement.
- Add coordinator metadata and three skill-coordination eval definitions.

### Changed

- Document skill selection, companion prerequisites, and usage in README and the existing root landing page.
- Complete the catalog for all 20 packaged skills: 12 core and 8 supporting.
- Extend CLI integration coverage for skill selection, installation, catalog consistency, and release metadata.

### Breaking changes

- Remove `herdr-orchestra` from the packaged skill catalog and installer picker. Existing installed copies are not deleted.

## [2.6.0] - 2026-09-16

### Added

- Add `sk-excute-fast` for small, low-risk changes with fast approval gates.
- Add `sk-explain` for evidence-backed explanations of source-code questions, flows, and state transitions.

### Changed

- Include both skills in the core bundle and expose them through the report catalog.
- Update CLI integration coverage and the README skill catalog.

## [2.5.0] - 2026-09-06

### Added

- Add `sk-landing-page` for product landing pages at `landing/index.html`.
- Add three `sk-visualizer` references for system change reports, specs, and implementation plans.
- Add integration assertions for installing visualizer reference files.

### Changed

- Add explicit English/Vietnamese selection and matching fonts to `sk-visualizer`.
- Replace the root landing page with a redesigned `landing/index.html`.
- Document `sk-landing-page` installation and usage in README.

## [2.4.1] - 2026-08-31

### Changed

- Refine `sk-visualizer` design guidance for coherent typography, spacing, responsive overflow, subtle corner radii, restrained motion, and accessibility checks.

## [2.4.0] - 2026-08-18

### Added

- Add portable `sk-excute` workflow roles: explorer, researcher, reviewer, and implementer.
- Add categorized multi-select skill picker for `sb-kit install`.
- Add `Replace selected` conflict mode for selected existing skills.
- Add landing-page screenshot demonstrating skill selection.

### Changed

- Expand the `sk-excute` workflow with evidence gathering, review gates, and explicit inline/sub-agent behavior.
- Update `create next-hono` to install the complete `sk-excute` role set.
- Refresh README and landing-page documentation for the new installation flow.

## [2.2.1] - 2026-08-11

### Added

- Add `herdr-orchestra` to using herdr terminal.

## [2.2.0] - 2026-08-11

### Added

- Add `sb-kit create next-hono <project-name> [--claude]` to bootstrap a pnpm workspace with generated Next.js and Hono applications, root tooling, core skills, formatting, and an agent handoff prompt.
- Add `sk-start-next-hono` to finish the generated workspace with the project architecture, PostgreSQL and Drizzle, authentication boundaries, the same-origin API proxy, and optional Cloudflare R2.
- Add repository guidance for maintaining and verifying the CLI.

### Fixed

- Run pnpm commands through `cmd.exe` on Windows so Node.js 26 does not fail with `spawnSync pnpm.cmd EINVAL`.
- Allow required pnpm 11 dependency build scripts and remove nested generator lockfiles and workspace files.

### Changed

- Expand `sk-excute` with evidence-based diagnosis, optional primary-source research, and explicit verification levels.
- Update the README and landing page with the two-stage Next.js and Hono setup flow.

### Breaking changes

- None.

## [2.0.0] - 2026-07-17

### Added

- Add interactive radio prompts for selecting skill groups and optional Claude Code installation.
- Add `sk-release` and `sk-doc` to the sb-kit core skill group.

### Fixed

- Use one terminal prompt manager throughout installation so scripted input is not lost between prompts.

### Changed

- Package `.agents` as the single skill source and copy from it when Claude Code installation is selected.
- Update the README and landing page for the new installation flow.

### Breaking changes

- The installer no longer creates `.claude/skills` by default; select `Yes` to install for Claude Code.
- The package no longer includes a `.claude` source directory.
- Node.js 20.12.0 or later is now required.
