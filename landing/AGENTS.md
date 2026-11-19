# Repository Guidelines

## Project Structure

This directory contains the Next.js 16 App Router landing page for sb-kit. Localized routes live in `src/app/[lang]`; English and Vietnamese messages live in `messages/`. Reusable page sections are in `src/components/sections`, site identity and localized contact notices are in `src/config/site.ts`, and contact-form validation/configuration are in `src/lib`. Static assets belong in `public/`. Read `docs/` for spacing and motion conventions.

## Agent Session Workflow

At the start of a task, load repository guidance that matches the work before planning or editing. For frontend or animation work, read:

```powershell
Get-Content docs/spacing-system.md
Get-Content docs/animation-guideline.md
Get-Content .agents/skills/frontend-design/SKILL.md
Get-Content .agents/skills/vercel-react-best-practices/SKILL.md
```

When another repository skill applies, read its `.agents/skills/<skill-name>/SKILL.md` before using it. Preserve shared components and semantic design tokens; keep server components as the default and client boundaries small.

## Development Commands

Use Node.js 22+, npm 10+, and keep `package-lock.json` as the canonical lockfile.

```bash
npm ci
npm run dev
npm run lint
npm run format
npm run format:check
npm run typecheck
npm run check
npm run build
npm run verify
npm run start
```

`npm run build` requires the public canonical origin `NEXT_PUBLIC_SITE_URL`; it does not require a database. Do not add alternate lockfiles.

## Coding Style and Naming

Use TypeScript and React function components with two-space indentation. Prettier is canonical. Use PascalCase for component files/components, camelCase for utilities and hooks, and kebab-case for route segments. Keep user-facing text in both `messages/en.json` and `messages/vi.json`. Reuse CSS variables, Tailwind tokens, and existing primitives instead of duplicating styles.

## Typography and Motion

- The `Typography` `base` variant uses `text-base` (16px with the root font size). Keep caption, label, and small-description variants intentionally smaller; preserve the responsive headline scale.
- `Typography` supports `animated`, defaulting to `false`. Set it to `true` for a one-time fade on the first render. Do not add an implicit viewport trigger or client state.
- Global motion utilities are `.fade-in`, `.fade-out`, `.slide-left-to-right`, `.slide-right-to-left`, `.slide-top-to-bottom`, and `.slide-bottom-to-top`. Fade and slide animations run once; `fade-out` ends transparent. Keep these selectors and keyframes in plain global CSS outside Tailwind `@layer` blocks so unused utilities are not purged.
- `.marquee-left-to-right` and `.marquee-right-to-left` belong on a track containing two adjacent, identical, equal-width content groups. Put any spacing inside each group, not between the groups. Wrap the track in an `overflow-hidden` viewport and mark the duplicate group `aria-hidden="true"`. The class name describes actual travel direction.
- Honor `prefers-reduced-motion`: finite motion stops with content visible, and marquee motion stops. Motion must remain optional and never be required to understand or use content.

```tsx
<div className="overflow-hidden">
  <div className="marquee-right-to-left">
    <div className="flex gap-8 px-4">
      <span>Transfer</span>
      <span>Payments</span>
    </div>
    <div aria-hidden="true" className="flex gap-8 px-4">
      <span>Transfer</span>
      <span>Payments</span>
    </div>
  </div>
</div>
```

## Testing and Validation

No dedicated test framework is configured. Run `npm run check` for lint/typecheck and `npm run build` for production behavior. Exercise `/en` and `/vi`, responsive and keyboard states, reduced motion, and contact-form success/failure/disabled states in a browser. A successful build does not prove a live SMTP delivery or hosting-edge rate limit.

## Security and Configuration

Copy `.env.example` only when a local `.env` does not already exist. Never commit `.env` or expose server-only SMTP credentials with the `NEXT_PUBLIC_` prefix. Production contact submission requires localized operator-supplied privacy notices, server-side SMTP configuration, and upstream rate limiting; keep the form disabled until all are in place. Configure the real canonical site origin before production builds. Confirm changes to the shared GitLab DevOps pipeline with its owner.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
