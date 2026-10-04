import { createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import {
  useComboboxDerivedItemsContext,
  useComboboxRootContext,
} from '../root/ComboboxRootContext';
import { useInitialLiveRegionTextMutation } from '../../internals/useInitialLiveRegionTextMutation';

/**
 * Renders its children only when the list is empty.
 * Requires the `items` prop on the root component.
 * Announces changes politely to screen readers.
 * This component's root element must remain mounted in the DOM to announce
 * changes consistently across screen readers. Avoid hiding or removing the
 * component itself with `display: none`, `hidden`, `aria-hidden`, or conditional
 * rendering. Prefer updating or conditionally rendering its children instead.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxEmpty(componentProps: ComboboxEmpty.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'children');

  const derivedItems = useComboboxDerivedItemsContext();
  const store = useComboboxRootContext();

  const emptyRef = useInitialLiveRegionTextMutation<HTMLDivElement>();

  const empty = createMemo(() => derivedItems.filteredItems.length === 0);

  // Port note: a children source read reactively by the rendered element, so the children are
  // created while the list is empty and removed otherwise.
  const childrenSource = {
    get children(): JSX.Element {
      return empty() ? componentProps.children : null;
    },
  };

  return useRenderElement('div', componentProps, {
    ref: [
      (element: HTMLDivElement | null) => {
        store.context.emptyRef.current = element;
      },
      emptyRef,
    ],
    props: () => [
      childrenSource,
      {
        role: 'status',
        'aria-live': 'polite',
        'aria-atomic': true,
      },
      elementProps,
    ],
  });
}

export interface ComboboxEmptyState {}

export interface ComboboxEmptyProps extends BaseUIComponentProps<'div', ComboboxEmptyState> {}

export namespace ComboboxEmpty {
  export type State = ComboboxEmptyState;
  export type Props = ComboboxEmptyProps;
}
