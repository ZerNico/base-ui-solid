/**
 * Port note: absent upstream. Dev-only labels for the signals, memos and effects the store creates,
 * passed as Solid's `name` option. Solid's diagnostics (`EFFECT_RELAY_TEAR`,
 * `EFFECT_WRITES_OWN_SOURCE`, ...) name the nodes they report on and the owners enclosing them, so
 * the labels mark the store's upstream-shaped synchronization (props copied into the store from
 * effects) as library internals rather than anonymous effects in the user's component tree.
 *
 * Only call these when `IS_DEV` is true: production builds ignore the `name` option.
 */

/**
 * Returns the store's label: `BaseUI.Store(<constructor name>)`, e.g. `BaseUI.Store(PopoverStore)`.
 */
export function getStoreDebugName(store: object): string {
  const constructorName: unknown = (store as { constructor?: { name?: unknown } | undefined })
    .constructor?.name;
  return typeof constructorName === 'string' &&
    constructorName !== '' &&
    constructorName !== 'Object'
    ? `BaseUI.Store(${constructorName})`
    : 'BaseUI.Store';
}

/**
 * Returns the label of a store accessor: `<store>.useState(<key>)` when the selector is one of the
 * store's named selectors, `<store>.use(<function name>)` otherwise.
 */
export function getSelectorDebugName(store: object, selector: Function): string {
  const storeName = getStoreDebugName(store);
  const selectors = (store as { selectors?: Record<string, unknown> | undefined }).selectors;
  if (selectors) {
    for (const key of Object.keys(selectors)) {
      if (selectors[key] === selector) {
        return `${storeName}.useState(${key})`;
      }
    }
  }
  return selector.name ? `${storeName}.use(${selector.name})` : `${storeName}.use`;
}
