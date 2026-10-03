# Porting guide: `@base-ui/react` → Solid 2.0

The goal is a file-by-file port: same folder layout, file names, exports, data attributes, CSS
variables, event reasons and behavior as upstream (see `UPSTREAM.md` for the tracked commit).
Deviate only where React and Solid fundamentally differ, and leave a `Port note:` comment when you do.

Solid 2.0 is not Solid 1.x. Before writing code, read
`node_modules/solid-js/CHEATSHEET.md` (and `skills/reactivity-diagnostics/SKILL.md` when a
diagnostic fires).

## Public API differences

| Upstream (React)                              | Port (Solid)                                                            |
| --------------------------------------------- | ----------------------------------------------------------------------- |
| `className` (string or `(state) => …`)        | `class` (any Solid class value, or `(state) => …`)                      |
| `style` object (camelCase)                    | `style` object (kebab-case) or string, or `(state) => …`                |
| `render={<a />}` (element, cloned)            | **Not supported** — Solid can't clone elements                          |
| `render={(props, state) => <a {...props} />}` | Same. `props`/`state` are reactive: spread/read them, don't destructure |
| —                                             | `render="a"` (tag name) and `render={Component}`                        |
| `ref` (object or callback)                    | `ref` callback (Solid semantics; not called with `null` on unmount)     |
| `event.preventBaseUIHandler()`                | Same, on native events                                                  |
| `tabIndex`, other camelCase attributes        | Lowercase attributes (`tabindex`)                                       |

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

### Hooks → primitives

- `useX` functions keep their names and run once per component instance.
- Reactive parameters become `Accessor`s (`open: () => props.open`); reactive return values become
  `Accessor`s. Callbacks and constants stay plain. Hooks with many reactive parameters (e.g.
  `useCompositeRoot`) may instead take a props-like object read lazily (`params.x`). Pass an object
  with getters, and say so in the hook's doc comment.
- `useState` → `createSignal`. Setters are batched: reads return the old value until the
  microtask flush, so use locals instead of reading back what you just wrote.
- Values that upstream computes during render → plain functions or `createMemo`.
- Render-phase `setState` (adjusting state while rendering) → a writable memo
  (`createSignal(prev => …)`); see `internals/useTransitionStatus.ts`.
- `useEffect` / `useLayoutEffect` / `useIsoLayoutEffect` →
  `useIsoLayoutEffect(effect, () => [deps])` / `useEffect` from `@base-ui-solid/utils/useIsoLayoutEffect`.
  React semantics: runs after the DOM update, only when a dep changed (`Object.is`), and the
  returned cleanup runs before the next run and on disposal. Read reactive values in `deps` and use
  the values passed to `effect`. Writes to signals are allowed in `effect`.
- `useRef` for DOM elements → a `let` variable set by a ref callback. Internal refs passed to
  `useRenderElement`'s `ref` param are called with `null` when the rendered element is disposed,
  like React. If a `render` function can swap the element out, also check `element.isConnected`.
- `useRef` read during render → `useTrackedRef` from `@base-ui-solid/utils/useTrackedRef`.
- `useStableCallback` / `useCallback` / `useMemo` for identity → not needed; drop them.
- `useControlled({ controlled: () => props.x, default, name, state })` returns `[Accessor, setter]`.
- `useTimeout` / `useAnimationFrame` → same API, cleaned up with the owner.
- React applies a `setState` made in an animation frame callback in a later task, after the browser
  has rendered that frame; Solid applies it before. Where that frame must render the current state
  first (e.g. `data-starting-style` before a CSS transition), defer the write to a task like
  `useTransitionStatus` does. In tests, upstream's `act(async () => { await waitForAnimationFrame(); })`
  then needs an extra macrotask before asserting.
- `ReactDOM.flushSync(fn)` → `fn(); flush();`.
- `process.env.NODE_ENV !== 'production'` → `IS_DEV` from `@base-ui-solid/utils/isDev`.
- `React.Activity`-specific logic has no Solid equivalent; drop it with a `Port note:`.

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
- Don't use object rest on props that may contain `children`; use `omitProps` from
  `merge-props/mergeProps` instead.

## Tests

The setup mirrors upstream: `vitest.shared.mts`, one `vitest.config.mts` per package, a root
config listing them as projects, and `test/setupVitest.ts`.

| Command                                               | Runs in                                       |
| ----------------------------------------------------- | --------------------------------------------- |
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
- Like upstream, animations are disabled by default (`BASE_UI_ANIMATIONS_DISABLED`); animation
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

## Known issues

- **Solid dev performance warnings in the browser.** Ported "write state in a layout effect"
  patterns trigger `EFFECT_RELAY_TEAR` / `EFFECT_WRITES_OWN_SOURCE`, which cost an extra flush but
  don't change behavior:
  - `useCollapsiblePanel`: `dimensions` is set from DOM measurement. Measurement has to happen in
    an effect, so this one is probably inherent.
  - `useCollapsiblePanel`: `forcePanelIdle` is set and then cleared in effects.
  - `useTransitionStatus`: `setTransitionStatus('starting')` is called from the effect that reads
    the status.

  The last two could become derived state. Revisit once more components share these primitives,
  and keep the upstream behavior tests green while doing it.

## Port status

| Area                                                                              | Status                                             |
| --------------------------------------------------------------------------------- | -------------------------------------------------- |
| `merge-props`, `use-render`                                                       | Ported                                             |
| `internals/useRenderElement`                                                      | Ported (Solid-specific implementation)             |
| `internals/use-button`                                                            | Ported                                             |
| `internals/useTransitionStatus`, `useAnimationsFinished`, `useOpenChangeComplete` | Ported                                             |
| `collapsible`                                                                     | Ported, upstream jsdom tests ported                |
| `accordion`                                                                       | Ported                                             |
| `separator`, `toggle`, `toggle-group`                                             | Ported, upstream tests ported                      |
| `direction-provider`                                                              | Ported (`useDirection()` returns an accessor)      |
| `internals/composite`                                                             | Ported (list, item, root, grid navigation)         |
| `floating-ui-react/utils`                                                         | `composite`, `event`, `element` (partial)          |
| `toolbar`                                                                         | Only the root/group contexts (read by ToggleGroup) |
| `field`, `fieldset`, `form`, `input` + field/form/labelable internals             | Ported; tests in progress                          |
| `switch`, `checkbox`, `checkbox-group`, `radio`, `radio-group`                    | In progress                                        |
| `floating-ui-react`                                                               | Not started                                        |
| Other components                                                                  | Not started                                        |
