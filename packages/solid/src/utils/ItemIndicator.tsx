import { createMemo, omit, untrack } from 'solid-js';
import type { BaseUIComponentProps } from '../internals/types';
import { useTransitionStatus } from '../internals/useTransitionStatus';
import type { TransitionStatus } from '../internals/useTransitionStatus';
import { useOpenChangeComplete } from '../internals/useOpenChangeComplete';
import { useRenderElement } from '../internals/useRenderElement';
import { transitionStatusMapping } from '../internals/stateAttributesMapping';

// The public wrappers mount this component only when selected or kept mounted, avoiding the
// hook costs for unselected items. Pass selection as a prop so memoization observes changes.
// Port note: no `React.memo`; `selected` is read reactively.
export function ItemIndicator(componentProps: ItemIndicatorProps) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'keepMounted', 'selected');

  let indicatorElement: HTMLSpanElement | null = null;

  const selected = () => componentProps.selected;

  const { transitionStatus, setMounted } = useTransitionStatus(selected);

  const state = createMemo<ItemIndicatorState>(() => ({
    selected: selected(),
    transitionStatus: transitionStatus(),
  }));

  const element = useRenderElement('span', componentProps, {
    ref: [
      (node: HTMLSpanElement | null) => {
        indicatorElement = node;
      },
    ],
    state,
    props: () => [
      {
        'aria-hidden': true,
        children: '✔️',
      },
      elementProps,
    ],
    stateAttributesMapping: transitionStatusMapping,
  });

  useOpenChangeComplete({
    batch: true,
    enabled: () => !selected(),
    open: selected,
    ref: () => indicatorElement,
    onComplete() {
      if (!untrack(selected)) {
        setMounted(false);
      }
    },
  });

  return element;
}

interface ItemIndicatorState {
  selected: boolean;
  transitionStatus: TransitionStatus;
}

interface ItemIndicatorProps extends BaseUIComponentProps<'span', ItemIndicatorState> {
  keepMounted?: boolean | undefined;
  selected: boolean;
}
