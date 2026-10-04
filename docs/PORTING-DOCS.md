# Porting documentation pages

Keep upstream filenames under `src/app/(docs)/solid/{overview,components,handbook,utils}`.
A small route wrapper in `src/routes` imports each `page.mdx` and passes `mdxComponents`.
The pathless routes `_docs`, `_website`, and `_private` correspond to upstream `(docs)`,
`(website)`, and `(private)` without changing URLs. Public framework URLs use `/solid/`. Legacy `/react/*`
URLs receive permanent redirects through the shared middleware and Netlify `_redirects`. `_private/playground` provides the
upstream `/playground` URL as a Collapsible smoke surface. It is a route group, not authorization.

## Page workflow

1. Copy the upstream page and all its demos, including every styling variant and CSS file.
2. Change `@base-ui/react/<component>` imports to `base-ui-solid/<component>` and utils imports
   to `@base-ui-solid/utils/...`. Use `class`, lowercase native attributes, and native Solid event
   names. Follow the repository `PORTING.md` and Solid 2.0 cheatsheet. Retain reactive props.
3. Keep MDX prose, headings, links, and examples. Adjust framework names and API differences.
4. Copy the Collapsible route wrapper, change its path/import, and export head metadata from the
   MDX `metadata` export. Start generates `routeTree.gen.ts`. Do not edit that file manually.
5. Add the completed page to `src/data/sitemap.ts` for navigation and search.
6. Build and run the browser smoke script, including every live variant. Check console warnings
   and hydration, not merely HTTP status. Add page-specific smoke coverage for later components.

## MDX pipeline

`src/mdx/options.mjs` configures `@mdx-js/rollup`. Its plugin must run before Solid's compiler.
It emits JSX with `jsxImportSource: @solidjs/web`, which is Solid 2.0's web renderer.
The remark pipeline preserves upstream heading badges, GFM, metadata, typography, TOC exclusion,
relative route links, and code metadata. Upstream rehype plugins preserve slug deduplication,
heading concatenation, TOC extraction/injection, subtitle paragraph unwrapping, and keyboard tags.
Both upstream plugin test files are copied in full with identical test names.

Port note: MDX defaults native tags to strings. `recmaSolidComponents` turns these defaults into
native JSX functions because Solid member tags require component functions. It also maps
MDX-generated `className`, `htmlFor`, and `tabIndex` attributes to Solid native spellings. React's MDX provider
is replaced by an explicit component map. QuickNav renders each list once. Evaluating JSX children
in a Show condition creates hydration scopes in the wrong order.

Code blocks use MUI docs-infra's `createParseSource` and `createEnhanceCodeEmphasis`, including
`@highlight` and `@focus` annotations. Inline code uses its inline transform/enhancer. Native HAST
replaces the React-only CodeHighlighter client. No React runtime enters the client bundle.
The existing upstream syntax CSS is reused.

## Demos and source files

`src/utils/createDemo.tsx` creates a Solid `<Demo>` from variant records. Each record contains the
live component and its source files. Import source through `?highlight`, handled by
`src/mdx/sourcePlugin.mjs`. It uses the same MUI parser and emphasis pipeline at build time.
Include `index.tsx`, imported CSS Modules, and any supporting source/assets in the file record.
The variant and file tabs display the source corresponding to the live component.
Vite resolves CSS Modules normally, and Tailwind compiles the upstream demo utility classes.
Upstream `src/css` and component CSS are copied as-is, and `port.css` supplies Solid shell controls.

Port note: upstream's Next.js loader factories, React demo editing/error machinery, and analytics
cannot be reused as Solid components. The site provides live demos, source variant/file
selection, StackBlitz/CodeSandbox export, local search, navigation, and TOC. It does not provide
an in-browser code editor, analytics, or the remaining website/private pages. The export
generates a Vite + Solid project with the ported `blocks/createCodeSandbox` utilities and
`utils/demoExportOptions.ts`. It installs `base-ui-solid` from `BASE_UI_SOLID_PACKAGE_SPEC`.

## API reference

This upstream checkout has no `docs/reference` directory. Its authoritative generated snapshot
is each component's `types.md`. Run from `docs`:

```bash
node scripts/generateReference.mjs collapsible ../../base-ui/docs
```

The generator converts upstream props, defaults, descriptions, data attributes, CSS variables,
and additional state/event types into `reference/<component>.json`. It adjusts React `className`,
style types, and element-cloning render types for Solid. Review these substitutions against the
ported component before committing. For a future upstream JSON snapshot, map it to the same fields.
`src/utils/createTypes.tsx` renders the JSON as Solid reference tables and expandable type snippets.
A page's `types.ts` exports the generated component map, following Collapsible's pattern.

## Verification

```bash
pnpm --filter docs typescript
pnpm --filter docs test
pnpm --filter docs build
pnpm --filter docs dev
pnpm --filter docs smoke
pnpm --filter docs smoke:all
pnpm --filter docs links
pnpm --filter docs redirects
pnpm exec prettier --write docs eslint.config.mjs pnpm-workspace.yaml --ignore-path .lintignore
pnpm exec eslint docs eslint.config.mjs --report-unused-disable-directives --max-warnings 0
```

Set `DOCS_URL=http://localhost:3010` when checking `pnpm --filter docs serve`. The smoke script
also reads the static HTML to ensure actual content is prerendered. Start output remains in
`dist`. Only `export` is deployed. Generated build artifacts are ignored.
