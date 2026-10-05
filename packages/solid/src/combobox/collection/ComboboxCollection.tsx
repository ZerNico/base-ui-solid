import { For, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useComboboxDerivedItemsContext } from '../root/ComboboxRootContext';
import type { ComboboxDerivedItemsContext } from '../root/ComboboxRootContext';
import { useGroupCollectionContext } from './GroupCollectionContext';

function isGroup(item: unknown): item is { items: readonly unknown[] } & Record<string, unknown> {
  return (
    item != null && typeof item === 'object' && Array.isArray((item as { items?: unknown }).items)
  );
}

/**
 * Port note: upstream re-renders `items.map(children)` and React reconciles by the `key` that the
 * consumer gives each element. Here each item is rendered once, keyed by its logical identity, so
 * rebuilt arrays (filtering, memos that create new objects) keep the rows mounted: the renderer
 * receives the item and its index as accessors that update in place, like `<For keyed={fn}>`.
 * - Groups are keyed by their `value` (or `label`), since filtering copies them.
 * - Items are keyed by their `createItems()` value, else by `itemToStringValue`, else by their
 *   `value` property, else by identity (primitives by value).
 */
function getItemKey(item: unknown, derivedItems: ComboboxDerivedItemsContext) {
  if (isGroup(item)) {
    return item.value ?? item.label ?? item;
  }
  if (item == null) {
    return item;
  }
  const itemToValue = derivedItems.itemToValue;
  if (itemToValue) {
    return itemToValue(item);
  }
  const itemToStringValue = derivedItems.itemToStringValue;
  if (itemToStringValue) {
    return itemToStringValue(item);
  }
  if (typeof item === 'object' && 'value' in item) {
    return (item as { value: unknown }).value;
  }
  return item;
}

/**
 * Renders filtered list items.
 * Doesn't render its own HTML element.
 *
 * If rendering a flat list, pass a function child to the `List` component instead, which implicitly wraps it.
 *
 * The function is called once per item with the item and its index as accessors, like Solid's
 * `<For>` with a custom key, so a row stays mounted while the list is filtered, reordered or
 * rebuilt with new objects for the same items.
 *
 * Documentation: [Base UI Combobox](https://base-ui-solid.pages.dev/solid/components/combobox)
 */
export function ComboboxCollection<Item = any>(props: ComboboxCollection.Props<Item>): JSX.Element {
  const derivedItems = useComboboxDerivedItemsContext();
  const groupContext = useGroupCollectionContext();

  const itemsToRender = () => (groupContext ? groupContext.items : derivedItems.filteredItems);

  return (
    <For each={itemsToRender()} keyed={(item) => getItemKey(item, derivedItems)}>
      {(item, index) => {
        const children = untrack(() => props.children);
        return children(item, index);
      }}
    </For>
  );
}

export interface ComboboxCollectionState {}

export interface ComboboxCollectionProps<Item = any> {
  /**
   * A function called once per item with the item and its index as accessors.
   * Pass the item type as a type argument to type the item: `<Combobox.Collection<Fruit>>`.
   */
  children: (item: Accessor<Item>, index: Accessor<number>) => JSX.Element;
}

export namespace ComboboxCollection {
  export type State = ComboboxCollectionState;
  export type Props<Item = any> = ComboboxCollectionProps<Item>;
}
