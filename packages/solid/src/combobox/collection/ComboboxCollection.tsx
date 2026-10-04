import { For, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useComboboxDerivedItemsContext } from '../root/ComboboxRootContext';
import { useGroupCollectionContext } from './GroupCollectionContext';

function isGroup(item: unknown): item is { items: readonly unknown[] } & Record<string, unknown> {
  return (
    item != null && typeof item === 'object' && Array.isArray((item as { items?: unknown }).items)
  );
}

/**
 * Port note: upstream re-renders `items.map(children)` and React reconciles by the `key` that the
 * consumer gives each element. Here each item is rendered once, keyed by identity. Filtering
 * copies groups (`{ ...group, items }`), so groups are keyed by their `value` (or `label`) and
 * rendered with a view that reads the current copy, so a group stays mounted while its items are
 * filtered.
 */
function getItemKey(item: unknown) {
  if (isGroup(item)) {
    return item.value ?? item.label ?? item;
  }
  return item;
}

function createGroupView(item: Accessor<any>) {
  return new Proxy(
    {},
    {
      get(_, key) {
        return item()[key];
      },
      has(_, key) {
        return key in item();
      },
      ownKeys() {
        return Reflect.ownKeys(item());
      },
      getOwnPropertyDescriptor(_, key) {
        const descriptor = Reflect.getOwnPropertyDescriptor(item(), key);
        return descriptor ? { ...descriptor, configurable: true } : undefined;
      },
    },
  );
}

/**
 * Renders filtered list items.
 * Doesn't render its own HTML element.
 *
 * If rendering a flat list, pass a function child to the `List` component instead, which implicitly wraps it.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxCollection(props: ComboboxCollection.Props): JSX.Element {
  const derivedItems = useComboboxDerivedItemsContext();
  const groupContext = useGroupCollectionContext();

  const itemsToRender = () => (groupContext ? groupContext.items : derivedItems.filteredItems);

  return (
    <For each={itemsToRender()} keyed={getItemKey}>
      {(item, index) => {
        const currentItem = untrack(item);
        const itemView = isGroup(currentItem) ? createGroupView(item) : currentItem;
        // Port note: the numeric render-function index changes when filtering reorders an item.
        // Evaluate the renderer in a JSX computation so the Item receives the current index.
        // Keep items mounted when the renderer does not consume the numeric index.
        return props.children.length > 1 ? (
          <>{props.children(itemView, index())}</>
        ) : (
          untrack(() => props.children(itemView, index()))
        );
      }}
    </For>
  );
}

export interface ComboboxCollectionState {}

export interface ComboboxCollectionProps {
  children: (item: any, index: number) => JSX.Element;
}

export namespace ComboboxCollection {
  export type State = ComboboxCollectionState;
  export type Props = ComboboxCollectionProps;
}
