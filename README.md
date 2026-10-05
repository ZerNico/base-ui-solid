# Base UI Solid

An unofficial port of [Base UI](https://base-ui.com) to [Solid 2.0](https://www.solidjs.com): unstyled UI components for building accessible user interfaces.

Base UI is created by the team behind Radix, Floating UI, and Material UI. This port is not affiliated with or endorsed by the Base UI team.

---

## Installation

```bash
npm i base-ui-solid solid-js@2.0.0-rc.13 @solidjs/web@2.0.0-rc.13
```

Base UI Solid requires Solid 2.0 with the compiler configured for `jsxImportSource: "@solidjs/web"`. Solid 1.x is not supported.

## Documentation

The documentation lives in [`docs`](/docs). Run `pnpm install` and `pnpm --filter docs dev`, then open the [quick start](http://localhost:3005/solid/overview/quick-start).

## How the port works

The port follows upstream file by file: components keep the same parts, props, data attributes, CSS variables, and behavior, and upstream's test suite is ported alongside them.

- [`UPSTREAM.md`](/UPSTREAM.md) records the upstream commit the port tracks and how to sync later changes.
- [`PORTING.md`](/PORTING.md) describes how React code translates to Solid, and the known differences.

## Development

```bash
pnpm install
pnpm test:jsdom --run      # unit tests in jsdom
pnpm test:chromium --run   # browser tests in Chromium
pnpm typecheck
pnpm test:compare-upstream # checks the ported tests against upstream (expects ../base-ui)
pnpm docs:build            # static docs export in docs/export
pnpm build                 # publishable packages in packages/*/build
```

## Releasing

`base-ui-solid` and `@base-ui-solid/utils` are released together with the same version. The
[Publish](/.github/workflows/publish.yml) workflow publishes them to npm with
[Trusted Publishing](https://docs.npmjs.com/trusted-publishers) (no npm token), and the
[Deploy docs](/.github/workflows/deploy-docs.yml) workflow updates the docs site.

```bash
pnpm release:version 0.1.0   # sets the version of both packages
git commit -am "v0.1.0" && git push   # wait for CI
git tag v0.1.0 && git push origin v0.1.0
```

Versions with a prerelease part (`0.1.0-beta.1`) are published under the `next` dist-tag.

## License

This project is licensed under the terms of the [MIT license](/LICENSE). It includes code from Base UI, copyright Material-UI SAS.
