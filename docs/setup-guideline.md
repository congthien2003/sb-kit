# SaaS Setup Guideline

This guide bootstraps a SaaS using the current Content Writer Mint structure: Next.js dashboard (`client/`), Bun/Hono API (`server/`), PostgreSQL via Drizzle, and Cloudflare R2. Keep it a two-application modular monolith until a measured product need requires more infrastructure.

## 1. Prerequisites

- Node.js compatible with Next.js 16 for `client/`.
- Bun for `server/` and Bun tests.
- Docker Desktop or a reachable PostgreSQL instance.
- A Cloudflare account with an R2 bucket and an R2 API token when object uploads are enabled.

Install dependencies separately so each application keeps its own lockfile and runtime:

```powershell
npm install --prefix client
bun install --cwd server
```

## 2. Repository layout

```text
project/
  client/                            # Next.js App Router dashboard
  server/                            # Bun/Hono API
  docs/
  package.json                       # root convenience scripts only
  pnpm-workspace.yaml                # workspace declaration
```

Do not import database code into `client/`. The dashboard calls the Hono API through its same-origin Next.js proxy; server code owns database, R2, provider, and payment credentials.

## 3. Environment files

Create local, uncommitted environment files from the samples:

```powershell
Copy-Item server\.env.example server\.env
Copy-Item client\.env.local.example client\.env.local
```

Use placeholders only in every committed sample. Generate real secrets with a password manager or cryptographically secure generator; never copy working credentials into `.env.example`, source code, or `NEXT_PUBLIC_*` variables.

### Server: `server/.env`

```dotenv
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app_name
DASHBOARD_ORIGIN=http://localhost:3200

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=replace-with-a-unique-bootstrap-password
SESSION_SECRET=replace-with-a-long-random-secret
APP_API_KEY_SECRET=replace-with-a-long-random-secret

OPENROUTER_API_KEY=
OPENROUTER_DEFAULT_MODEL=
OPENAI_API_KEY=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
R2_PUBLIC_URL=https://assets.example.com
```

Only add third-party settings, such as PayOS, when the product needs that integration. Do not add unused variables or client-visible copies of server secrets.

### Client: `client/.env.local`

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
API_INTERNAL_BASE_URL=http://localhost:3001
```

`API_INTERNAL_BASE_URL` is used by the server-side Next proxy. `NEXT_PUBLIC_API_BASE_URL` is public and may be used only for intentionally public API calls. The current client `dev` script uses port `3200`; therefore set `DASHBOARD_ORIGIN=http://localhost:3200`, or change both settings deliberately to another single origin.

## 4. Start PostgreSQL and Drizzle

For local development, the current server baseline provides `server/docker-compose.yml`:

```powershell
docker compose -f server/docker-compose.yml up -d
```

Configure `DATABASE_URL` for the database, then apply committed migrations and bootstrap the first admin account:

```powershell
bun run --cwd server db:migrate
```

The project uses:

```text
server/src/db/schema.ts       # Drizzle schema source of truth
server/drizzle.config.ts      # Drizzle Kit configuration
server/drizzle/               # committed generated SQL migrations and metadata
server/src/db/migrate.ts      # applies migrations and bootstrap seed
```

When changing data shape:

```powershell
# 1. Change server/src/db/schema.ts and the matching module contract.
bun run --cwd server db:generate

# 2. Inspect generated SQL and drizzle/meta, then commit them with the schema.
# 3. Apply the migration to the target environment.
bun run --cwd server db:migrate
```

Use generated migrations for shared and production environments. `db:push` is useful only for disposable local experimentation, not a replacement for migration history.

## 5. Configure Cloudflare R2

1. Create one R2 bucket for the environment, for example `app-assets-dev`.
2. Create an R2 API token restricted to that bucket with object read/write permissions.
3. Attach a public custom domain if assets are public, then set it as `R2_PUBLIC_URL`.
4. Put the account ID, access key ID, secret access key, bucket, and public URL in `server/.env`.

Use the installed `@aws-sdk/client-s3` only. The server-side adapter configuration is:

```ts
new S3Client({
  region: 'auto',
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId, secretAccessKey },
  forcePathStyle: true,
})
```

For a new SaaS, keep the reusable adapter in `server/src/integrations/r2/r2.ts` until it needs more than one file:

```ts
type UploadObjectInput = {
  key: string
  body: Uint8Array
  contentType: string
}

type StoredObject = {
  key: string
  publicUrl: string
}

export async function uploadObject(input: UploadObjectInput): Promise<StoredObject>
export async function deleteObject(key: string): Promise<void>
```

Feature services create keys and validate MIME type/size before uploading. They persist the returned public URL (and key if later deletion is required), and call best-effort `deleteObject` if the later database write fails. Keep object credentials inside the adapter; do not expose presigned write flows unless browser-direct upload is an explicit product requirement.

## 6. Add a feature

### Frontend

```text
client/features/<feature>/
  components/
  hooks/use-<feature>.ts
  service.ts
  model.ts
```

1. Define the feature input/output DTOs and pure mapping in `model.ts`.
2. Add one endpoint-oriented function per API action in `service.ts`, using `dashboardApi`.
3. Put fetching, mutations, error mapping, and non-visual business state in `use-<feature>.ts`.
4. Render that hook from a feature component; the App Router page composes it and retains only UI-local state.
5. Use shared `components/ui` primitives before creating a shared component. Keep one-feature components local.

### Backend

```text
server/src/modules/<feature>/
  model.ts
  service.ts
  controller.ts
  routes.ts
  model.test.ts                 # when model parsing has non-trivial branches
  service.test.ts               # service behavior, ownership, transactions
```

1. Define validated request data, DTOs, and pure mapping in `model.ts`.
2. Implement business rules, ownership checks, Drizzle queries, and transactions in `service.ts`.
3. Keep `controller.ts` limited to Hono request/context parsing and response creation.
4. Apply authentication and role middleware in `routes.ts`; mount it from `server/src/index.ts` beneath `/v1`.
5. Add co-located Bun tests for observable branches. Mock remote providers/R2 and use an isolated database for persistence behavior.

Both navigation and route guards must preserve role boundaries: administrative management stays with `admin`; workspace/content actions stay with `user`. A hidden client nav item is not authorization.

## 7. Run locally

Start the API:

```powershell
bun run --cwd server dev
```

Start the dashboard in another terminal:

```powershell
npm run --prefix client dev
```

The Hono health check is available at `GET http://localhost:3001/v1/health`. Sign in through the dashboard, then verify authenticated browser requests travel through `/api/backend/*`, not directly to protected API endpoints.

## 8. Verification commands

Run these intentionally after changes; they are not automatic setup steps:

```powershell
# Server type checks and focused Bun tests
npm run typecheck:server
bun --cwd server test src/modules/<feature>/service.test.ts

# Client static checks
npm run lint:client
npm run build:client
```

The current server has co-located Bun tests but no dedicated `test` package script. Add a root or server test script only when the team needs a standard CI entry point; until then, Bun's focused command is enough.

## 9. Deployment baseline

- Deploy the Next.js dashboard and Bun/Hono API independently, with separate environment scopes.
- Run Drizzle migrations once per release before code that requires the new schema receives traffic.
- Use a distinct PostgreSQL database and R2 bucket per environment.
- Restrict R2 tokens to their environment bucket; rotate them without exposing values in client builds or logs.
- Configure the API CORS origin and client proxy target with the deployed dashboard/API URLs.
- Start with structured error responses and request logging already provided by the server; add a queue, worker, cache, or separate service only after a concrete workload requires it.
