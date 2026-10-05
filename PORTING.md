# Porting guide: `@base-ui/react` → Solid 2.0

Every upstream module is ported. This guide is for porting upstream changes (see `UPSTREAM.md`
for the tracked commit and the sync workflow) and for reviewing deviations.

The goal is a file-by-file port: same folder layout, file names, exports, data attributes, CSS
variables, event reasons and behavior as upstream (see `UPSTREAM.md` for the tracked commit).
Deviate only where React and Solid fundamentally differ, and leave a `Port note:` comment when you do.

Solid 2.0 is not Solid 1.x. Before writing code, read
`node_modules/solid-js/CHEATSHEET.md` (and `skills/reactivity-diagnostics/SKILL.md` when a
diagnostic fires).

## Renamed modules

A few upstream names refer to React and are renamed in the port. `scripts/portPaths.mjs` maps
them for `pnpm upstream:sync` and `pnpm test:compare-upstream`, so upstream diffs still land on
the right files. Add new renames there and here.

| Upstream                                    | Port                                        |
| :------------------------------------------ | :------------------------------------------ |
| `packages/react/src/floating-ui-react/`     | `packages/solid/src/floating-ui-solid/`     |
| `packages/utils/src/store/ReactStore.ts(x)` | `packages/utils/src/store/SolidStore.ts(x)` |
| `ReactStore` (class and test names)         | `SolidStore`                                |
| `docs/src/app/(docs)/react/`                | `docs/src/app/(docs)/solid/`                |

Test-only names that mention React (`advanceReactClock`, `*.react17.test.tsx`) keep their upstream
names so test diffs stay mechanical.

## Public API differences

