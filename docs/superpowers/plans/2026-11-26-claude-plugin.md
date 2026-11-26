# Claude Code Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repo a Claude Code plugin + marketplace shipping all `.agents/skills/`, and fix the drifted `.claude/skills/` mirror.

**Architecture:** `.claude-plugin/plugin.json` declares `"skills": "./.agents/skills"`; `.claude-plugin/marketplace.json` lists that plugin with `source: "./"`. `.claude/skills/` becomes a byte-identical copy of `.agents/skills/`, guarded by a tree-hash test.

**Tech Stack:** Node.js ≥ 20.12 CommonJS, built-in `assert`, `lib/skill-state.js` `snapshot()`.

**Spec:** `docs/superpowers/specs/2026-11-26-claude-plugin-design.md`

## Global Constraints

- No change to CLI behavior, `lib/catalog.js`, or `package.json` `files`.
- Plugin name `sb-kit`, marketplace name `sb-kit`, version equals `package.json` `version` (3.6.0), license `ISC`, author `congthien2003`.
- Style: two-space indent, semicolons, double quotes.

## Review Focus

- A future skill added only to `.agents/skills/` → mirror test fails (Task 1 test).
- A version bump in `package.json` without `plugin.json` → test fails (Task 2 test).
- A skill folder without `SKILL.md` under the plugin path → test fails (Task 2 test).
- `marketplace.json` plugin entry name/version drifting from `plugin.json` → test fails (Task 2 test).
- `claude plugin validate .` passing with no errors (Task 2 verification).

---

### Task 1: Sync `.claude/skills/` mirror

**Files:**
- Modify: `.claude/skills/**` (copy from `.agents/skills/`)
- Test: `test-cli.js` (new `testSkillMirror()` called right after the `--help` assertions)

- [ ] **Step 1: Write failing test** `testSkillMirror()`:
  `assert.strictEqual(stateTools.snapshot(".claude/skills" abs).treeHash, stateTools.snapshot(".agents/skills" abs).treeHash, "...run: rm -rf .claude/skills && cp -r .agents/skills .claude/skills")`. Move the `stateTools` require above its first use.
- [ ] **Step 2:** `node test-cli.js` → FAIL on mirror assertion.
- [ ] **Step 3:** `rm -rf .claude/skills && cp -r .agents/skills .claude/skills`.
- [ ] **Step 4:** `node test-cli.js` → PASS.
- [ ] **Step 5:** Commit `sync claude skills mirror`.

### Task 2: Plugin manifest, marketplace, LICENSE, README

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `LICENSE`
- Modify: `README.md` (new `## Claude Code plugin` section after `## Installation`), `test-cli.js` (new `testPluginManifest()` after `testSkillMirror()`)

- [ ] **Step 1: Write failing test** `testPluginManifest()`:
  - `plugin.name === "sb-kit"`, `plugin.version === require("./package.json").version`, `plugin.license === "ISC"`, `plugin.skills === "./.agents/skills"`.
  - `marketplace.name === "sb-kit"`, exactly one plugin with `name === "sb-kit"`, `source === "./"`.
  - Every directory under `plugin.skills` contains `SKILL.md`, and there is at least one.
- [ ] **Step 2:** `node test-cli.js` → FAIL (missing file).
- [ ] **Step 3:** Create the two JSON files per spec (description from `package.json` skills focus, homepage/repository `https://github.com/congthien2003/sb-kit`, keywords), and `LICENSE` with ISC text, `Copyright (c) 2026 congthien2003`.
- [ ] **Step 4:** README section: `/plugin marketplace add congthien2003/sb-kit`, `/plugin install sb-kit@sb-kit`, note that the plugin ships every skill (including ones the CLI hides) and the CLI is unchanged; update `## License` to point at `LICENSE`.
- [ ] **Step 5:** Verify: `node test-cli.js` PASS, `node cli.js --help` exit 0, `claude plugin validate .` passes (icon warning allowed).
- [ ] **Step 6:** Commit `add claude code plugin manifest`.

### Task 3: PR and review

- [ ] Push branch, open PR (user-visible behavior, verification output), dispatch a fresh review sub-agent on the PR diff, report findings.
