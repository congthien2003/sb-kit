# Repository Guidelines

## Project Structure & Module Organization

`cli.js` is the CommonJS entry point published as the `sb-kit` executable. It discovers packaged skills under `.agents/skills/` and installs them into a target project. Each skill keeps its instructions in `SKILL.md`; supporting rules, scripts, or agent metadata stay inside that skill directory.

`test-cli.js` contains the CLI integration checks. `index.html` is the project landing page, while `docs/superpowers/` stores implementation plans and design notes. Package metadata lives in `package.json`, `package-lock.json`, and `skills-lock.json`.

## Build, Test, and Development Commands

- `npm ci` installs the locked dependency set. Use `npm install` only when intentionally updating dependencies.
- `node cli.js --help` verifies the command entry point and usage text.
- `node cli.js install` runs the interactive installer against the current directory; use a disposable directory during manual testing.
- `node test-cli.js` runs the complete automated CLI check. There is no separate build step or npm test script.

Node.js 20.12.0 or newer is required.

## Coding Style & Naming Conventions

Use CommonJS (`require`) and Node built-ins before adding dependencies. Follow the existing two-space indentation, semicolons, double quotes, and small single-purpose functions. Use `camelCase` for variables and functions, `UPPER_SNAKE_CASE` for constants, and kebab-case for skill directories such as `.agents/skills/sk-release/`.

Keep changes minimal and preserve the installer’s non-overwriting behavior. Update `README.md` whenever commands, prompts, or the packaged skill catalog change.

## Testing Guidelines

Tests use Node’s built-in `assert` module and `spawnSync`; no test framework is configured. Add focused integration assertions to `test-cli.js` for new CLI behavior. Tests must clean up temporary directories in `finally` blocks. Run `node test-cli.js` before opening a pull request.

## Commit & Pull Request Guidelines

History favors short, imperative summaries such as `add skills` and `update cli & readme`. Releases use Conventional Commit style, for example `chore(release): v2.0.0`. Keep each commit limited to one logical change.

Pull requests should explain the user-visible behavior, list verification commands, and link related issues. Include terminal output for CLI changes and screenshots for `index.html` changes. Do not commit generated install targets, credentials, or unrelated edits.
