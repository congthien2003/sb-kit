# Changelog

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
