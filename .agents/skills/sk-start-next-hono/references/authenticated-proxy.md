# Complete same-origin authenticated proxy

Read this reference whenever authentication and `/api/backend/*` are selected, for either Node.js or Workers Hono. It supplies a complete JSON proxy transport, not a login implementation. Adapt imports and an inspected existing response contract; do not replace user-owned code wholesale. Examples target Next.js App Router with asynchronous `cookies()` and route `params` (Next.js 15+); match the project's actual supported version before implementation.

## Contents

- [Completion boundary and deferred authentication](#completion-boundary-and-deferred-authentication)
- [Files and server-only configuration](#files-and-server-only-configuration)
- [Shared envelope and bounded body helpers](#shared-envelope-and-bounded-body-helpers)
- [Complete Route Handler](#complete-route-handler)
- [Browser transport and HEAD errors](#browser-transport-and-head-errors)
- [Hono authorization boundary](#hono-authorization-boundary)
- [Acceptance walkthrough](#acceptance-walkthrough)
- [Limits and official references](#limits-and-official-references)

## Completion boundary and deferred authentication

Implement the full path even when login/session verification is deliberately deferred:

```text
browser feature service -> dashboardApi -> /api/backend/<path>?<query>
  -> validate configuration and unsafe-request Origin
  -> read one configured HttpOnly cookie (missing -> 401)
  -> Authorization: Bearer <cookie value>
  -> Hono /v1/<path>?<query>
  -> verify identity/roles/ownership in Hono
  -> validate response media/envelope/status in Next
  -> browser receives JSON or explicit no-body response, never the session token
```

Transporting a token does not validate it. With a cookie present, the proxy must perform forwarding; Hono must return 401 for every protected path until a real verifier exists. With no cookie, the proxy returns 401 without contacting Hono. Do not generate a fake cookie issuer or accept an arbitrary bearer token as identity.

A constant `return 401`, an unused upstream URL, a transport that never calls `fetch`, or validation only in the browser is **not a completed proxy**. If the user explicitly requests disabling all forwarding, report that as a partial/disabled transport and obtain approval rather than claiming this reference is implemented. Keep denial at the actual Hono boundary, not an excuse to omit required transport code.

Login/logout/token-refresh endpoints need dedicated server-side token-to-cookie handling and Origin protection, not blind JSON passthrough. The example reserves `/v1/auth/*` for that future flow. Inspect the actual authentication endpoint namespace before adapting this exclusion; never proxy a token-returning endpoint through ordinary success-envelope forwarding.

## Files and server-only configuration

Create or adapt only the immediate transport consumers:

```text
client/
  .env.example
  lib/api/envelope.ts
  lib/api/body.ts
  lib/api/client.ts
  app/api/backend/[...path]/route.ts
server/src/
  index.ts                    # mount the auth guard, not just define it
  middleware/auth.ts
```

The small helpers below are used by both the browser transport and the Route Handler, so they must contain no Node.js, cookie, secret or server configuration imports. Do not add another shared package solely for this code. Keep these three settings server-only in the Next.js environment sample:

```dotenv
API_INTERNAL_BASE_URL=http://localhost:3001
APP_ORIGIN=http://localhost:3000
SESSION_COOKIE_NAME=<project-session-cookie>
```

`API_INTERNAL_BASE_URL` is the API **origin**, without `/v1`, path, query, fragment, credentials or trailing slash. `APP_ORIGIN` is the exact public Next.js origin, not a value derived from incoming Host/forwarded headers; align it with Hono's `DASHBOARD_ORIGIN`. Use HTTPS for both in production. Document any intentional private-network HTTP deployment as a separately reviewed exception, not a silent relaxation of this example. Cookie name and expiry/HttpOnly/Secure/SameSite policy belong to one reviewed server-only auth configuration.

## Shared envelope and bounded body helpers

`client/lib/api/envelope.ts` defines the baseline transport contract. Retain an existing structured error schema only by changing API, proxy and client validators together. Feature-specific data still needs a real decoder/schema; checking an envelope cannot prove `data` is a particular DTO.

```ts
export type ApiEnvelope =
  | { success: true; data: unknown }
  | { success: false; error: string };

export function isApiEnvelope(value: unknown, ok: boolean): value is ApiEnvelope {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const envelope = value as Record<string, unknown>;
  return ok
    ? envelope.success === true && Object.prototype.hasOwnProperty.call(envelope, "data")
    : envelope.success === false && typeof envelope.error === "string" && envelope.error.trim().length > 0;
}
```

`client/lib/api/body.ts` bounds buffering and prevents a failed discard from replacing the intended error. The example caps request bodies at 1 MiB and JSON responses at 2 MiB in the handler; confirm those values against the approved workload and hosting limits. Uploads/downloads/streaming require a separate contract rather than removing limits silently.

```ts
export class BodyTooLargeError extends Error {}

export async function discardBody(body: ReadableStream<Uint8Array> | null): Promise<void> {
  try {
    await body?.cancel();
  } catch {
    // Best-effort release must not replace the chosen error/status.
  }
}

export async function readBoundedBody(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<ArrayBuffer> {
  if (!body) return new ArrayBuffer(0);
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) throw new BodyTooLargeError();
      chunks.push(value);
    }
  } catch (error) {
    try { await reader.cancel(); } catch { /* Preserve the original read error. */ }
    throw error;
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result.buffer;
}
```

## Complete Route Handler

Adapt `client/app/api/backend/[...path]/route.ts` below. Keep the configuration check, method handling, Origin gate, path validation, cookie access, request forwarding and response validation in this order. No cookie/header/token is logged or exposed in an error. The backend URL is constructed from a trusted configured origin, never from caller-supplied URLs/Host headers.

```ts
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { isApiEnvelope } from "@/lib/api/envelope";
import { BodyTooLargeError, discardBody, readBoundedBody } from "@/lib/api/body";

export const runtime = "nodejs";

const METHODS = ["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"];
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const REQUEST_HEADERS = ["accept", "content-type", "if-match", "idempotency-key"];
const NO_STORE = { "Cache-Control": "no-store" };
const MAX_REQUEST_BYTES = 1024 * 1024;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const BACKEND_TIMEOUT_MS = 10_000;

type RouteContext = { params: Promise<{ path: string[] }> };

function failure(method: string, status: number, error: string): Response {
  return new Response(method === "HEAD" ? null : JSON.stringify({ success: false, error }), {
    status,
    headers: { ...NO_STORE, "Content-Type": "application/json; charset=utf-8" },
  });
}

function exactOrigin(value: string | undefined): string {
  if (!value) throw new Error("missing_origin");
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.origin !== value || url.username || url.password) {
    throw new Error("invalid_origin");
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") {
    throw new Error("insecure_production_origin");
  }
  return url.origin;
}

async function proxy(request: NextRequest, context: RouteContext): Promise<Response> {
  const method = request.method.toUpperCase();
  if (!METHODS.includes(method)) return failure(method, 405, "method_not_allowed");

  let appOrigin: string;
  let apiOrigin: string;
  let cookieName: string;
  try {
    appOrigin = exactOrigin(process.env.APP_ORIGIN);
    apiOrigin = exactOrigin(process.env.API_INTERNAL_BASE_URL);
    cookieName = process.env.SESSION_COOKIE_NAME?.trim() ?? "";
    if (!cookieName) throw new Error("missing_cookie_name");
  } catch {
    return failure(method, 503, "proxy_not_configured");
  }

  if (!SAFE_METHODS.has(method) && request.headers.get("origin") !== appOrigin) {
    return failure(method, 403, "origin_not_allowed");
  }
  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { ...NO_STORE, Allow: METHODS.join(", ") } });
  }

  let path: string[];
  try {
    path = (await context.params).path;
    if (!Array.isArray(path) || path.length === 0 || path.some((part) =>
      typeof part !== "string" || !part || part === "." || part === ".." || /[\u0000-\u001f\u007f/\\]/.test(part)
    )) throw new Error("invalid_path");
  } catch {
    return failure(method, 400, "invalid_path");
  }
  if (path[0].toLowerCase() === "auth") {
    return failure(method, 403, "dedicated_auth_route_required");
  }

  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !/^[\x21-\x7e]+$/.test(token)) return failure(method, 401, "authentication_required");

  const target = new URL(`/v1/${path.map(encodeURIComponent).join("/")}`, apiOrigin);
  target.search = request.nextUrl.search;
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  if (!SAFE_METHODS.has(method)) headers.set("Origin", appOrigin);

  let body: ArrayBuffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    try {
      body = await readBoundedBody(request.body, MAX_REQUEST_BYTES);
    } catch (error) {
      return failure(method, error instanceof BodyTooLargeError ? 413 : 400,
        error instanceof BodyTooLargeError ? "request_too_large" : "invalid_request_body");
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method, headers, body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
  } catch {
    return failure(method, 502, "backend_unavailable");
  }

  if (upstream.status < 200 || upstream.status > 599 || (upstream.status >= 300 && upstream.status < 400)) {
    await discardBody(upstream.body);
    return failure(method, 502, "invalid_backend_response");
  }
  if (method === "HEAD" || upstream.status === 204 || upstream.status === 205) {
    await discardBody(upstream.body);
    return new Response(null, { status: upstream.status, headers: NO_STORE });
  }

  const mediaType = upstream.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    await discardBody(upstream.body);
    return failure(method, 502, "invalid_backend_response");
  }

  let bytes: ArrayBuffer;
  try {
    bytes = await readBoundedBody(upstream.body, MAX_RESPONSE_BYTES);
  } catch (error) {
    return failure(method, 502, error instanceof BodyTooLargeError ? "invalid_backend_response" : "backend_unavailable");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return failure(method, 502, "invalid_backend_response");
  }
  if (!isApiEnvelope(payload, upstream.ok)) return failure(method, 502, "invalid_backend_response");

  return Response.json(payload, { status: upstream.status, headers: NO_STORE });
}

export const GET = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
```

Do not copy caller `Cookie`, `Authorization`, Host, forwarding headers, hop-by-hop headers or redirect locations into the upstream request/response. Content-Length is recomputed for the buffered body; query strings are preserved exactly. Valid error envelopes preserve their upstream 4xx/5xx status, including a Hono 401 from the deferred verifier. Status-only HEAD errors preserve HTTP failure even though their body is absent.

The catch-all receives decoded path segments. Reject dot segments, slash/backslash and control characters, then encode every segment when constructing the target. The configured base must be an origin so `/v1` is added exactly once. A root `/api/backend` request is outside this `[...path]` handler; add explicit handling only when the project needs it. Unsupported framework methods may receive Next.js's own 405 before this allowlist; if custom handling/no-store is required for those methods, design that separately.

## Browser transport and HEAD errors

`client/lib/api/client.ts` is for browser callers (relative same-origin URLs), not direct use from Server Components. Server-side consumers need an explicitly designed authenticated server transport. Dynamic path segments must be encoded by the feature service; reject arbitrary external URLs and traversal inputs rather than accepting a full user-supplied URL.

The decoder is required for contentful success data so a generic cast does not pretend to validate feature DTOs. `undefined` is an explicit possible result for a successful no-body response; consumers requiring data must handle/reject that case. No-body handling must **not** turn a non-2xx HEAD status into success.

```ts
import { isApiEnvelope } from "./envelope";
import { BodyTooLargeError, discardBody, readBoundedBody } from "./body";

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string) {
    super(code);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  decode: (data: unknown) => T,
  init: RequestInit = {},
): Promise<T | undefined> {
  const pathname = path.split(/[?#]/, 1)[0];
  if (!pathname || !/^(?!\/\/|[a-z][a-z0-9+.-]*:)/i.test(path)) throw new Error("invalid_api_path");
  for (const part of pathname.split("/")) {
    const decoded = decodeURIComponent(part);
    if (decoded === "." || decoded === ".." || /[\u0000-\u001f\u007f/\\]/.test(decoded)) {
      throw new Error("invalid_api_path");
    }
  }
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  let response: Response;
  try {
    response = await fetch(`/api/backend/${path.replace(/^\/+/, "")}`, {
      ...init, headers, credentials: "same-origin", cache: "no-store", redirect: "error",
    });
  } catch {
    throw new ApiError(0, "network_error");
  }

  const head = init.method?.toUpperCase() === "HEAD";
  if (head || response.status === 204 || response.status === 205) {
    await discardBody(response.body);
    if (!response.ok) throw new ApiError(response.status, "api_request_failed");
    return undefined;
  }
  const mediaType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (mediaType !== "application/json") {
    await discardBody(response.body);
    throw new ApiError(response.status, "invalid_backend_response");
  }
  let bytes: ArrayBuffer;
  try {
    bytes = await readBoundedBody(response.body, 2 * 1024 * 1024);
  } catch (error) {
    throw new ApiError(response.status, error instanceof BodyTooLargeError ? "invalid_backend_response" : "network_error");
  }
  let value: unknown;
  try {
    value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new ApiError(response.status, "invalid_backend_response");
  }
  if (!isApiEnvelope(value, response.ok)) throw new ApiError(response.status, "invalid_backend_response");
  if (!response.ok) throw new ApiError(response.status, value.success ? "invalid_backend_response" : value.error);
  if (!value.success) throw new ApiError(response.status, "invalid_backend_response");
  return decode(value.data);
}

export const dashboardApi = { request };
```

A feature service supplies a real schema parser/decoder, for example its already-selected validation library's `schema.parse`; do not create a sample business feature to demonstrate it. HEAD callers can pass an identity decoder because a body will never be decoded, but must still catch `ApiError` for 401/403/500. An explicit `head()` wrapper is optional only with a real consumer.

## Hono authorization boundary

Defining an unused middleware file is not protection. Mount the guard before protected routes and fallback; keep public health explicitly outside the protected branch. Deferred verification may use this composition with the existing API error helper:

```ts
import { Hono } from "hono";
import { failure, success } from "./lib/api";

const app = new Hono(); // Preserve the project's actual Bindings/Variables generic.
app.get("/v1/health", (c) => c.json(success({ status: "ok" })));

const protectedApi = new Hono();
protectedApi.use("*", (c) => c.json(failure("authentication_unavailable"), 401));
// Mount approved protected feature routes after this guard when they exist.
// No verifier exists yet: the guard deliberately never calls next().
app.route("/v1", protectedApi);
```

Retain existing secure headers, validated env, logging, error handlers and runtime entry point around this composition. Export the app for Workers or use the existing Node adapter as selected; this excerpt is not a replacement entry point. When a real verifier is approved, replace the deny guard with one that verifies credentials, establishes typed identity and invokes `next()` only on success. Service authorization/ownership remain required after identity verification.

No-cookie and arbitrary-cookie requests both remain unauthorized overall, but at different boundaries: Next rejects the first, Hono rejects the second. This lets the proxy exist and exercise its error pipeline without inventing an authenticated user or weakening backend security.

## Acceptance walkthrough

For each row, identify the actual branch/helper/import in source. If execution is forbidden, label runtime assertions **Not run**; do not launch tests, install, typegen, a server or an evaluation agent implicitly.

| Input/state | Expected result / location |
| --- | --- |
| Missing/invalid config | Next 503; no cookie lookup or upstream fetch |
| POST from missing/null/wrong Origin, spoofed Host | Next 403 before cookie/body/fetch; configured origin is unchanged |
| OPTIONS | Local no-body 204/Allow/no-store; no cookies/fetch |
| Valid Origin, no cookie | Next 401; fetch not called |
| Arbitrary non-empty cookie, verifier deferred | Next constructs the target and forwards; mounted Hono guard returns 401; proxy preserves the valid error envelope/status |
| `/api/backend/projects/a?limit=10` with a cookie | Only `/v1/projects/a?limit=10` at the configured origin; no duplicated `/v1` or arbitrary target |
| POST/PATCH body and allowed headers | Bounded body bytes and allowlisted headers preserved; never caller Cookie/Authorization/Host |
| Token-returning auth endpoint | Dedicated auth flow required, not generic success passthrough |
| Valid contentful 2xx/error 4xx/5xx | Proxy validates media/envelope/status, then forwards with no-store |
| HTML, broken JSON, invalid UTF-8, null/array/empty object, envelope/status mismatch, redirect | Stable 502 invalid_backend_response; no raw upstream content |
| Connection/timeout/body-read network failure | Stable 502 backend_unavailable; discard errors do not mask it |
| HEAD 200 vs HEAD 401/403/500 | Proxy preserves status with no body; client resolves only the successful HEAD and throws ApiError on failure |
| 204/205 | No body/JSON parsing; successful client result is explicitly undefined |
| Request/response exceeds example cap | Request 413 before upstream fetch, or stable invalid-response 502 for oversized upstream data |
| No forwarding/response handler exists; only return 401 | Incomplete implementation even though denial is safe; do not report proxy acceptance as passed |

## Limits and official references

The examples are source reference patterns, not a tested package or proof of production readiness. Match versions, APIs, existing contracts and approved workload limits before adapting them; do not create runnable example files or execute checks solely because these snippets exist. The fetch timeout covers the backend fetch and its response body, not the time spent accepting a slow browser upload; host/reverse-proxy request timeouts and body limits must cover that separately. A successful envelope decoder is not Hono authentication, feature DTO validation, rate limiting or a full dependency audit.

- [Next.js 15 Route Handler reference](https://nextjs.org/docs/15/app/api-reference/file-conventions/route)
- [Next.js 15 asynchronous cookies API](https://nextjs.org/docs/15/app/api-reference/functions/cookies)
- [Hono middleware composition](https://hono.dev/docs/guides/middleware)
- [Shared setup/security rules](setup-guideline.md#6-add-the-authenticated-proxy)
