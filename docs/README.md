# Base UI Solid documentation

TanStack Start + Solid 2.0, with upstream MDX, CSS, and MUI docs infrastructure.

- `pnpm --filter docs dev`: development server on port **3005**.
- `pnpm --filter docs build`: Start SSR prerender followed by a static copy to `docs/export`.
- `pnpm --filter docs build:clean`: remove build output and rebuild.
- `pnpm --filter docs serve`: serve the static export on port **3010**.
- `pnpm --filter docs typescript`: docs TypeScript checks.
- `pnpm --filter docs test`: all copied upstream docs plugin tests.
- `pnpm --filter docs smoke`: Playwright check against the running dev or static server.

Port note: URL paths intentionally keep `/react/` to preserve upstream links. The components,
demos, package imports, and runtime are Solid. Only Collapsible is ported in this infrastructure
phase; navigation and search list only ported pages. Links to other upstream pages remain in the
content for subsequent ports.

`npm view` on 2026-10-04 verified `@tanstack/solid-start` and `@tanstack/solid-router`
**2.0.0-rc.8**, and their Solid 2.0 peer ranges. Both are pinned to that release.
Solid and Solid Web remain at the workspace's **2.0.0-rc.13**.

Port note: Start rc.8's server barrel imports a server-function API removed in Solid Web rc.13.
`src/server.ts` uses the same underlying Start SSR handler and Solid request-event scope directly.
This static site has no server functions. Remove the custom entry once Start's barrel supports
the current Solid Web API. No package sources or installed packages are patched.

See [PORTING-DOCS.md](./PORTING-DOCS.md) for the repeatable content port workflow.