| Upstream (React)                                                                                                                             | Port (Solid)                                                                                                                                                                                                                                               |
| :------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `className` (string or `(state) => …`)                                                                                                       | `class` (any Solid class value, or `(state) => …`)                                                                                                                                                                                                         |
| `style` object (camelCase)                                                                                                                   | `style` object (kebab-case), string or `false` (no style, so `render` props spread on components), or `(state) => …`                                                                                                                                       |
| `render={<a />}` (element, cloned)                                                                                                           | **Not supported** (Solid can't clone elements). Renders nothing and logs a dev-only error pointing to a render function                                                                                                                                    |
| `render={(props, state) => <a {...props} />}`                                                                                                | Same. `props`/`state` are reactive: spread/read them, don't destructure                                                                                                                                                                                    |
| —                                                                                                                                            | `render="a"` (tag name) and `render={Component}`                                                                                                                                                                                                           |
| `ref` (object or callback)                                                                                                                   | `ref` callback (Solid semantics, not called with `null` on unmount)                                                                                                                                                                                        |
| `event.preventBaseUIHandler()`                                                                                                               | Same, on native events                                                                                                                                                                                                                                     |
| `tabIndex`, other camelCase attributes                                                                                                       | Lowercase attributes (`tabindex`)                                                                                                                                                                                                                          |
| `actionsRef` ref object (`{ current }`)                                                                                                      | `actionsRef` callback, called once with the actions on setup (not with `null` on unmount, like `ref`)                                                                                                                                                      |
| `inputRef` ref object or callback                                                                                                            | `inputRef` callback only                                                                                                                                                                                                                                   |
| `container`, `anchor`, `initialFocus`, `finalFocus` accept a ref object                                                                      | Pass the element itself, e.g. from a signal set by a `ref` callback (`null` = not set yet). Other forms unchanged                                                                                                                                          |
| `ToastObject.ref` ref object                                                                                                                 | `ref()` getter returning the toast element                                                                                                                                                                                                                 |
| `mergeProps` / `mergePropsN` return a new plain object each render                                                                           | Return a reactive object like Solid's `merge` (getters read the sources, stable merged handlers), marked as a Solid proxy so `merge()` and spreads track its keys. Internals use `mergePropsSnapshot`                                                      |
| Popup handle `isOpen` getter (read on render)                                                                                                | Same getter, also tracked (reactive in JSX, memos and effects)                                                                                                                                                                                             |
| `Autocomplete.useFilter(options)`                                                                                                            | Options read lazily (pass getters for reactive options), like `Combobox.useFilter`                                                                                                                                                                         |
| Root `children={({ payload }) => …}` called on every render with the value                                                                   | Called once with `{ payload }` where `payload` is an accessor (destructure it, call `payload()`), only when the function declares a parameter (like `<Show>`)                                                                                              |
| `Combobox`/`Autocomplete` `List`/`Collection` `children={(item, index) => …}`, keyed by the consumer                                         | Called once per item with `item` and `index` as accessors (like `<For keyed={fn}>`). Rows are keyed by the `createItems()` value, `itemToStringValue`, `item.value` or identity                                                                            |
| `*.Value` `children` functions (Progress, Meter, Slider, Select, Combobox, Autocomplete) called on every render                              | Called once with accessors of their arguments, e.g. `(formattedValue, value) => …`. Read them in JSX (a returned plain string isn't reactive)                                                                                                              |
| `Combobox.Root<Value, Multiple, Item = Value>` / `Select.Root<Value, Multiple>`: the value type is inferred from `value`/`defaultValue` only | `Combobox.Root<Item, Multiple, Value = Item>` / `Select.Root<ItemValue, Multiple, Value = ItemValue>`: without `value`/`defaultValue`, the value type is inferred from `items`. `Props` keep upstream's parameter order (plus `ItemValue` last for Select) |
| `List`/`Collection`/`*.Value` function children receive `any`                                                                                | Same by default. The parts are generic, so `<Combobox.List<Fruit>>` or `<Select.Value<string \| null>>` types the accessors                                                                                                                                |
| `useRender.ElementProps<'button'>` (React's props, which accept `data-*` keys)                                                               | Solid's intrinsic element props plus `data-*` attributes                                                                                                                                                                                                   |

## Translation rules

### Components

- `React.forwardRef(function X(componentProps, forwardedRef))` → `function X(componentProps)`.
  The ref arrives in `componentProps.ref` and is forwarded automatically by `useRenderElement`
  through `elementProps`.
- Never destructure props. Replace `const { a, b, ...elementProps } = componentProps` with
  `const elementProps = omit(componentProps, 'a', 'b', …)` and read `componentProps.a` where used.
  Always omit `render`, `class` and `style`.
- Initial-only props (`defaultOpen`, `defaultValue`) are read once with `untrack(() => props.x)`.
- Component `state` is a `createMemo(() => ({ … }))`, passed to `useRenderElement` and contexts as
  the accessor.

### Public hook and function conventions

What the public API returns (see the Reactivity section of the docs' Composition handbook):

- A single reactive value is an `Accessor` (`useDirection()`, `useFilteredItems()`, `useMediaQuery()`).
- Structured state is a reactive object with getters, not destructurable (`useToastManager()`'s
  `toasts`, a handle's `isOpen`, the `mergeProps` result, `render`'s `props`/`state`).
- Methods are plain, stable functions (`useToastManager().add`, `handle.open()`, `actionsRef`
  actions, filter methods).
- Options objects are read lazily, so callers pass getters for reactive options.

### Docs links

JSDoc `Documentation:` links and runtime messages point to the port's docs
(`https://base-ui-solid.pages.dev/solid/…`), not upstream's `https://base-ui.com/react/…`. After
porting upstream changes, run `pnpm rewrite-docs-links`. The docs site rewrites both forms to
local `/solid/…` paths (`docs/src/mdx/markdownPlugin.mjs`).

### Hooks → primitives

- `useX` functions keep their names and run once per component instance.
- Reactive parameters become `Accessor`s (`open: () => props.open`). Reactive return values become
  `Accessor`s. Callbacks and constants stay plain. Hooks with many reactive parameters (e.g.
  `useCompositeRoot`) may instead take a props-like object read lazily (`params.x`). Pass an object
  with getters, and say so in the hook's doc comment.
- `useState` → `createSignal`. Setters are batched: reads return the old value until the
  microtask flush, so use locals instead of reading back what you just wrote.
- Values that upstream computes during render → plain functions or `createMemo`.
- Render-phase `setState` (adjusting state while rendering) → a writable memo
  (`createSignal(prev => …)`). See `internals/useTransitionStatus.ts`.
- `useEffect` / `useLayoutEffect` / `useIsoLayoutEffect` →
  `useIsoLayoutEffect(effect, () => [deps])` / `useEffect` from `@base-ui-solid/utils/useIsoLayoutEffect`.
  React semantics: runs after the DOM update, only when a dep changed (`Object.is`), and the
  returned cleanup runs before the next run and on disposal. Read reactive values in `deps` and use
  the values passed to `effect`. Writes to signals are allowed in `effect` and in its cleanup.
- Solid runs disposal cleanups inside the computation that removed the owner (a `<For>` row, a
  `<Show>` branch), where a signal write throws `REACTIVE_WRITE_IN_OWNED_SCOPE` in dev and halts
  reactivity. `useIsoLayoutEffect` runs its cleanups through `runCleanup` from
  `@base-ui-solid/utils/cleanup`, which runs them without an owner. Use `onCleanupWithWrites` instead
  of `onCleanup` (and `runCleanup` in `onSettled` cleanups) when the cleanup can write state, such as
  unregistering from a parent or calling a ref with `null`.
- `useRef` for DOM elements → a `let` variable set by a ref callback. Internal refs passed to
  `useRenderElement`'s `ref` param are called with `null` when the rendered element is disposed,
  like React. If a `render` function can swap the element out, also check `element.isConnected`.
- `useRef` read during render → `useTrackedRef` from `@base-ui-solid/utils/useTrackedRef`.
- `useStableCallback` / `useCallback` / `useMemo` for identity → not needed. Drop them.
- `useControlled({ controlled: () => props.x, default, name, state })` returns `[Accessor, setter]`.
- `useTimeout` / `useAnimationFrame` → same API, cleaned up with the owner.
- React applies a `setState` made in an animation frame callback in a later task, after the browser
  has rendered that frame. Solid applies it before. Where that frame must render the current state
  first (e.g. `data-starting-style` before a CSS transition), defer the write to a task like
  `useTransitionStatus` does. In tests, upstream's `act(async () => { await waitForAnimationFrame(); })`
  then needs an extra macrotask before asserting.
- `ReactDOM.flushSync(fn)` → `fn(); flush();`.
- `process.env.NODE_ENV !== 'production'` → `IS_DEV` from `@base-ui-solid/utils/isDev`.
- `React.Activity`-specific logic has no Solid equivalent. Drop it with a `Port note:`.

### Rendering (`useRenderElement`)

- It returns a JSX element that's created once and updates in place.
- `props` can be an accessor returning the upstream array, which keeps the code almost identical:

  ```tsx
  return useRenderElement('button', componentProps, {
    state,
    ref: buttonRef,
    props: () => [
      { 'aria-expanded': open(), onClick: handleTrigger },
      elementProps,
      getButtonProps,
    ],
    stateAttributesMapping,
  });
  ```

- Boolean `aria-*` values are rendered as `"true"`/`"false"` (React semantics). Other attributes
  set to `false`/`undefined` are removed (Solid semantics).
- `children` never pass through the reactive merge. They're read lazily from the props object
  that provided them, so they're created once.
- **Context providers**: call `useRenderElement` _inside_ the provider's JSX so the children are
  created under it:

  ```tsx
  return <XContext value={ctx}>{useRenderElement('div', componentProps, { … })}</XContext>;
  ```

- Conditional rendering (`if (!shouldRender) return null`) → `<Show when={…}>{useRenderElement(…)}</Show>`.

- Internal components that take `props`/`state` (`CompositeRoot`, `CompositeItem`) read them
  reactively, so pass them as normal JSX props: `<CompositeItem state={state()} props={props()} />`.
- A branch that depends only on context presence (`groupContext ? <CompositeItem …/> : …`) is
  decided once, like upstream's per-render branch, because context presence can't change.

### Composite lists

- `useCompositeListItem` registers the element from its ref and also unregisters on disposal,
  because Solid doesn't call refs with `null`.
- Items subscribe to index changes synchronously (not in an effect), because the list's first
  flush can run before the items' effects.

### Inputs

- React restores a controlled input's DOM value when the consumer rejects a change. Solid doesn't,
  so controlled inputs restore it themselves after flushing the update (see `FieldControl`).
- `defaultValue`/`defaultChecked` are set as DOM properties by Solid, as in React.

### Contexts

- `React.createContext<T | undefined>(undefined)` →
  `createContext<T | null>(null)`, and `useContext(X) ?? undefined` in the `useXContext` helper.
  In Solid, an `undefined` default means "no default" and throws when there's no provider.
- `<X.Provider value>` → `<X value>`.
- Context values hold accessors, not snapshots.

### Events and props merging

- Handlers receive native events, so there's no `event.nativeEvent`: use `event` itself.
- React event names don't always match the native event:
  - `onFocus` / `onBlur` → `onFocusIn` / `onFocusOut`, because React's versions bubble.
  - `onChange` on text inputs → `onInput`, because React's `onChange` fires on every keystroke.
  - `onDoubleClick` → `onDblClick`.
  - `onMouseEnter` / `onMouseLeave` don't bubble in either framework.
- `mergeProps` merges `class` into a class array, `style` objects/strings, event handlers
  (including Solid's `[handler, data]` form) and `ref`s (composed, unlike upstream).
- The public `mergeProps`/`mergePropsN` return a reactive object (a proxy over the sources).
  Internal code merges inside reactive scopes (props accessors, memos) and uses the snapshot
  versions `mergePropsSnapshot`/`mergePropsSnapshotN` from `merge-props/mergeProps` instead.
- Don't use object rest on props that may contain `children`. Use `omitProps` from
  `merge-props/mergeProps` instead.

### Stores and popups

Upstream's popups share state through `@base-ui/utils/store` (`Store`/`SolidStore` read with
`useSyncExternalStore`). The port keeps the same classes, names and methods
(`@base-ui-solid/utils/store`) so popup code ports 1:1:

- `Store` is unchanged and framework-agnostic: `state` is a plain object, updated synchronously by
  `setState` / `set` / `update`, and `subscribe` listeners run synchronously. Reading
  `store.state` (or `select()`) is **not tracked**: use it in event handlers and effects, like
  upstream.
- `store.useState(key, ...args)`, `store.use(selector, ...args)` and `useStore(store, selector, ...args)`
  return an **accessor** backed by a memo: the hook subscribes to the store, re-runs the selector
  when Solid flushes and notifies readers only when the selected value changed (`Object.is`).
  Selector arguments may be accessors (`store.useState('isActive', () => index())`). An argument
  that is itself a function must be wrapped (`() => fn`).
- `SolidStore` keeps its name. Values synced into the store are passed as accessors:
  `useSyncedValue(key, () => props.x)`, `useSyncedValueWithCleanup(key, accessor)`,
  `useControlledProp(key, () => props.open)` and `useSyncedValues(() => ({ a: a(), b: props.b }))`.
  They write in an effect (`useIsoLayoutEffect`), like upstream's layout effects.
- `useContextCallback(key, () => props.onOpenChange)` stores a stable function that calls the latest
  callback (replaces `useStableCallback`). `useStateSetter(key)` returns a plain setter.
- `createSelector` / `createSelectorMemoized` are copied verbatim (reselect-based).

Floating UI:

- `@floating-ui/react-dom` is replaced by `floating-ui-solid/dom` (built on `@floating-ui/dom`), with
  the same API: `useFloating`, middleware accepting `deps`, `arrow` accepting a ref object, and the
  DOM utilities. Options objects are read lazily (pass getters for reactive options). The returned
  object (and `FloatingContext`) exposes `x`, `y`, `placement`, `strategy`, `middlewareData`,
  `isPositioned`, `floatingStyles`, `open`, `floatingId` and `elements.*` as **getters**: read them in
  a reactive scope and don't destructure them. `refs`, `update` and the stores are stable.
  `floatingStyles` is a Solid style object (kebab-case, `px` units).
- Interaction hooks (`useClick`, `useDismiss`, …) return `ElementProps` whose props objects are read
  lazily: their reactive values are getters, and event handlers are stable functions. Merge them
  inside `useRenderElement`'s `props` accessor (or `mergeProps` called in a reactive scope).
- React's `onFocus`/`onBlur` in these props become `onFocusIn`/`onFocusOut` (React's versions bubble).
  React's `onMouseDown`/`onPointerDown`/… keep their names.
- Mutable refs shared through stores (`dataRef`, `popupRef`) are `RefObject`s from
  `@base-ui-solid/utils/refObject`.
- `useHoverReferenceInteraction` returns an accessor of its props (upstream: `HTMLProps | undefined`).
- `FloatingPortal` renders through `@solidjs/web`'s `Portal`, keeping upstream's API. Solid portals
  don't bubble events through the component tree like React portals: `useDismiss` decides whether
  an event comes from inside the floating tree by following Solid's `_$host` links on portaled
  nodes (the same internal property Solid's event delegation uses).
- Effect order: Solid runs a parent's effects before its children's. React runs child layout
  effects first. Popup code that relies on child-first ordering needs checking (see the Port notes in
  `popupStoreUtils.test.tsx`).
- Popup-related utils take accessors: `useMergedRefs(() => props.ref, …)`, `useValueAsRef(accessor)`,
  `usePreviousValue(accessor)`, `useScrollLock(enabled, referenceElement)`.
  `useForcedRerendering()` returns `rerender` plus `rerender.track()` for memos that must re-run.

Tests for popups:

- `fireEvent` from `#test-utils` doesn't flush Solid: call `flush()` (or `await flushMicrotasks()`)
  before asserting.
- Native keyboard events aren't normalized: React maps `Esc` to `Escape`, Solid doesn't.
- `toBeInaccessible` (from `@mui/internal-test-utils`) is registered in `test/setupVitest.ts`.
- Production-only code paths can be tested with `vi.doMock('@base-ui-solid/utils/isDev', () => ({ IS_DEV: false }))`.
- Floating UI's test helpers live in `packages/solid/test/floating-ui-tests` (`useFloating`, `useHover`, …).
  Reactive `useFloating` options are passed as getters (`get open() { return open(); }`).

## Tests

The setup mirrors upstream: `vitest.shared.mts`, one `vitest.config.mts` per package, a root
config listing them as projects, and `test/setupVitest.ts`.

| Command                                               | Runs in                                       |
| :---------------------------------------------------- | :-------------------------------------------- |
| `pnpm test`                                           | Chromium (default, like upstream)             |
| `pnpm test:jsdom`                                     | jsdom                                         |
| `pnpm test:chromium`                                  | Chromium (Vitest browser mode via Playwright) |
| `pnpm test:firefox` / `test:webkit` / `test:browsers` | Firefox / WebKit / all three                  |
| `pnpm test:<browser>:ui`                              | The same, with a visible browser              |

- Port upstream tests next to the source with the same file and test names. Import helpers from
  `#test-utils` (`packages/solid/test`): `render(() => <Jsx />)` returns `{ user, … }`, plus
  `describeConformance`, `isJSDOM`, `flushMicrotasks` and the testing-library exports.
- Replace `React.useState` wrappers and `setProps` with `createSignal`s. After imperative signal
  writes, call `flush()` before asserting.
- Like upstream, animations are disabled by default (`BASE_UI_ANIMATIONS_DISABLED`). Animation
  tests set it to `false`.
- Keep upstream's skip conditions exactly (e.g. `skipIf(isJSDOM)`): those tests run in the
  browser pass. Hard skips are allowed only with a reason marker in the comment: `React-only`
  (StrictMode, `React.Activity`, Suspense, React element `render`, React-version conditions) or
  `TODO(port): needs <Component>`. `pnpm test:compare-upstream` checks every ported test against
  upstream by full name and effective skip condition (expects `../base-ui`, or pass its path).

### SSR and hydration tests

Upstream renders inline JSX with `renderToString(jsx)` and gets `{ container, hydrate }`. Solid
compiles the same JSX differently for the server and the client, so:

- The tree to server-render is an exported component in a colocated `<TestFile>.fixtures.tsx`
  (e.g. `AccordionRoot.fixtures.tsx`). Props passed to it must be serializable.
- `renderToString(Component, props?)` from `#test-utils` renders it with Solid's server build (a
  Vite SSR server in Node, reached through a Vitest browser command in Chromium), injects the HTML
  and the hydration bootstrap script, and returns `{ container, html, hydrate }`. `hydrate()`
  hydrates it with the client build and returns `{ setProps }` (props are held in a store, like
  upstream's `hydrate().setProps`). Tests in `packages/utils` import the helper from
  `../../solid/test/renderToString`.
- Write the test body like upstream: assert the server markup before `hydrate()` (ids, `for`,
  `aria-*`) and the associations after it. Parameterize fixtures with simple props
  (e.g. `nativeButton: boolean`) for `it.each` rows.
- Hydration mismatches fail the test, like React's hydration errors do upstream: Solid reports
  them through `console.warn` (missing hydration keys and tag/structure mismatches during
  `hydrate()`, unclaimed server nodes a macrotask later), and the helper turns them into errors
  (thrown from `hydrate()`, or from its `onTestFinished` teardown for the deferred check).
- The test projects compile client code as hydratable. In Vitest the Solid plugin ignores
  `ssr: true` for client code, so `vitest.shared.mts` also passes `solid: { hydratable: true }`.
  HMR's component wrapping is disabled so fixture components keep their identity.
- The SSR Vite server is closed when Vitest shuts down (`closeBundle` in `ssrFixturesPlugin`),
  otherwise it keeps the browser-mode process alive.
- `pnpm test:compare-upstream` treats a skip condition that only detects a React API
  (e.g. `React.useId === undefined`) as no condition: the port runs those tests.

## Linting

Same tooling as upstream (`@mui/internal-code-infra`, same versions): `eslint.config.mjs`,
`.remarkrc.mjs` (Markdown via eslint-plugin-mdx), `stylelint.config.mjs`, `.lintignore`.

| Command           | Runs                                                                        |
| :---------------- | :-------------------------------------------------------------------------- |
| `pnpm eslint`     | ESLint on the whole repo (cached, `--max-warnings 0`, unused disables fail) |
| `pnpm eslint:ci`  | The same without cache                                                      |
| `pnpm stylelint`  | Stylelint on `**/*.css`                                                     |
| `pnpm typescript` | `tsc` (TS 7, `@typescript/native`), with `pnpm typecheck` as an alias       |

- **Run ESLint on your files before reporting** (and fix what it reports):
  `pnpm exec eslint --report-unused-disable-directives --max-warnings 0 <files>` (`pnpm eslint <files>`
  would still lint the whole repo). `--fix` handles import order, `import type`, and missing
  `vitest` imports.
- As upstream, tests import `describe`/`it`/`expect`/`vi`/… from `'vitest'` explicitly
  (`vitest/prefer-importing-vitest-globals`), with upstream's import line order.
- **React → Solid rule swap.** The code-infra base config enables eslint-plugin-react,
  react-hooks and react-compiler. Every rule of those plugins is turned off for our files and
  `eslint-plugin-solid` (`v2` preset, Solid 2.0 semantics) is enabled instead. Upstream's
  `react/no-danger` disables become `solid/no-innerhtml` disables. Drop upstream's
  `react-hooks/*` / `react-compiler/*` disables. `solid/reactivity` is off (its heuristic misreads
  the accessor conventions above. Tests cover reactivity). In tests, `solid/prefer-for` (fixtures
  mirror upstream's `.map()`) and `vitest/no-disabled-tests` (hard skips carry reason markers) are
  off.
- Other port-specific settings: `mui/disallow-react-api-in-server-components` is off (no
  `'use client'` in Solid), and `mui/no-floating-cleanup` is replaced by
  `base-ui-solid/no-floating-cleanup`, which ignores `onCleanup()`'s returned `Disposable`
  (discard other intentionally ignored cleanups with `void`, like upstream). Deep imports are
  restricted to one level for `base-ui-solid/<module>`, and `mui/add-undef-to-optional` applies to
  `packages/*/src` (write `children?: JSX.Element | undefined`).
- Keep upstream's `eslint-disable` comments when the rule still exists (translate React rule names
  as above), with the same placement.
- `typescript-eslint` needs the TypeScript JS API, so (like upstream) the `typescript` package is
  TS 6 (`@typescript/typescript6`, binary `tsc6`) and `tsc` comes from `@typescript/native` (TS 7).

## Known issues

### Firefox and WebKit

Like upstream, CI only runs jsdom and Chromium. `pnpm test:firefox` and `pnpm test:webkit` fail
in upstream too: many tests rely on `Touch`, pointer capture and Chromium focus/scroll behavior.
On 2026-10-04, upstream's own suite failed the same tests as this port in WebKit (192), and in
Firefox the port matched upstream's 137 failures apart from a few tests that only fail under
full-suite load and pass when their file runs alone. Compare against upstream before treating a
Firefox/WebKit failure as a port bug: run the same files with `pnpm test:firefox --run <names>` in
`../base-ui` (it needs `pnpm install` and `pnpm --filter @base-ui/utils build` there first).

### Porting pitfalls

- `useIsoLayoutEffect` compares dependencies with `Object.is`. Use incrementing counters for tick
  signals, since repeated `undefined` values do not rerun the effect.
- Solid rewrites an input's `value` on every spread update, which can move the caret. Write the DOM
  value only when it differs (see `NumberFieldInput` and `OTPFieldInput`).
- Expected-throw tests can emit a duplicate uncaught window error in Chromium. Suppress only the
  expected error around the assertion (see `TabsTab.test.tsx`).
- Solid runs parent effects before children. Check popup setup that assumes React's child-first
  layout effects.
- Popup Root children are render functions only when `typeof children === 'function'` and
  `children.length > 0`. Zero-argument functions are JSX factories. Render functions are called
  once with `{ payload }`, where `payload` is an accessor (`PayloadChildRenderFunction`). Call
  `usePopupHandleAttachment` in the root body so its lifecycle belongs to the root.

- **Solid dev diagnostics in the browser.** With `solid-js/attribution` enabled, internals used to
  report about 36 warnings in a typical docs session. They're down to about 18 by keeping memo
  outputs stable (state, style and props memos compare shallowly) and deriving registrations
  (Field message ids, Tabs panels, `useTransitionStatus`'s idle and unmount rules) instead of
  writing them from effects. The remaining ones follow upstream's layout-effect design:
  - `EFFECT_RELAY_TEAR` via `subscribeToStore.track` (Select, Combobox, Autocomplete, Popover,
    Preview Card, Dialog, Drawer, Tooltip, Navigation Menu): popups sync their props into the
    `Store` from layout effects (`useSyncedValue`, `store.update`), like upstream. Removing it needs
    a store whose synced keys are derived, not written.
  - `useCollapsiblePanel.dimensions` and `useFloating.data`: DOM measurement, inherently an effect.
  - OTP Field `focusedIndex`: the effect moves DOM focus after the value commits, and the focus
    handler records the index.
  - Navigation Menu `floatingRootContext` / `positionReference`: the active trigger hands its
    floating context to the root from a layout effect, like upstream.
  - Popover trigger `shouldRenderBeforeFocusGuard`: intentional, the leading focus guard is added
    one update after the trailing one so Solid doesn't move (and blur) the trigger.
  - `WIDE_SCOPE_DEPS` on a long `Combobox.List`: the list's insert effect reads every row's
    dynamic root (parts can swap their element through `render`).
