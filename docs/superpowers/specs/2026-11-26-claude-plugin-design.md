# Package sb-kit skills as a Claude Code plugin

## Intent

Offer the whole sb-kit skill set through Claude Code's official plugin channel
(`/plugin marketplace add congthien2003/sb-kit`, `/plugin install sb-kit@sb-kit`),
so the kit is installable the "official" way. The `npx sb-kit` CLI keeps working
unchanged. While here, fix the drifted `.claude/skills/` mirror.

## Goals

- The repository is both a valid Claude Code plugin and its own marketplace.
- The plugin ships all 23 skills in `.agents/skills/`, including the ones the CLI
  hides (`LOCAL_ONLY_SKILLS`) and the third-party ones.
- `.claude/skills/` matches `.agents/skills/` exactly, and a test fails if they drift again.

## Non-goals

- No change to CLI behavior, prompts, the catalog or the npm package contents.
- No conversion of the `sk-excute-*` roles into plugin agents (they ship as skills).
- No icon and no submission to the public plugin directory.

## Anti-goals

- A third copy of the skills.
- Anything that breaks `node test-cli.js` or the installer's non-overwriting behavior.

## Approaches

- **A. Plugin at repo root pointing at `.agents/skills/` (chosen).** One source of
  truth, no CLI changes. The skills path is non-default, so `plugin.json` declares it.
  `claude plugin validate` accepts this layout (checked in a scratch copy).
- B. Move skills to a root `skills/` folder: default layout, but changes paths in
  `cli.js`, `lib/`, `package.json` and tests for no user-visible gain.
- C. Generate a plugin-only copy with a script: creates a third copy. Rejected.

## Design

- `.claude-plugin/plugin.json`: `name: "sb-kit"`, `version` equal to `package.json`
  (3.6.0), description, author `congthien2003`, homepage/repository the GitHub URL,
  `license: "ISC"`, keywords, `"skills": "./.agents/skills"`.
- `.claude-plugin/marketplace.json`: marketplace `sb-kit`, owner `congthien2003`, one
  plugin entry `sb-kit` with `source: "./"`.
- `LICENSE`: ISC text, matching the `license` field already in `package.json`.
- Sync: `.agents/skills/` is the source (its `sk-landing-page` is newer). Copy it over
  `.claude/skills/` wholesale, including `.npmignore`, adding `sk-app-context`.
- Tests in `test-cli.js`: (1) `.claude/skills/` tree equals `.agents/skills/`;
  (2) `plugin.json` and `marketplace.json` parse, the plugin version equals
  `package.json`'s, and every skill directory under the declared path has a `SKILL.md`.
- README: a "Claude Code plugin" install section next to the CLI instructions.
- `package.json` `files` unchanged: the plugin installs from git, not npm.

## Verification

`node test-cli.js`, `node cli.js --help`, `claude plugin validate .`, all passing.

## Delivery

Commit on `sabo/fervent-clarke-n4wy8d`, open a PR, then have a fresh sub-agent review it.

## Calls I made (check these)

- Plugin and marketplace are both named `sb-kit`; the version tracks `package.json`.
- Mirror sync copies `.agents/skills/.npmignore` too, so the folders are byte-identical.
- No icon, so the validator will still show a non-blocking warning.
