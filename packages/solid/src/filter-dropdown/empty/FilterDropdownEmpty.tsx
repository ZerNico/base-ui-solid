import { untrack, createSignal, omit, Show } from 'solid-js';
import { useStore } from '@base-ui-solid/utils/store';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useFilterDropdownItemContext } from '../root/FilterDropdownRootContext';
import { selectors } from '../store';
import { useInitialLiveRegionTextMutation } from '../../internals/useInitialLiveRegionTextMutation';
/**
 * @internal
 */
export function FilterDropdownEmpty(componentProps: FilterDropdownEmpty.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');
  const { store } = useFilterDropdownItemContext();
  const isEmpty = useStore(store, selectors.isEmpty);
  // Items mounting in the same commit register in layout effects, after this first render, and
  // don't register on the server at all. Deciding once they have keeps the children from
  // mounting for a frame on every open, and the message out of server markup.
  const [ready, setReady] = createSignal(false);
  useIsoLayoutEffect(
    () =>
      untrack(() => {
        setReady(true);
      }),
    () => [],
  );
  const visible = () => ready() && isEmpty();
  const emptyRef = useInitialLiveRegionTextMutation<HTMLDivElement>(visible);
  // Port note: create the element after registration settles, under its conditional owner.
  return (
    <Show when={visible()}>
      {useRenderElement('div', componentProps, {
        ref: [emptyRef],
        props: [
          {
            role: 'status',
            'aria-live': 'polite',
            'aria-atomic': true,
          },
          elementProps,
        ],
      })}
    </Show>
  );
}
export interface FilterDropdownEmptyState {}
export interface FilterDropdownEmptyProps extends BaseUIComponentProps<
  'div',
  FilterDropdownEmptyState
> {}
export namespace FilterDropdownEmpty {
  export type Props = FilterDropdownEmptyProps;
  export type State = FilterDropdownEmptyState;
}
