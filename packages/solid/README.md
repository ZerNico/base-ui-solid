# Base UI Solid

An unofficial port of [Base UI](https://base-ui.com) to [Solid 2.0](https://www.solidjs.com): unstyled UI components for building accessible user interfaces. You gain complete control over your app's CSS and accessibility features.

Base UI is created by the team behind Radix, Floating UI, and Material UI. This port is not affiliated with or endorsed by the Base UI team.

## Installation

Install the package in your project directory with:

```bash
npm install base-ui-solid solid-js@2.0.0-rc.13 @solidjs/web@2.0.0-rc.13
```

Base UI Solid requires Solid 2.0 with the compiler configured for `jsxImportSource: "@solidjs/web"`. Solid 1.x is not supported.

The package ships its JSX source under the `solid` export condition, so `vite-plugin-solid` compiles it together with your app (for the client and the server). Tools without that condition get precompiled, hydratable builds: a server build under the `worker`, `deno` and `node` conditions and a DOM build under `browser` and `default`.

## Documentation

The documentation lives in the [repository](https://github.com/ZerNico/base-ui-solid/tree/main/docs).

## Contributing

Read the [repository README](https://github.com/ZerNico/base-ui-solid#readme) to learn how the port works and how to build and test your changes.

## Changelog

The [releases](https://github.com/ZerNico/base-ui-solid/releases) list what changed in each version.

## License

This project is licensed under the terms of the [MIT license](https://github.com/ZerNico/base-ui-solid/blob/main/LICENSE). It includes code from Base UI, copyright Material-UI SAS.
