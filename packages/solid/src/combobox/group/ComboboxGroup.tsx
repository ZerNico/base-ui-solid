import { createSignal, omit, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { ComboboxGroupContext } from './ComboboxGroupContext';
import { GroupCollectionProvider } from '../collection/GroupCollectionContext';
import { useComboboxRootContext } from '../root/ComboboxRootContext';

/**
 * Groups related items with the corresponding label.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui-solid.pages.dev/solid/components/combobox)
 */
export function ComboboxGroup(componentProps: ComboboxGroup.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'items');

  const store = useComboboxRootContext();
  const grid = store.useState('grid');

  const [labelId, setLabelId] = createSignal<string | undefined>(undefined, { ownedWrite: true });

  const contextValue: ComboboxGroupContext = {
    labelId,
    setLabelId,
    items: () => componentProps.items,
  };

  const renderElement = () =>
    useRenderElement('div', componentProps, {
      props: () => [
        {
          // `group` is not a valid owned element of `grid`, and `row` must be owned
          // by `grid`, `rowgroup`, or `treegrid`.
          role: grid() ? 'rowgroup' : 'group',
          'aria-labelledby': labelId(),
        },
        elementProps,
      ],
    });

  const wrappedElement = () => (
    <ComboboxGroupContext value={contextValue}>{renderElement()}</ComboboxGroupContext>
  );

  return (
    <Show when={componentProps.items} fallback={wrappedElement()}>
      {(items) => (
        <GroupCollectionProvider items={items()}>{wrappedElement()}</GroupCollectionProvider>
      )}
    </Show>
  );
}

export interface ComboboxGroupState {}

export interface ComboboxGroupProps extends BaseUIComponentProps<'div', ComboboxGroupState> {
  /**
   * Items to be rendered within this group.
   * When provided, child `Collection` components will use these items.
   */
  items?: readonly any[] | undefined;
}

export namespace ComboboxGroup {
  export type State = ComboboxGroupState;
  export type Props = ComboboxGroupProps;
}
