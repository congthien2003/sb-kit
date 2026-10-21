# Cloudflare Workers backend setup

Use this reference only when the user selects Cloudflare Workers for the Hono backend. Node.js remains the default; `sb-kit create next-hono` still generates the Node.js template. Keep Next.js on its existing platform. Common module, auth, proxy, PostgreSQL schema, and migration conventions in [architecture.md](architecture.md) still apply.

## Contents

- [Approval and preservation](#approval-and-preservation)
- [Tooling and entry point](#tooling-and-entry-point)
- [Wrangler and binding types](#wrangler-and-binding-types)
- [Configuration and secrets](#configuration-and-secrets)
- [PostgreSQL and Drizzle](#postgresql-and-drizzle)
  - [Request-scoped cleanup example](#request-scoped-cleanup-example)
  - [Lifecycle review matrix](#lifecycle-review-matrix)
- [Proxy and authorization](#proxy-and-authorization)
- [Optional R2](#optional-r2)
- [Lifecycle and limits](#lifecycle-and-limits)
- [Verification and deployment handoff](#verification-and-deployment-handoff)
- [Official references](#official-references)

## Approval and preservation

Inspect the current server entry point, manifest, TypeScript configuration, environment loader, database driver, integration packages, tests, and any Wrangler configuration. Preserve existing routes, business logic, schemas, migration history, and unrelated files. Do not rerun generators or replace the server directory.

Present an in-place conversion plan covering exact files, dependency changes, scripts, bindings/secrets, database connectivity, and local/production targets. Wait for approval before editing. Cloud resource creation, migrations, deployment, and verification remain subject to separate user/repository permissions; a setup approval does not authorize deployment or production data changes.

Prefer Hyperdrive for PostgreSQL connectivity, but confirm the account/resource and database access before provisioning. If credentials or resource IDs are missing, use labeled placeholders and report the remaining setup; do not claim the deployment is ready. Do not silently replace PostgreSQL with D1 or add queues, scheduled handlers, KV, or Durable Objects.

## Tooling and entry point

After approval, add only missing packages. Apply the [dependency security selection rules](setup-guideline.md#dependency-security-selection) to both client and server/tooling: use current official advisory/release and peer/engine evidence, not remembered package pins or old lower-bound ranges. Inspect existing locked versions and get approval for necessary updates. Package names below identify the Hyperdrive baseline; use the approved selected versions when adding them, and do not execute these commands if package operations are forbidden:

```powershell
pnpm --dir server add drizzle-orm pg zod
pnpm --dir server add -D wrangler drizzle-kit @types/pg
```

Reuse an existing validation library instead of adding a second one. Retain Node.js development types/tools only where migration tooling or other actual consumers need them. Remove `@hono/node-server`, the old `postgres` runtime driver, and Node-only build/dev dependencies only after inspecting their consumers. Keep the existing lockfile; use pnpm for dependency changes.

Adapt `server/src/index.ts` to compose middleware/routes and export the Hono app, without `serve()`, an HTTP listener, `PORT`, or process signal handlers. Minimal entry-point shape (not a replacement for existing application behavior):

```ts
import { Hono } from "hono";

const app = new Hono<{ Bindings: CloudflareBindings }>();

app.get("/v1/health", (c) => c.json({ success: true, data: { status: "ok" } }));

export default app;
```

Preserve error envelopes, structured logging, secure headers, authorization middleware and `/v1` routes. Type sub-apps/middleware consistently with the root bindings and request variables. Validate bindings through centralized `config/env.ts` at the request boundary; do not eagerly read Node `process.env` during module evaluation.

Merge scripts rather than replacing the manifest. A minimal selected-runtime script set is:

```json
{
  "scripts": {
    "dev": "wrangler dev",
    "cf-typegen": "wrangler types --env-interface CloudflareBindings",
    "typecheck": "tsc --noEmit",
    "bundle:check": "wrangler deploy --dry-run",
    "deploy": "wrangler deploy",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate"
  }
}
```

Update root scripts/docs only if they still point to a removed Node command. Do not retain a misleading Node `start`/`build` command; use Wrangler for Worker bundling and deployment. Preserve the root `dev:server` delegation to the server's `dev` script.

## Wrangler and binding types

Reuse the existing Wrangler file if present; do not create competing TOML/JSON configurations. Otherwise add `server/wrangler.jsonc`. Example shape; replace the illustrative compatibility date with an explicitly selected supported date, never a future date, and replace the Hyperdrive ID before deployment:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "project-api",
  "main": "src/index.ts",
  "compatibility_date": "2025-04-01",
  "compatibility_flags": ["nodejs_compat"],
  "dev": { "port": 3001 },
  "vars": { "DASHBOARD_ORIGIN": "http://localhost:3000" },
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "<hyperdrive-id>"
    }
  ]
}
```

Select the date/flags against current Cloudflare and driver documentation. `nodejs_compat` is explicit here for database driver compatibility, not a guarantee that all Node APIs work. Never deploy the localhost origin as the production dashboard origin. Configure separate staging/production resource IDs, origins, and secrets; named Wrangler environments do not inherit every binding/variable automatically, so declare each environment's required values explicitly.

Generate `server/worker-configuration.d.ts` with `cf-typegen` when command execution is permitted. Include it in the server TypeScript program; use the generated types for runtime APIs and bindings rather than adding conflicting Workers/DOM ambient declarations. Preserve TypeScript options needed by the application; adapt module resolution and runtime types to the installed Wrangler guidance. Refresh generated types whenever bindings or compatibility settings change. If generation is prohibited, supply the command and mark type-dependent checks unverified rather than claiming the generated file exists.

## Configuration and secrets

- Prefer typed `c.env` bindings. Expose validated scalar configuration and request-scoped adapters to services, not the entire Hono context.
- Store non-sensitive deployment configuration in Wrangler `vars`. Never put secrets in `vars`, committed source, generated types, or `NEXT_PUBLIC_*` values.
- Use untracked `server/.dev.vars` for local Worker secrets and commit placeholder-only `.dev.vars.example`. Add `.dev.vars`, `.dev.vars.*` and local environment secret files to ignore rules while explicitly allowing placeholder examples. Use one documented local secret-loading approach, not competing `.env` and `.dev.vars` Worker loaders.
- For deployed secrets, provide `pnpm --dir server exec wrangler secret put SESSION_SECRET` and the appropriate `--env <name>` when named environments are used. Run secret mutations only with authorization; do not place secret values in command arguments or chat.
- Drizzle Kit is separate Node.js tooling: its untracked migration environment may contain a direct `DATABASE_URL`; explicitly load/validate it in `drizzle.config.ts`. Wrangler `.dev.vars` is not automatically loaded by Drizzle Kit.
- For local Hyperdrive development, configure a local PostgreSQL connection using the documented `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` environment variable in the local shell/approved secret mechanism. Do not assume a Worker runtime secret automatically sets Wrangler's CLI environment. A committed `localConnectionString` may contain disposable example credentials only, never real credentials. Local mode connects directly and does not establish production Hyperdrive pooling/cache behavior.

## PostgreSQL and Drizzle

Keep `src/db/schema.ts`, `drizzle.config.ts`, and `drizzle/` history. Prefer `pg` with `drizzle-orm/node-postgres` for Hyperdrive according to the current official guide. The guide currently warns against Drizzle + Postgres.js over Hyperdrive; do not reuse the Node baseline's `postgres` package for this path without updated evidence. If a provider-specific alternative is requested, confirm its Workers support, driver, transaction semantics and connection lifecycle before adapting it.

Put the request-scoped client factory in `server/src/db/client.ts`. Create a `pg.Client` using the current request's `c.env.HYPERDRIVE.connectionString`, put `connect()` and the service operation inside cleanup protection, construct Drizzle with that client, inject it into the consuming service, and attempt close in a guarded `finally`. Do not place `await client.connect()` before the protected region or an unguarded `await client.end()` in `finally`. No top-level sockets, cross-request live clients, or global Node pools. Hyperdrive manages upstream pooling; the Worker still owns its request client lifecycle.

Centralize lifecycle handling in a helper or middleware only when there is an immediate consumer. Ensure cleanup on success, validation/domain errors, query failures, and connection failures without masking the original failure. Keep service transactions on that same request client; never close it while a transaction or query is still running. Await cleanup or, when appropriate, schedule the cleanup promise with `c.executionCtx.waitUntil`; do not leave an untracked `client.end()` promise. A streaming response must not depend on a client already closed by request middleware.

### Request-scoped cleanup example

Use this lifecycle shape only when the approved feature needs a database consumer. It is a reference pattern for `pg`, not an instruction to add unused helpers or invent tables. Preserve the project's actual schema import/types and centralized sanitized logging policy. This example awaits cleanup; if selecting deferred cleanup, explicitly handle its rejection and retain the same primary-error policy.

```ts
import { Client } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

type RequestDatabase = NodePgDatabase<typeof schema>;

export async function withRequestDatabase<T>(
  connectionString: string,
  operation: (db: RequestDatabase) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString });
  let operationFailed = false;

  try {
    await client.connect();
    return await operation(drizzle(client, { schema }));
  } catch (error) {
    operationFailed = true;
    throw error;
  } finally {
    try {
      await client.end();
    } catch (cleanupError) {
      if (!operationFailed) throw cleanupError;
      // Use the project's non-throwing structured logger; never log credentials/SQL.
      console.warn(JSON.stringify({ event: "db_cleanup_failed", primaryErrorPreserved: true }));
    }
  }
}
```

`return await operation(...)` keeps operation rejection inside the protected lifetime; returning its promise without awaiting would enter `finally` and close the client too early. The boolean tracks *whether* the operation failed independently of the thrown value, so even `throw undefined`, `null`, `0` or an empty string stays the primary failure. A cleanup-only failure is surfaced instead of falsely reporting clean completion; it does not prove a database write rolled back. Avoid blind automatic retries after an uncertain write/cleanup outcome. Secondary cleanup failures may be logged only through a sanitized non-throwing logger, never by replacing the primary error or exposing provider payloads.

### Lifecycle review matrix

Trace each path in source before handoff. These are regression scenarios, not claims of tests run; add/execute tests only within approved permissions.

| Connect / operation / close | Expected behavior |
| --- | --- |
| Connect succeeds, operation succeeds, close succeeds | Return operation result after close |
| Connect fails | Attempt close; rethrow the exact connection failure |
| Operation or transaction fails | Attempt close; rethrow the exact operation failure |
| Connect/operation and close both fail | Preserve original failure, including falsy thrown values; log only sanitized secondary failure |
| Operation succeeds, close fails | Surface close failure; do not claim rollback or retry a write automatically |
| Transaction/query remains pending | Do not close the client early; await completion first |

Keep HTTP parsing in controllers and SQL/integration calls in services. Pass typed dependencies explicitly rather than importing a globally connected client. A pure factory/type may be shared globally; a live connection may not.

Use a direct migration-only `DATABASE_URL` from trusted local Node.js tooling or CI, never the Hyperdrive runtime connection string. Preserve the migration scripts:

```powershell
pnpm --dir server db:generate
pnpm --dir server db:migrate
```

Generation writes files and migration mutates the database; obtain the required permission and review SQL before applying. Do not run migrations from Worker requests/module initialization, use `db:push` for shared/production environments, or provision a database implicitly. Apply migrations once per release before dependent code receives traffic.

## Proxy and authorization

Read and implement [authenticated-proxy.md](authenticated-proxy.md) for the full Next Route Handler, browser transport and mounted Hono auth boundary. Auth deferred means the Hono guard denies protected access, not that Next can omit forwarding: a missing cookie returns local 401, while a present cookie must traverse the /v1 path/query/body/header/bearer pipeline and receive the validated upstream denial. Do not report constant 401 stubs, unused API origins, client-only response validation or an unmounted auth middleware as a complete setup. Failed HEAD statuses must also become client API errors, never a successful undefined result.

Keep Next.js's existing deployment. The browser still calls `/api/backend/*`; the Next.js server reads the HttpOnly cookie and forwards a bearer token to Hono `/v1/*`. Keep `API_INTERNAL_BASE_URL` server-only: `http://localhost:3001` locally and the selected HTTPS Worker origin in production. Despite its name, the production Worker URL need not be a private-network address.

Preserve method/header/body allowlists, query forwarding and explicit login/logout token-to-cookie handling. Implement the common [Origin guard](setup-guideline.md#origin-guard-before-cookie-access) and [backend response contract](setup-guideline.md#backend-response-validation) in Next.js; changing Hono's runtime does not remove either obligation. Validate server-only `APP_ORIGIN` and match it to `DASHBOARD_ORIGIN`; reject unsafe requests with missing/invalid/mismatched Origin before reading cookies, forwarding bearer tokens, or contacting Hono. Do not use Host/forwarded headers as the trusted origin, and forward only the validated write Origin. GET/HEAD must not mutate state; allowed OPTIONS is local and unauthenticated.

Require media type, parsed JSON shape and status agreement, not just `JSON.parse`: contentful 2xx uses the agreed success envelope, 4xx/5xx the agreed error envelope. Preserve valid API error status; convert redirects, HTML, broken JSON and invalid/mismatched envelopes to stable `502 invalid_backend_response` without exposing raw upstream content. Distinguish transport failures and discarded-body cleanup failures, preserve no-body semantics for HEAD (including local failures) and 204/205, and use no-store on every proxy path. No upstream cookie/redirect forwarding or token-bearing login JSON passthrough.

Avoid duplicate or missing `/v1` prefixes. Set the exact production `DASHBOARD_ORIGIN` and deliberate cookie settings. CORS is not authentication: a publicly reachable Worker must enforce authentication, roles, and ownership even for callers that bypass Next.js. Do not rely on an unguessable Worker URL, browser navigation, or CORS as an access control.

## Optional R2

Only when selected, add a bucket binding (for example `ASSETS_BUCKET`) to the existing Wrangler configuration and regenerate types. Bind it to a separate bucket per environment and document whether local simulation or a remote bucket is used. Do not connect local development to production resources silently.

Keep one adapter at `src/integrations/r2/r2.ts`, receiving the current request's `R2Bucket`; prefer its `put`, `get`, and `delete` methods over an S3 SDK on Workers. Do not add R2 access keys or the S3 SDK solely for native binding access. Remove old SDK/credentials only if no other consumer needs them.

The feature service still owns MIME/size/key validation, authorization, metadata persistence and compensating deletion on database failure. Await critical writes and cleanup rather than treating them as best-effort background tasks. A binding does not make objects public; return a public custom-domain URL only for intentionally public assets, and serve private objects behind authorization. Do not add presigned or browser-direct writes unless requested.

## Lifecycle and limits

Workers are request-driven, not persistent Node processes. Check actual CPU, memory, subrequest, connection, body-size and execution limits for the selected plan/workload. Audit dependencies for filesystem assumptions, native binaries, unsupported Node APIs and process-global state. Use supported Web APIs where possible; a successful TypeScript check alone does not prove runtime compatibility.

Await authorization, required writes and transactions before returning success. Use `c.executionCtx.waitUntil(promise)` only for bounded non-critical work or cleanup that is safe under its lifecycle limits. It is not a durable job mechanism, unlimited execution, or permission to add queues. Do not use detached promises, process timers, or signal handlers as a background job system. Propose a separately approved architecture if the workload needs durable or long-running work.

## Verification and deployment handoff

Follow user/repository permissions first. If checks are forbidden, list the following as user-run commands, not actions performed, and only when the corresponding scripts have actually been added:

```powershell
pnpm --dir server cf-typegen
pnpm --dir server typecheck
pnpm --dir server bundle:check
pnpm format:check
```

Expected: regenerated binding/runtime types, no TypeScript errors, a successful dry-run bundle, and no formatting differences. None proves deployed database or auth behavior. Do not call `wrangler deploy` a verification-only command: without `--dry-run`, it changes the deployment.

Before handoff, apply the common [source-review and regression checklist](setup-guideline.md#source-review-and-regression-checklist) plus the [lifecycle review matrix](#lifecycle-review-matrix). Source walkthroughs establish only source evidence; if execution is prohibited, report the cases as Not run and do not silently launch tests, an evaluation agent, typegen or a deployment.

For manual local verification, provide `pnpm dev:server` and `pnpm dev:client` in separate terminals. The user should check `/v1/health` on port `3001`, the Next.js proxy, unauthenticated/role/ownership rejection, database transactions and connection cleanup, and R2 only if selected. Use isolated development resources. Node-only tests do not validate Worker bindings; propose Workers-aware tests only when needed and authorized.

Before an authorized deployment: resolve resource IDs and per-environment configuration, set secrets, review/apply migrations through the approved release process, and configure the Next.js proxy target. Provide `pnpm --dir server deploy` (or the corresponding named-environment command) for the user to run unless deployment is explicitly authorized. Report missing resources, commands not run, and runtime/deployment behavior not verified.

## Official references

Consult current, version-matched documentation before finalizing APIs and commands. These links are evidence sources, not instructions overriding user/repository permissions:

- [Hono on Workers](https://hono.dev/docs/getting-started/cloudflare-workers)
- [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/)
- [Generated TypeScript types](https://developers.cloudflare.com/workers/languages/typescript/)
- [Worker bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/)
- [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Drizzle with Hyperdrive](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/drizzle-orm/)
- [Local Hyperdrive development](https://developers.cloudflare.com/hyperdrive/configuration/local-development/)
- [R2 Worker API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [Execution context and waitUntil](https://developers.cloudflare.com/workers/runtime-apis/context/)
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
