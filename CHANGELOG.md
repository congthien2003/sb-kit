# Changelog

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
