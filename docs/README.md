# Base UI Solid documentation

TanStack Start + Solid 2.0, with upstream MDX, CSS, and MUI docs infrastructure.

- `pnpm --filter docs dev`: development server on port **3005**.
- `pnpm --filter docs build`: Start SSR prerender followed by a static copy to `docs/export`.
- `pnpm --filter docs build:clean`: remove build output and rebuild.
- `pnpm --filter docs serve`: serve the static export on port **3010**.
- `pnpm --filter docs typescript`: docs TypeScript checks.
- `pnpm --filter docs test`: all copied upstream docs plugin tests.
- `pnpm --filter docs redirects`: verify every legacy HTML/Markdown URL returns 301.
- `pnpm --filter docs smoke`: Playwright check against the running dev or static server.
- `pnpm --filter docs interactions`: interact with every demo on the dev server and on
  base-ui.com and diff the results (`--only <path>`, `--out <file>`). Differences can also come
  from base-ui.com running a different release than the tracked upstream commit (see `UPSTREAM.md`).

Port note: Documentation URLs use `/solid/`. Legacy `/react/*` URLs permanently redirect
to `/solid/*` in dev, SSR, and static hosting. Components, demos,
package imports, and runtime are Solid.

The docs server (`src/server.ts`) serves each page's `.md`, `llms.txt`, `llms-full.txt`,
`index.md` and `robots.txt` per request from upstream's generator (`scripts/generateLlmTxt`),
so development always serves current files. The static build prerenders the same URLs, and
TanStack Start writes `sitemap.xml`. Nothing is generated into `public`.

Netlify applies `public/_redirects`, and `pnpm serve` applies the shared redirect middleware with the same 301 migration.
Deploy the host redirect rules with the export.

`SITE_URL`, `REPO_URL`, and `REPO_BRANCH` live in [src/config.ts](./src/config.ts).
`SITE_URL` is still the placeholder `https://base-ui-solid.example` until the docs are deployed. Site navigation and
Markdown links are root relative. Canonical metadata and discovery files use `SITE_URL`.
Source links use `sourceUrl`, which maps `packages/react/src` to `packages/solid/src`.
Release PRs and the upstream changelog retain their upstream destinations.

Run `pnpm --filter docs links` after building to audit source/config/public/generated URLs
and crawl every exported HTML page. It prints the exact upstream allowlist and fails on
unapproved upstream URLs, broken internal destinations, or missing fragment targets.

`npm view` on 2026-10-04 verified `@tanstack/solid-start` and `@tanstack/solid-router`
**2.0.0-rc.8**, and their Solid 2.0 peer ranges. Both are pinned to that release.
Solid and Solid Web remain at the workspace's **2.0.0-rc.13**.

Port note: Start rc.8's server barrel imports a server-function API removed in Solid Web rc.13.
`src/server.ts` uses the same underlying Start SSR handler and Solid request-event scope directly.
This static site has no server functions. Remove the custom entry once Start's barrel supports
the current Solid Web API. No package sources or installed packages are patched.

See [PORTING-DOCS.md](./PORTING-DOCS.md) for the repeatable content port workflow.

## Deployment

The docs deploy to Cloudflare Pages, which builds the site from the repository on every push
(nothing built is committed). Project settings:

- Production branch: `main`
- Build command: `corepack enable && pnpm install --frozen-lockfile && pnpm docs:build`
- Build output directory: `docs/export`
- Environment variables: `SKIP_DEPENDENCY_INSTALL=1` (the build command installs with the pnpm
  version pinned in `packageManager`)

The Node version comes from `.node-version`. Cloudflare applies `public/_redirects` and
`public/_headers`, which the build copies into the export.
