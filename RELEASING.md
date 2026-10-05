# Releasing

Two packages are published to npm with the same version:

- [`@base-ui-solid/utils`](https://www.npmjs.com/package/@base-ui-solid/utils) from `packages/utils`
- [`base-ui-solid`](https://www.npmjs.com/package/base-ui-solid) from `packages/solid`, which depends on the utils package

Releases are published by the [Publish](/.github/workflows/publish.yml) workflow with npm [Trusted Publishing](https://docs.npmjs.com/trusted-publishers). GitHub Actions authenticates to npm through OIDC, so the repository stores no npm token, and npm adds provenance to every version automatically.

## How the packages are built

The workspace consumes the TypeScript sources (`exports` in each `package.json` point at `src`). Like upstream, `pnpm build` writes a separate publishable package to `packages/*/build` with its own generated `package.json`. `pnpm build` at the root builds utils first, then `base-ui-solid`. Each module is emitted once per target, and every export (including `./internals/*`) maps them to conditions:

| Condition                | Files             | Contents                                                                         |
| :----------------------- | :---------------- | :------------------------------------------------------------------------------- |
| `types`                  | `build/**/*.d.ts` | Declarations from `tsc -p tsconfig.build.json`                                   |
| `solid`                  | `build/source/**` | TypeScript stripped, JSX preserved. `vite-plugin-solid` compiles it with the app |
| `worker`, `deno`, `node` | `build/server/**` | Compiled with `generate: 'ssr'` and `hydratable: true`                           |
| `browser`, `default`     | `build/dom/**`    | Compiled with `generate: 'dom'` and `hydratable: true`                           |

The condition order follows `solid-js` and `@solidjs/web`. Tests, fixtures and test helpers are left out. See [`scripts/buildPackage.mjs`](/scripts/buildPackage.mjs).

To check a build locally, pack it and install the tarballs in an app outside the repository:

```bash
pnpm build
cd packages/utils/build && pnpm pack
cd ../../solid/build && pnpm pack
```

## One-time setup on npmjs.com

npm only lets you configure a trusted publisher for a package that is already on the registry ("The package you're configuring must already exist on the npm registry", from the [`npm trust` docs](https://docs.npmjs.com/cli/v11/commands/npm-trust)). So each package is published once by hand, then handed over to the workflow.

1. Sign in to an npm account with two-factor authentication enabled that can publish to the `base-ui-solid` organization (the scope of `@base-ui-solid/utils`).
2. Publish the first version of both packages from a clean checkout of `main`, utils first. Use a version the workflow will never publish, for example the current `0.0.0`. npm asks for a one-time password on each publish.

   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   npm login
   cd packages/utils/build && npm publish --access public
   cd ../../solid/build && npm publish --access public
   npm logout
   ```

   Publish from the `build` directories (or their `pnpm pack` tarballs), never from `packages/*` directly, where `exports` point at the TypeScript sources.

3. Add a trusted publisher to each package. On npmjs.com open the package, then **Settings** → **Trusted publishing**, select **GitHub Actions** and fill in:
   - **Organization or user:** `ZerNico`
   - **Repository:** `base-ui-solid`
   - **Workflow filename:** `publish.yml` (only the file name)
   - **Environment name:** leave empty
   - **Allowed actions:** select `npm publish`. Configurations created after September 3, 2026 only allow `npm stage publish` by default, and the workflow publishes directly.

   npm doesn't validate these fields when you save them, so a typo only shows up as a failed publish. The same configuration can be created from the command line (npm 11.15.0 or later, with 2FA):

   ```bash
   npx npm@latest trust github @base-ui-solid/utils --repo ZerNico/base-ui-solid --file publish.yml --allow-publish
   npx npm@latest trust github base-ui-solid --repo ZerNico/base-ui-solid --file publish.yml --allow-publish
   ```

4. Once the first release went through the workflow, harden both packages: under **Settings** → **Publishing access** select **Require two-factor authentication and disallow tokens**. This doesn't affect trusted publishing. Revoke any npm tokens that are no longer needed.

Trusted publishing only works on GitHub-hosted runners, and provenance is only generated while the repository is public. `repository.url` in both `package.json` files must keep pointing at `github.com/ZerNico/base-ui-solid`.

## Release steps

1. Set the new version on both packages:

   ```bash
   pnpm release:version 0.1.0
   ```

   A version with a prerelease part (`0.1.0-beta.1`) is published under the `next` dist-tag. Any other version becomes `latest`.

2. Commit the change on `main` and push it. Wait for CI to pass.

   ```bash
   git commit -am "v0.1.0"
   git push origin main
   ```

3. Tag the commit and push the tag:

   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

Pushing the tag starts two workflows:

- [Publish](/.github/workflows/publish.yml) installs, typechecks, runs the JSDOM tests and builds, checks that the tag (without the leading `v`) equals both package versions, then publishes `@base-ui-solid/utils` and `base-ui-solid` from their build directories.
- [Deploy docs](/.github/workflows/deploy-docs.yml) moves the `docs-v1` branch to the tag, and Cloudflare Pages deploys the docs from it.

To rehearse a release, run the **Publish** workflow by hand from the Actions tab with **dry-run** checked (the default). It runs every step and passes `--dry-run` to `npm publish`. A real publish only runs for a version tag.

npm never accepts the same version twice. If a release fails after `@base-ui-solid/utils` went out, re-running the workflow fails on utils, so release the next patch version instead.
