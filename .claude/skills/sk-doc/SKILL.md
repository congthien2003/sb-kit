---
name: sk-doc
description: Generate a single accurate Markdown document from a codebase. Use when creating or updating a README, API reference, changelog, usage guide, installation guide, or developer documentation from source code, public APIs, types, configuration, scripts, tests, or examples.
---

# Documentation from code

Create useful documentation from evidence in the repository. Respect repository `AGENTS.md` instructions. Do not run a build step merely to generate documentation.

## Workflow

1. Identify the requested document and output path. Use `README.md`, `docs/api.md`, `CHANGELOG.md`, or a user-provided filename. Produce exactly one Markdown file per request.
2. Ask the user to choose `concise`, `detailed`, or `API-only` when no format is specified. Do not ask again when their request already makes the format clear.
3. Inspect documentation sources in this order: package manifests and lockfile metadata; public exports and types; config templates and environment examples; tests and runnable examples; then code comments. Treat these as evidence, not guarantees.
4. Extract only documented, public-facing behavior:
   - install prerequisites, package manager, and useful scripts;
   - public APIs, types, configuration keys, and environment variable names (never values or secrets);
   - usage flows, constraints, error behavior, and minimal examples;
   - for changelogs, the latest reachable tag and relevant Git history.
5. Write the document for the selected format:
   - `concise`: quick start, essential configuration, common usage, and a compact API outline;
   - `detailed`: prerequisites, installation, configuration, usage, API reference, examples, and troubleshooting when supported by evidence;
   - `API-only`: public API reference, types, inputs/outputs, errors, and examples; omit general onboarding.
6. Add an `## Assumptions / Not documented` section whenever source evidence is missing, ambiguous, or unverified. Do not invent commands, compatibility, API behavior, or release changes.
7. If the target file exists, do not overwrite it automatically. Present a proposed replacement or diff and request explicit confirmation before writing. If it does not exist and the user asked to create it, write the one requested Markdown file.

## Document structure

For a README or usage guide, include only applicable sections in this order:

```markdown
# <Project or guide title>

## Prerequisites
## Installation
## Configuration
## Usage
## API reference
## Examples
## Assumptions / Not documented
```

For API reference, document each public item with its signature or shape, parameters, return value, errors/edge cases when evidenced, and a minimal usage example. Exclude internal/private APIs.

For a changelog, group evidence-backed entries under `Added`, `Changed`, `Fixed`, and `Breaking changes`; omit empty groups and flag ambiguous commits for review.

## Output rules

- Write clear Markdown that can stand alone without a build step.
- Keep the requested scope; do not generate a documentation site or multiple files.
- Use real commands copied from package scripts or examples only. Mark a command as unverified when it has not been evidenced.
- Never expose secret values, tokens, private endpoints, or local paths from configuration.
- Do not claim a command, test, or example works unless evidence is available.

## Optional visual handoff

At the end of a completed Markdown documentation task, offer an optional visual companion. If the user requests it, invoke `$sk-visualizer` with the newly created document as the source material and create exactly one HTML file that highlights the document's main workflow, API relationships, or onboarding path.

Keep the visual separate from the Markdown deliverable: the documentation request still produces one Markdown file, and the opt-in visual handoff produces one HTML file. Do not create the HTML file unless the user asks for it.
