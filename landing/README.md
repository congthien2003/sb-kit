# sb-kit landing

The bilingual Next.js site for sb-kit, the CLI for installing agent skills and scaffolding Next.js + Hono projects. See the root README for CLI usage. The landing has an optional contact form.

## Prerequisites

- Node.js 22 or newer; `.nvmrc` pins the major version.
- npm 10 or newer; `package-lock.json` is the canonical lockfile.

## Installation and local development

```bash
npm ci
npm run dev
```

Open `http://localhost:3200/en` or `http://localhost:3200/vi`. The locale prefix is always present.

The site follows the device color theme until a visitor sets a preference. The hero displays three skill cartridges with links to their demos. Three.js and GSAP load in the browser to animate insertion, hover, and selection. A static dock with the same links is shown with reduced motion or when WebGL is unavailable.

Set `NEXT_PUBLIC_SITE_URL` before running a production build. For a fresh clone, `.env.example` provides the non-secret local value `http://localhost:3000`; create `.env` from it only when `.env` does not already exist. Preserve existing local configuration and never commit `.env`.

## Commands

| Command                | Purpose                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`          | Start the Next.js development server.                                               |
| `npm run lint`         | Run ESLint.                                                                         |
| `npm run format`       | Format supported repository files with Prettier.                                    |
| `npm run format:check` | Check formatting without writing files.                                             |
| `npm run typecheck`    | Run TypeScript without emitting files.                                              |
| `npm run check`        | Run lint and typecheck.                                                             |
| `npm run build`        | Build the production application; requires `NEXT_PUBLIC_SITE_URL`, but no database. |
| `npm run verify`       | Run `check` and the production build.                                               |
| `npm run start`        | Serve a production build.                                                           |

There is no dedicated automated test framework. Review both localized routes at desktop and mobile widths. Check the install command button, keyboard navigation, theme persistence after reload, and the static hero with reduced motion enabled or WebGL disabled. If the contact form is configured, exercise its submission states.

## Configuration

### Site identity and canonical URL

Edit `src/config/site.ts` to set the site name, optional social links, and the localized contact privacy notices. `NEXT_PUBLIC_SITE_URL` is a public origin, not a secret; production builds must use the site's real canonical origin. Sitemap, robots, canonical metadata, and Open Graph URLs use the same origin.

### Contact form

The form is disabled by default. To enable it:

1. Add accurate privacy/data-flow notices for both `en` and `vi` to `siteConfig.contactPrivacyNotice` in `src/config/site.ts`.
2. Configure the server-only SMTP variables in the deployment environment: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `MAIL_RECEIVER`.
3. Configure request rate limiting at the hosting edge or reverse proxy. The application does not use process-local rate limiting.
4. Set `CONTACT_UPSTREAM_RATE_LIMIT_CONFIRMED=true` only after upstream rate limiting is active, then set `CONTACT_FORM_ENABLED=true`.

The API validates the request on the server, rejects the hidden honeypot field, bounds accepted fields and request size, and returns success only after SMTP delivery completes. Disabled or misconfigured submissions return a client-safe `503`; invalid submissions return `400`; delivery failures return `502`. Provider details and submitted personal data are not returned to the browser. If any required privacy notice or configuration is missing, the form remains disabled.

## Architecture

```text
src/
├── app/[lang]/             Localized landing route, layout, sitemap and robots
├── app/api/contact/        Optional SMTP-backed lead form endpoint
├── components/sections/    Hero, feature, approach and contact sections
├── config/site.ts          Site identity and localized privacy notice
├── i18n/                   English/Vietnamese routing and message loading
└── lib/                    Contact validation and availability configuration

messages/
├── en.json
└── vi.json

public/                     Local fonts and starter favicon
```

The `/en` and `/vi` home routes are statically generated at build time; `/api/contact` remains server-rendered and gated by its configuration.

The landing requires no database. Images are local by default; add a specific remote host to Next image configuration only when the project has a justified need. Motion defaults to CSS and respects `prefers-reduced-motion`. Spacing and motion conventions live in `docs/`.

## Deployment

### Node

Configure the real `NEXT_PUBLIC_SITE_URL` and, if using the contact form, its server-only SMTP settings and production safety gates. Then run:

```bash
npm ci
npm run build
npm run start
```

### Docker

The Docker image uses Next standalone output, Node 22 Alpine, and a non-root runtime user. Pass the canonical origin at build time:

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://your-domain.example -t sb-kit-landing .
docker run --rm -p 3000:3000 sb-kit-landing
```

Do not use a local or example origin for a production image.

### GitLab CI

The repository still contains a shared GitLab DevOps include. The include must be replaced or confirmed by its owner before this site is treated as deployment-ready; no shared pipeline contract is assumed here. `npm run verify` is the repository-local quality gate.

## Assumptions / Not documented

- The hosting platform and its rate-limiting configuration are project-specific. Keep contact submissions disabled until the platform owner confirms the upstream limit.
- The site owner must provide accurate privacy/data-flow notices and SMTP credentials before enabling contact submissions.
- The approved generic GitLab pipeline include path is not available in this repository; confirm it with the DevOps owner before changing `.gitlab-ci.yml`.
