# Local Agent Session Tracker

## Goal

Add an optional local tracker to `sb-kit` for organizing agent chat sessions, tasks, specifications, implementation plans, and supporting documents. Users can manage a day's work from a local web UI, while agents update the same data through CLI commands or MCP tools.

## Scope

- Keep tracker data local to each repository.
- Add tracker commands under `sb-kit track`.
- Provide a daily session board, full editing UI, CLI, and local MCP server.
- Store structured data in SQLite at `.sb-kit/tracker.sqlite`.
- Keep artifact content in Markdown files inside the repository.
- Generate a copyable prompt for handing one task to an agent.
- Preserve an activity history with the agent or user responsible for each change.

The existing skill installer remains unchanged unless a `track` command is used. Running `sb-kit track init` initializes tracker storage and adds `.sb-kit/` to the repository `.gitignore` when absent.

## Non-goals

- No cloud sync, authentication, collaboration, or cross-device access.
- No global dashboard aggregating multiple repositories in the first version.
- No transcript parsing or automatic extraction from agent conversations.
- No Kanban view, custom task statuses, WebSocket updates, or background daemon.
- No hard deletion of sessions or tracking history.
- No automatic commit, push, or pull request behavior.

## Domain Model

### Session

A session represents one agent chat or work session. A calendar day can contain many sessions. The daily board groups sessions by `createdAt` in the machine's local timezone.

Fields:

- `id`, `title`, and `summary`
- `createdBy` and `updatedBy`
- `createdAt`, `updatedAt`, and optional `archivedAt`

Session progress is derived from its tasks rather than stored separately.

### Task

A session contains many tasks. Tasks do not link to individual artifacts; the assigned agent inspects the session's available artifacts and chooses the relevant files.

Fields:

- `id`, `sessionId`, `title`, and `description`
- `acceptanceCriteria` as Markdown
- `status`: `todo`, `in_progress`, `blocked`, or `done`
- optional `blockedReason` and `completedAt`
- `position`, `createdBy`, `updatedBy`, `createdAt`, and `updatedAt`

Allowed transitions are:

```text
todo -> in_progress
in_progress -> blocked | done
blocked -> in_progress
done -> in_progress
```

Moving to `blocked` requires a reason. Returning to `in_progress` clears `blockedReason`; returning from `done` clears `completedAt`.

### Artifact

Artifacts belong to a session and reference files inside the repository. Supported types are `spec`, `implementation_plan`, and `doc`.

Fields:

- `id`, `sessionId`, `type`, `key`, and `title`
- `version`, `path`, `createdBy`, and `createdAt`

`key` identifies one logical document across revisions. Adding the same `(sessionId, key)` automatically assigns the next version. The API marks the highest version as `latest`; no mutable `isLatest` column is stored.

Artifact content is not copied into SQLite. Historical metadata remains available, but preserving old file content is the responsibility of versioned files or Git.

### Activity Log

Each mutation records:

- `entityType`, `entityId`, `action`, and `actor`
- optional `fromStatus`, `toStatus`, and small `detailsJson`
- `createdAt`

The entity update and its activity entry run in one transaction.

## Architecture

```text
CLI commands ----\
MCP stdio --------> Tracker Core -> SQLite
Local Web API ----/       |
                         Repository Markdown files
```

CLI, MCP, and HTTP handlers are thin adapters over one Tracker Core. CLI and MCP access SQLite directly, so `sb-kit track serve` is required only for the UI and REST API.

The server binds to `127.0.0.1`. The UI polls every two seconds for changes made by another process. SQLite uses WAL mode, transactions, and a busy timeout for concurrent local access.

All artifact paths are stored relative to the repository root. The core rejects missing files, absolute paths, and paths that resolve outside the repository.

## CLI Contract

Core commands:

```bash
sb-kit track init
sb-kit track serve

sb-kit track session create --title "Payment retry" --summary "..."
sb-kit track session list --date today
sb-kit track session show 12
sb-kit track session update 12 --summary "..."
sb-kit track session archive 12

sb-kit track task create --session 12 --title "Implement retry"
sb-kit track task list --session 12
sb-kit track task show 42
sb-kit track task update 42 --status in_progress --actor codex
sb-kit track task update 42 --status blocked --reason "Missing API contract"

sb-kit track artifact add --session 12 --type spec \
  --key payment-retry --path docs/specs/payment-retry.md
sb-kit track artifact list --session 12
sb-kit track artifact show 7

sb-kit track handoff 42
sb-kit track summary --date today
```

Every read command and mutation supports `--json`. Human output is concise; JSON output uses stable field names and structured errors. Invalid commands exit non-zero.

## MCP Contract

The local MCP server runs over `stdio` and exposes:

- `session_create`, `session_list`, `session_get`, `session_update`, `session_archive`
- `task_create`, `task_list`, `task_get`, `task_update`
- `artifact_add`, `artifact_list`, `artifact_get`
- `handoff_get`, `daily_summary`

Inputs use explicit schemas. Mutation tools accept an `actor`; when absent, the configured agent name is used, with `unknown` as the final fallback. Tool failures return MCP errors rather than partial success.

## Daily Board UI

The default page opens today's board and supports previous/next day navigation. It shows:

- session title, summary, creation time, and task progress
- task rows with status, last updater, edit action, and **Copy prompt**
- artifact counts grouped by type
- the latest artifact in each logical document series
- an artifact history view for older versions

Users can create, edit, reorder, and archive sessions or tasks, update task status, and register artifact paths. Archived sessions are hidden by default but remain queryable.

The first version uses static HTML, CSS, and browser JavaScript served by Node. It does not require React, Vite, or a frontend build step.

## Handoff Prompt

The prompt is generated from current data and is not persisted. Copying it does not mutate task status.

It includes:

- repository path
- session title and summary
- selected task title, description, and acceptance criteria
- the available artifact metadata
- instructions to read `AGENTS.md`
- instructions to inspect session artifacts and select relevant documents
- exact CLI or MCP calls for `in_progress`, `blocked`, and `done`
- the rule not to commit unless explicitly requested

An agent changes the task to `in_progress` only after accepting the handoff.

## Storage and Migration

SQLite schema changes use ordered, forward-only SQL migrations tracked in a migration table. Before applying a pending migration, the tracker creates one recoverable database backup. Tracker initialization and migrations must be idempotent.

The implementation targets Node.js 22.13 or newer. It uses `better-sqlite3`, the official MCP TypeScript SDK, and its schema-validation dependency. It does not add an ORM or HTTP framework.

## Error Handling

- Reject tracker commands outside an initialized repository.
- Reject invalid task transitions and blocked tasks without a reason.
- Reject artifact paths outside the repository or files that do not exist.
- Roll back the entity change if its activity entry fails.
- Return a clear busy-database error after the configured timeout.
- Return structured CLI JSON errors and MCP tool errors.
- Bind the UI server to loopback only.

## Verification

Use Node's built-in test runner and temporary repositories. Focused integration checks cover:

- local-date grouping of sessions
- task transitions, blocked reasons, reopen behavior, and activity entries
- artifact version increments and latest selection
- rejection of path traversal and missing files
- equivalent behavior through CLI and MCP adapters
- handoff prompt content and no mutation on copy
- HTTP API and daily board smoke behavior
- idempotent initialization and migration backup behavior

No browser automation framework is required for the first version.

## Future Extension

A later global dashboard can discover multiple repository databases and address records by `(repositoryId, localId)`. This does not require changing the per-repository schema in the first version.
