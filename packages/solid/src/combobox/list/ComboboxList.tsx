import { Show, createMemo, omit } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import {
  useComboboxDerivedItemsContext,
  useComboboxFloatingContext,
  useComboboxRootContext,
} from '../root/ComboboxRootContext';
import { useComboboxPositionerContext } from '../positioner/ComboboxPositionerContext';
import { ComboboxCollection } from '../collection/ComboboxCollection';
import { CompositeList } from '../../internals/composite/list/CompositeList';
import { stopEvent } from '../../floating-ui-solid/utils';
import { clickHighlightedItem } from '../utils/parts';

/**
 * A list container for the items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui-solid.pages.dev/solid/components/combobox)
 */
export function ComboboxList<Item = any>(componentProps: ComboboxList.Props<Item>): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'children');

  const store = useComboboxRootContext();
  const floatingRootContext = useComboboxFloatingContext();
  const hasPositionerContext = Boolean(useComboboxPositionerContext(true));
  const derivedItems = useComboboxDerivedItemsContext();

  const selectionMode = store.useState('selectionMode');
  const grid = store.useState('grid');
  const readOnly = store.useState('readOnly');
  const listProps = store.useState('listProps');
  const virtualized = store.useState('virtualized');
  const forceMounted = store.useState('forceMounted');

  const multiple = () => selectionMode() === 'multiple';
  const empty = () => derivedItems.filteredItems.length === 0;

  // Port note: toggling `virtualized` recreates the list element, and the replaced element's refs
  // are detached after the new one attached its own. Only detach an element that is still stored.
  function createElementSetter(key: 'positionerElement' | 'listElement') {
    let ownElement: HTMLElement | null = null;
    return (element: HTMLElement | null) => {
      if (element) {
        ownElement = element;
        store.set(key, element);
      } else if (store.state[key] === ownElement) {
        ownElement = null;
        store.set(key, null);
      }
    };
  }

  // Support "closed template" API: if children is a function, implicitly wrap it
  // with a Combobox.Collection that reads items from context/root.
  // Ensures this component's `listProps` subscription does not cause <Combobox.Item>
  // to re-render on every active index change.
  // Port note: the children are read once, through a getter, so they're created once.
  const childrenSource = {
    get children() {
      const children = componentProps.children;
      // Port note: zero-argument functions are Solid JSX accessors, not item renderers.
      if (typeof children === 'function' && children.length > 0) {
        // eslint-disable-next-line solid/components-return-once -- This is a reactive property getter.
        return (
          <ComboboxCollection>
            {children as ComboboxCollection.Props['children']}
          </ComboboxCollection>
        );
      }
      return children as JSX.Element;
    },
  };

  const state = createMemo<ComboboxListState>(() => ({
    empty: empty(),
  }));

  const floatingId = floatingRootContext.useState('floatingId');

  const renderElement = () =>
    useRenderElement('div', componentProps, {
      state,
      ref: [
        createElementSetter('listElement'),
        hasPositionerContext ? undefined : createElementSetter('positionerElement'),
      ],
      props: () => [
        listProps(),
        childrenSource,
        {
          tabindex: -1,
          id: floatingId(),
          role: grid() ? 'grid' : 'listbox',
          'aria-multiselectable': multiple() ? 'true' : undefined,
          // On a grid the attribute describes cell editability, not selection, so it's left to the
          // combobox element in that mode.
          'aria-readonly': !grid() && readOnly() ? true : undefined,
          onKeyDown(event: KeyboardEvent) {
            if (store.state.disabled || store.state.readOnly) {
              return;
            }

            if (event.key === 'Enter') {
              const activeIndex = store.state.activeIndex;

              if (activeIndex == null) {
                // Allow form submission when no item is highlighted.
                return;
              }

              stopEvent(event);
              clickHighlightedItem(store, activeIndex, event);
            }
          },
        },
        elementProps,
      ],
    });

  // With the `items` prop, typeahead labels are derived from the items so they survive the list
  // unmounting (unmounting clears the registered labels). Rendered labels only need to be
  // registered when the list is force-mounted to match browser autofill against rendered text.
  const labelsRef = () =>
    derivedItems.hasItems && !forceMounted() ? undefined : store.context.labelsRef;

  // Port note: the element is rendered inside `CompositeList` so that its children can read the
  // list context. Toggling `virtualized` swaps the structure and remounts the list element, like
  // upstream, where the element moves in or out of the `CompositeList` wrapper.
  return (
    <Show when={!virtualized()} fallback={renderElement()}>
      <CompositeList elementsRef={store.context.listRef} labelsRef={labelsRef()}>
        {renderElement()}
      </CompositeList>
    </Show>
  );
}

export interface ComboboxListState {
  /**
   * Whether the list is empty.
   */
  empty: boolean;
}

export interface ComboboxListProps<Item = any> extends Omit<
  BaseUIComponentProps<'div', ComboboxListState>,
  'children'
> {
  /**
   * The list's content, or a function called once per item with the item and its index as
   * accessors (implicitly wrapped in `Combobox.Collection`).
   * Pass the item type as a type argument to type the item: `<Combobox.List<Fruit>>`.
   */
  children?:
    JSX.Element | ((item: Accessor<Item>, index: Accessor<number>) => JSX.Element) | undefined;
}

export namespace ComboboxList {
  export type State = ComboboxListState;
  export type Props<Item = any> = ComboboxListProps<Item>;
}
